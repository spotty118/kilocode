// kilocode_change - new file
import * as vscode from "vscode"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { Document } from "@langchain/core/documents"
import { OpenAIEmbeddings } from "@langchain/openai"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { GhostSuggestionContext } from "./types"

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
	private vectorStore: MemoryVectorStore | null = null // kilocode_change - Use LangChain in-memory vector store
	private embeddings: OpenAIEmbeddings | null = null // kilocode_change - Only use OpenAI embeddings for production
	private isInitialized = false
	private initializationPromise: Promise<void> | null = null // kilocode_change - Track initialization promise

	constructor(config: LangChainContextConfig) {
		// kilocode_change - Make config required
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

		// Initialize vector store immediately if enabled and track the promise // kilocode_change
		if (this.config.enabled) {
			this.initializationPromise = this.initializeVectorStore().catch((error) => {
				console.error("[LangChainContextEnhancer] Failed to initialize vector store in constructor:", error)
				throw error // Re-throw to mark initialization as failed
			})
		}
	}

	/**
	 * Initialize the vector store with workspace documents
	 */
	private async initializeVectorStore(): Promise<void> {
		if (this.isInitialized || !this.config.enabled) {
			console.log(
				"[LangChainContextEnhancer] Skipping vector store initialization - already initialized:",
				this.isInitialized,
				"or not enabled:",
				!this.config.enabled,
			)
			return
		}

		console.log("[LangChainContextEnhancer] Initializing vector store with OpenAI embeddings...")

		try {
			// kilocode_change start - Initialize production OpenAI embeddings only
			this.embeddings = new OpenAIEmbeddings({
				openAIApiKey: this.config.openaiApiKey,
				modelName: this.config.modelName || "text-embedding-3-small",
			})

			console.log(
				"[LangChainContextEnhancer] OpenAI embeddings initialized with model:",
				this.config.modelName || "text-embedding-3-small",
			)

			// Create in-memory vector store with OpenAI embeddings
			this.vectorStore = new MemoryVectorStore(this.embeddings)
			console.log("[LangChainContextEnhancer] Memory vector store created")
			// kilocode_change end

			this.isInitialized = true
			console.log("[LangChainContextEnhancer] Vector store initialization completed successfully")
		} catch (error) {
			console.error("[LangChainContextEnhancer] Failed to initialize vector store:", error)
			throw new Error(
				`Failed to initialize LangChain context enhancer: ${error instanceof Error ? error.message : "Unknown error"}`,
			)
		}
	}

	/**
	 * Index documents from the workspace
	 */
	async indexWorkspaceDocuments(documents: vscode.TextDocument[]): Promise<void> {
		console.log("[LangChainContextEnhancer] indexWorkspaceDocuments called with", documents.length, "documents")

		if (!this.config.enabled) {
			console.log("[LangChainContextEnhancer] Skipping indexing - not enabled")
			return
		}

		// kilocode_change - Wait for initialization to complete before proceeding
		if (this.initializationPromise) {
			try {
				await this.initializationPromise
			} catch (error) {
				console.error("[LangChainContextEnhancer] Initialization failed:", error)
				return
			}
		}

		if (!this.vectorStore) {
			console.log("[LangChainContextEnhancer] No vector store available after initialization")
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
					langchainDocs.push(
						new Document({
							pageContent: chunks[i],
							metadata: {
								filePath: doc.uri.fsPath,
								chunkIndex: i,
								language: doc.languageId,
							},
						}),
					)
				}
			}

			if (langchainDocs.length > 0) {
				console.log(
					"[LangChainContextEnhancer] Making OpenAI API call to index",
					langchainDocs.length,
					"document chunks...",
				)
				await this.vectorStore.addDocuments(langchainDocs)
				console.log("[LangChainContextEnhancer] Successfully indexed documents using OpenAI embeddings")
			} else {
				console.log("[LangChainContextEnhancer] No documents to index")
			}
			// kilocode_change end
		} catch (error) {
			console.error("[LangChainContextEnhancer] Failed to index documents:", error)
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
		console.log(
			"[LangChainContextEnhancer] enhanceContext called - enabled:",
			this.config.enabled,
			"vectorStore:",
			!!this.vectorStore,
		)

		if (!this.config.enabled) {
			console.log("[LangChainContextEnhancer] Skipping enhancement - not enabled")
			return null
		}

		// kilocode_change - Wait for initialization to complete if still pending
		if (this.initializationPromise && !this.isInitialized) {
			try {
				console.log("[LangChainContextEnhancer] Waiting for initialization to complete...")
				await this.initializationPromise
			} catch (error) {
				console.error("[LangChainContextEnhancer] Initialization failed:", error)
				return null
			}
		}

		if (!this.vectorStore) {
			console.log("[LangChainContextEnhancer] Skipping enhancement - no vector store available")
			return null
		}

		try {
			const searchQuery = query || this.buildSearchQuery(originalContext)
			if (!searchQuery) {
				console.log("[LangChainContextEnhancer] No search query generated")
				return null
			}

			console.log(
				"[LangChainContextEnhancer] Making OpenAI API call for similarity search with query:",
				searchQuery.substring(0, 100) + "...",
			)

			// kilocode_change start - Use real LangChain similarity search
			const relevantDocs = await this.vectorStore.similaritySearchWithScore(searchQuery, 5)
			console.log(
				"[LangChainContextEnhancer] OpenAI API call completed - found",
				relevantDocs.length,
				"documents",
			)

			const relevantCodeChunks = relevantDocs
				.filter(([, score]: [Document, number]) => score >= this.config.similarityThreshold)
				.map(([doc, score]: [Document, number]) => ({
					content: doc.pageContent,
					filePath: doc.metadata.filePath as string,
					similarity: score,
				}))
			// kilocode_change end

			console.log("[LangChainContextEnhancer] Filtered to", relevantCodeChunks.length, "relevant chunks")

			const relatedFiles: string[] = Array.from(
				new Set(relevantCodeChunks.map((chunk: { filePath: string }) => chunk.filePath)),
			)

			const contextSummary = this.generateContextSummary(originalContext, relevantCodeChunks)

			const result = {
				relevantCodeChunks,
				contextSummary,
				relatedFiles,
			}

			console.log("[LangChainContextEnhancer] Enhancement completed successfully:", {
				chunksCount: relevantCodeChunks.length,
				relatedFilesCount: relatedFiles.length,
				summaryLength: contextSummary.length,
			})

			return result
		} catch (error) {
			console.error("[LangChainContextEnhancer] Failed to enhance context:", error)
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

		// Validate numeric values
		if (newConfig.chunkSize !== undefined && (newConfig.chunkSize < 100 || newConfig.chunkSize > 4000)) {
			throw new Error("Chunk size must be between 100 and 4000")
		}

		if (newConfig.chunkOverlap !== undefined && (newConfig.chunkOverlap < 0 || newConfig.chunkOverlap > 1000)) {
			throw new Error("Chunk overlap must be between 0 and 1000")
		}

		if (
			newConfig.maxContextFiles !== undefined &&
			(newConfig.maxContextFiles < 1 || newConfig.maxContextFiles > 50)
		) {
			throw new Error("Max context files must be between 1 and 50")
		}

		if (
			newConfig.similarityThreshold !== undefined &&
			(newConfig.similarityThreshold < 0 || newConfig.similarityThreshold > 1)
		) {
			throw new Error("Similarity threshold must be between 0 and 1")
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
			this.initializationPromise = null // kilocode_change - Reset initialization promise
		}

		// kilocode_change - Re-initialize if enabled and config changed
		if (this.config.enabled && !this.isInitialized && !this.initializationPromise) {
			this.initializationPromise = this.initializeVectorStore().catch((error) => {
				console.error("[LangChainContextEnhancer] Failed to re-initialize vector store:", error)
				throw error
			})
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
	 * kilocode_change - Updated to handle async initialization properly
	 */
	isReady(): boolean {
		const ready = this.config.enabled && this.isInitialized && this.vectorStore !== null
		console.log("[LangChainContextEnhancer] isReady check:", {
			enabled: this.config.enabled,
			isInitialized: this.isInitialized,
			hasVectorStore: !!this.vectorStore,
			hasInitPromise: !!this.initializationPromise,
			ready,
		})
		return ready
	}

	/**
	 * Check if the enhancer is available (enabled and either ready or initializing)
	 * kilocode_change - New method to check if LangChain is available but may not be ready yet
	 */
	isAvailable(): boolean {
		return this.config.enabled && (this.isInitialized || !!this.initializationPromise)
	}
}
