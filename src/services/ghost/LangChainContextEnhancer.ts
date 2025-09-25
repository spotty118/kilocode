// kilocode_change - new file
import * as vscode from "vscode"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document } from "@langchain/core/documents"
import { OpenAIEmbeddings } from "@langchain/openai"
import { VectorStore } from "@langchain/core/vectorstores"
import { GhostSuggestionContext } from "./types"

// kilocode_change start - Add mock embeddings for fallback
import { Embeddings } from "@langchain/core/embeddings"

/**
 * Mock embeddings implementation for fallback when no OpenAI key is available
 */
class MockEmbeddings extends Embeddings {
	constructor() {
		super({})
	}

	async embedDocuments(documents: string[]): Promise<number[][]> {
		// Simple hash-based embeddings for basic similarity
		return documents.map(doc => this.hashToVector(doc))
	}

	async embedQuery(query: string): Promise<number[]> {
		return this.hashToVector(query)
	}

	private hashToVector(text: string): number[] {
		const vector: number[] = new Array(384).fill(0) // 384-dimensional vector
		const words = text.toLowerCase().split(/\s+/)
		
		for (let i = 0; i < words.length; i++) {
			const word = words[i]
			for (let j = 0; j < word.length; j++) {
				const charCode = word.charCodeAt(j)
				const index = (charCode + i + j) % vector.length
				vector[index] += 1 / (word.length + 1)
			}
		}
		
		// Normalize vector
		const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
		return magnitude > 0 ? vector.map(val => val / magnitude) : vector
	}
}

/**
 * Simple in-memory vector store implementation using LangChain base class
 */
class SimpleMemoryVectorStore extends VectorStore {
	private documents: Document[] = []
	private vectors: number[][] = []

	_vectorstoreType(): string {
		return "simple_memory"
	}

	constructor(embeddings: Embeddings) {
		super(embeddings, {})
	}

	async addDocuments(documents: Document[]): Promise<void> {
		const texts = documents.map(doc => doc.pageContent)
		const vectors = await this.embeddings.embedDocuments(texts)
		
		this.documents.push(...documents)
		this.vectors.push(...vectors)
	}

	async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
		this.vectors.push(...vectors)
		this.documents.push(...documents)
	}

	async similaritySearchVectorWithScore(query: number[], k: number): Promise<Array<[Document, number]>> {
		const similarities = this.vectors.map((vector, index) => ({
			document: this.documents[index],
			similarity: this.cosineSimilarity(query, vector),
			index
		}))

		return similarities
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, k)
			.map(item => [item.document, item.similarity])
	}

	async similaritySearchWithScore(query: string, k: number): Promise<Array<[Document, number]>> {
		const queryVector = await this.embeddings.embedQuery(query)
		return this.similaritySearchVectorWithScore(queryVector, k)
	}

	async similaritySearch(query: string, k: number): Promise<Document[]> {
		const results = await this.similaritySearchWithScore(query, k)
		return results.map(([doc]) => doc)
	}

	private cosineSimilarity(a: number[], b: number[]): number {
		if (a.length !== b.length) return 0
		
		let dotProduct = 0
		let normA = 0
		let normB = 0
		
		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i]
			normA += a[i] * a[i]
			normB += b[i] * b[i]
		}
		
		const denominator = Math.sqrt(normA) * Math.sqrt(normB)
		return denominator === 0 ? 0 : dotProduct / denominator
	}

	static async fromTexts(
		texts: string[],
		metadatas: object[],
		embeddings: Embeddings
	): Promise<SimpleMemoryVectorStore> {
		const store = new SimpleMemoryVectorStore(embeddings)
		const documents = texts.map((text, i) => new Document({
			pageContent: text,
			metadata: metadatas[i] || {}
		}))
		await store.addDocuments(documents)
		return store
	}
}
// kilocode_change end

/**
 * Configuration for LangChain context enhancement features
 */
