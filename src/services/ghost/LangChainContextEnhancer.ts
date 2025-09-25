// kilocode_change - new file
import * as vscode from "vscode"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document } from "@langchain/core/documents"
import { GhostSuggestionContext } from "./types"

// Simplified interface for vector store functionality
interface VectorDocument {
	pageContent: string
	metadata: {
		filePath: string
		chunkIndex: number
		language: string
	}
}

interface SearchResult {
	document: VectorDocument
	score: number
}

/**
 * Simple in-memory vector store implementation
 * This is a minimal implementation for demo purposes
 */
class SimpleMemoryVectorStore {
	private documents: VectorDocument[] = []

	async addDocuments(docs: VectorDocument[]): Promise<void> {
		this.documents.push(...docs)
	}

	async similaritySearchWithScore(query: string, limit: number): Promise<Array<[VectorDocument, number]>> {
		// Simple text similarity based on common words
		const queryWords = query.toLowerCase().split(/\s+/)
		
		const results = this.documents.map((doc): [VectorDocument, number] => {
			const docWords = doc.pageContent.toLowerCase().split(/\s+/)
			const commonWords = queryWords.filter((word) => docWords.includes(word))
			const score = commonWords.length / Math.max(queryWords.length, docWords.length)
			return [doc, score]
		})

		return results
			.sort(([, a], [, b]) => b - a)
			.slice(0, limit)
	}
}

/**
 * Configuration for LangChain context enhancement features
 */
export interface LangChainContextConfig {
	enabled: boolean
	chunkSize: number
	chunkOverlap: number
	maxContextFiles: number
	similarityThreshold: number
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
	private vectorStore: SimpleMemoryVectorStore | null = null
	private isInitialized = false

	constructor(config?: Partial<LangChainContextConfig>) {
		this.config = {
			enabled: true,
			chunkSize: 1000,
			chunkOverlap: 200,
			maxContextFiles: 10,
			similarityThreshold: 0.1, // Lower threshold for simple similarity
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
			this.vectorStore = new SimpleMemoryVectorStore()
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
			const vectorDocs: VectorDocument[] = []

			for (const doc of documents.slice(0, this.config.maxContextFiles)) {
				if (doc.uri.scheme !== "file" || doc.getText().trim().length === 0) {
					continue
				}

				const chunks = await this.textSplitter.splitText(doc.getText())
				for (let i = 0; i < chunks.length; i++) {
					vectorDocs.push({
						pageContent: chunks[i],
						metadata: {
							filePath: doc.uri.fsPath,
							chunkIndex: i,
							language: doc.languageId,
						},
					})
				}
			}

			if (vectorDocs.length > 0) {
				await this.vectorStore.addDocuments(vectorDocs)
			}
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

			// Perform similarity search
			const relevantDocs = await this.vectorStore.similaritySearchWithScore(searchQuery, 5)

			const relevantCodeChunks = relevantDocs
				.filter(([, score]) => score >= this.config.similarityThreshold)
				.map(([doc, score]) => ({
					content: doc.pageContent,
					filePath: doc.metadata.filePath,
					similarity: score,
				}))

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

		// Reset vector store if disabled
		if (newConfig.enabled === false) {
			this.vectorStore = null
			this.isInitialized = false
		}
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