// kilocode_change - new file
import * as vscode from "vscode"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document } from "@langchain/core/documents"
import { OpenAIEmbeddings } from "@langchain/openai"
import { VectorStore } from "@langchain/core/vectorstores"
import { GhostSuggestionContext } from "./types"

// kilocode_change start - Use real LangChain vector store instead of mock implementation  
import { MemoryVectorStore } from "langchain/vectorstores/memory"
// kilocode_change end

/**
 * Configuration for LangChain context enhancement features
 */
export interface LangChainContextConfig {
	enabled: boolean
	chunkSize: number
	chunkOverlap: number // kilocode_change - Add missing chunkOverlap property
	maxContextFiles: number
	similarityThreshold: number
	openaiApiKey: string // kilocode_change - Required OpenAI API key for production
	modelName?: string // kilocode_change - Allow custom embedding model selection
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
	private vectorStore: MemoryVectorStore | null = null // kilocode_change - Use production-ready LangChain MemoryVectorStore
	private embeddings: OpenAIEmbeddings | null = null // kilocode_change - Only use OpenAI embeddings for production
	private isInitialized = false

	constructor(config: LangChainContextConfig) { // kilocode_change - Make config required
		// kilocode_change start - Validate required configuration
		if (!config.openaiApiKey) {
			throw new Error("OpenAI API key is required for LangChain context enhancement")
		}
		// kilocode_change end

		// Set defaults first, then override with provided config
		this.config = {
			...config,
			enabled: config.enabled ?? true,
			chunkSize: config.chunkSize ?? 1000,
			chunkOverlap: config.chunkOverlap ?? 200,
			maxContextFiles: config.maxContextFiles ?? 10,
			similarityThreshold: config.similarityThreshold ?? 0.7,
			modelName: config.modelName ?? "text-embedding-3-small", // kilocode_change - Use cost-effective production model
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
			// kilocode_change start - Initialize production OpenAI embeddings only
			this.embeddings = new OpenAIEmbeddings({
				openAIApiKey: this.config.openaiApiKey,
				modelName: this.config.modelName || "text-embedding-3-small",
			})

			// Create empty vector store with OpenAI embeddings
			this.vectorStore = new MemoryVectorStore(this.embeddings)
			// kilocode_change end
			
			this.isInitialized = true
		} catch (error) {
			console.error("[LangChainContextEnhancer] Failed to initialize vector store:", error)
			throw new Error(`Failed to initialize LangChain context enhancer: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
				.filter(([, score]: [Document, number]) => score >= this.config.similarityThreshold)
				.map(([doc, score]: [Document, number]) => ({
					content: doc.pageContent,
					filePath: doc.metadata.filePath as string,
					similarity: score,
				}))
			// kilocode_change end

			const relatedFiles: string[] = Array.from(new Set(relevantCodeChunks.map((chunk: { filePath: string }) => chunk.filePath)))

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
		// kilocode_change start - Validate API key if being updated
		if (newConfig.openaiApiKey !== undefined && !newConfig.openaiApiKey) {
			throw new Error("OpenAI API key cannot be empty")
		}
		// kilocode_change end

		this.config = { ...this.config, ...newConfig }

		// Reinitialize if necessary
		if (newConfig.chunkSize || newConfig.chunkOverlap) {
			this.textSplitter = new RecursiveCharacterTextSplitter({
				chunkSize: this.config.chunkSize,
				chunkOverlap: this.config.chunkOverlap,
			})
		}

		// kilocode_change start - Reset vector store if critical config changed
		if (newConfig.enabled === false || newConfig.openaiApiKey !== undefined || newConfig.modelName !== undefined) {
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