export interface LangChainContextConfig {
	enabled: boolean
	chunkSize: number
	chunkOverlap: number
	maxContextFiles: number
	similarityThreshold: number
	openaiApiKey?: string // kilocode_change - Add OpenAI API key for embeddings
	useOpenAI?: boolean // kilocode_change - Allow disabling OpenAI embeddings for local-only operation
}

/**
 * Enhanced context information provided by LangChain
 */
export interface LangChainEnhancedContext {
	relevantCodeChunks: Array<{
		content: string
		filePath: string
		similarity: number
	}>
	contextSummary: string
	relatedFiles: string[]
}

/**
 * LangChain-based context enhancer that provides additional context awareness
 * without modifying the existing GhostSuggestionContext interface
 */
export class LangChainContextEnhancer {
	private config: LangChainContextConfig
	private textSplitter: RecursiveCharacterTextSplitter
	private vectorStore: SimpleMemoryVectorStore | null = null // kilocode_change - Use real LangChain-based MemoryVectorStore
	private embeddings: OpenAIEmbeddings | MockEmbeddings | null = null // kilocode_change - Add real OpenAI embeddings
	private isInitialized = false

	constructor(config?: Partial<LangChainContextConfig>) {
		this.config = {
			enabled: true,
			chunkSize: 1000,
			chunkOverlap: 200,
			maxContextFiles: 10,
			similarityThreshold: 0.7, // kilocode_change - Higher threshold for real embeddings
			useOpenAI: true, // kilocode_change - Default to using OpenAI embeddings
			...config,
		}

		this.textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: this.config.chunkSize,
			chunkOverlap: this.config.chunkOverlap,
		})
	}

	/**
	 * Initialize the vector store with workspace documents
	 */
	private async initializeVectorStore(): Promise<void> {
		if (this.isInitialized || !this.config.enabled) {
			return
		}

		try {
			// kilocode_change start - Initialize real LangChain embeddings and vector store
			if (this.config.useOpenAI && this.config.openaiApiKey) {
				this.embeddings = new OpenAIEmbeddings({
					openAIApiKey: this.config.openaiApiKey,
					modelName: "text-embedding-3-small", // Cost-effective embedding model
				})
			} else {
				// Fallback to a simple text-based approach if no OpenAI key provided
				console.warn("[LangChainContextEnhancer] No OpenAI API key provided, falling back to text-based similarity")
				this.embeddings = new MockEmbeddings()
			}

			// Create empty vector store initially 
			this.vectorStore = new SimpleMemoryVectorStore(this.embeddings)
			// kilocode_change end
			
			this.isInitialized = true
		} catch (error) {
			console.warn("[LangChainContextEnhancer] Failed to initialize vector store:", error)
			this.config.enabled = false
		}
	}

	/**
	 * Index documents from the workspace
	 */
	async indexWorkspaceDocuments(documents: vscode.TextDocument[]): Promise<void> {
		if (!this.config.enabled) {
			return
		}

		await this.initializeVectorStore()
		if (!this.vectorStore) {
			return
		}

		try {
			// kilocode_change start - Use real LangChain documents and vector store
			const langchainDocs: Document[] = []

			for (const doc of documents.slice(0, this.config.maxContextFiles)) {
				if (doc.uri.scheme !== "file" || doc.getText().trim().length === 0) {
					continue
				}

				const chunks = await this.textSplitter.splitText(doc.getText())
				for (let i = 0; i < chunks.length; i++) {
					langchainDocs.push(new Document({
						pageContent: chunks[i],
						metadata: {
							filePath: doc.uri.fsPath,
							chunkIndex: i,
							language: doc.languageId,
						},
					}))
				}
			}

			if (langchainDocs.length > 0) {
				await this.vectorStore.addDocuments(langchainDocs)
			}
			// kilocode_change end
		} catch (error) {
			console.warn("[LangChainContextEnhancer] Failed to index documents:", error)
		}
	}

	/**
	 * Enhances the existing context with LangChain-powered insights
	 * This method does not modify the original context, only provides additional information
	 */
	async enhanceContext(
		originalContext: GhostSuggestionContext,
		query?: string,
	): Promise<LangChainEnhancedContext | null> {
		if (!this.config.enabled || !this.vectorStore) {
			return null
		}

		try {
			const searchQuery = query || this.buildSearchQuery(originalContext)
			if (!searchQuery) {
				return null
			}

			// kilocode_change start - Use real LangChain similarity search
			const relevantDocs = await this.vectorStore.similaritySearchWithScore(searchQuery, 5)

			const relevantCodeChunks = relevantDocs
				.filter(([, score]) => score >= this.config.similarityThreshold)
				.map(([doc, score]) => ({
					content: doc.pageContent,
					filePath: doc.metadata.filePath as string,
					similarity: score,
				}))
			// kilocode_change end

			const relatedFiles = Array.from(new Set(relevantCodeChunks.map((chunk) => chunk.filePath)))

			const contextSummary = this.generateContextSummary(originalContext, relevantCodeChunks)

			return {
				relevantCodeChunks,
				contextSummary,
				relatedFiles,
			}
		} catch (error) {
			console.warn("[LangChainContextEnhancer] Failed to enhance context:", error)
			return null
		}
	}

	/**
	 * Builds a search query from the existing context
	 */
	private buildSearchQuery(context: GhostSuggestionContext): string {
		const queryParts: string[] = []

		// Use user input if available
		if (context.userInput) {
			queryParts.push(context.userInput)
		}

		// Add current file context
		if (context.document && context.range) {
			const lineText = context.document.lineAt(context.range.start.line).text
			if (lineText.trim()) {
				queryParts.push(lineText.trim())
			}
		}

		// Add AST node context if available
		if (context.rangeASTNode) {
			queryParts.push(context.rangeASTNode.type)
		}

		// Add diagnostic context for errors
		if (context.diagnostics && context.diagnostics.length > 0) {
			const errorMessages = context.diagnostics.map((d) => d.message).join(" ")
			queryParts.push(errorMessages)
		}

		return queryParts.join(" ").slice(0, 500) // Limit query length
	}

	/**
	 * Generates a summary of the enhanced context
	 */
	private generateContextSummary(
		originalContext: GhostSuggestionContext,
		relevantChunks: Array<{ content: string; filePath: string; similarity: number }>,
	): string {
		const parts: string[] = []

		if (originalContext.document) {
			parts.push(`Current file: ${originalContext.document.fileName}`)
		}

		if (relevantChunks.length > 0) {
			parts.push(`Found ${relevantChunks.length} relevant code chunks`)
			const uniqueFiles = new Set(relevantChunks.map((c) => c.filePath))
			parts.push(`Related files: ${Array.from(uniqueFiles).join(", ")}`)
		}

		if (originalContext.diagnostics && originalContext.diagnostics.length > 0) {
			parts.push(`Active diagnostics: ${originalContext.diagnostics.length}`)
		}

		return parts.join(". ")
	}

	/**
	 * Updates the configuration
	 */
	updateConfig(newConfig: Partial<LangChainContextConfig>): void {
		this.config = { ...this.config, ...newConfig }

		// Reinitialize if necessary
		if (newConfig.chunkSize || newConfig.chunkOverlap) {
			this.textSplitter = new RecursiveCharacterTextSplitter({
				chunkSize: this.config.chunkSize,
				chunkOverlap: this.config.chunkOverlap,
			})
		}

		// kilocode_change start - Reset vector store if embeddings config changed
		if (newConfig.enabled === false || newConfig.openaiApiKey !== undefined || newConfig.useOpenAI !== undefined) {
			this.vectorStore = null
			this.embeddings = null
			this.isInitialized = false
		}
		// kilocode_change end
	}

	/**
	 * Get current configuration
	 */
	getConfig(): LangChainContextConfig {
		return { ...this.config }
	}

	/**
	 * Check if the enhancer is enabled and ready
	 */
	isReady(): boolean {
		return this.config.enabled && this.isInitialized && this.vectorStore !== null
	}
}