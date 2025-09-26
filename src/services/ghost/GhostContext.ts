import * as vscode from "vscode"
import { GhostSuggestionContext } from "./types"
import { GhostDocumentStore } from "./GhostDocumentStore"
import {
	LangChainContextEnhancer,
	type LangChainEnhancedContext,
	type LangChainContextConfig,
} from "./LangChainContextEnhancer" // kilocode_change

export class GhostContext {
	private documentStore: GhostDocumentStore
	private langChainEnhancer: LangChainContextEnhancer | null = null // kilocode_change

	constructor(
		documentStore: GhostDocumentStore,
		enableLangChain = false,
		langChainConfig?: Partial<LangChainContextConfig>,
	) {
		// kilocode_change
		this.documentStore = documentStore
		// kilocode_change start
		if (enableLangChain) {
			// Get OpenAI API key from VSCode configuration or environment
			const langChainConfig = vscode.workspace.getConfiguration("kilo-code.langchain")
			let openaiApiKey = langChainConfig.get<string>("openaiApiKey") || process.env.OPENAI_API_KEY

			// kilocode_change - Fallback to main extension's OpenAI API key if LangChain key not set
			if (!openaiApiKey) {
				try {
					// Import ContextProxy synchronously since it's already loaded
					const { ContextProxy } = require("../../core/config/ContextProxy")
					openaiApiKey = ContextProxy.instance?.getSecret("openAiApiKey") || ""
					if (openaiApiKey) {
						console.log("[GhostContext] Using main extension's OpenAI API key for LangChain")
					}
				} catch (error) {
					console.warn("[GhostContext] Failed to access main OpenAI API key:", error)
				}
			}

			if (!openaiApiKey) {
				console.warn(
					"[GhostContext] LangChain enabled but no OpenAI API key found. Please configure 'kilo-code.langchain.openaiApiKey' setting or ensure your main OpenAI API key is configured.",
				)
				return
			}

			try {
				this.langChainEnhancer = new LangChainContextEnhancer({
					enabled: true,
					chunkSize: langChainConfig.get<number>("chunkSize") || 1000,
					chunkOverlap: langChainConfig.get<number>("chunkOverlap") || 200,
					maxContextFiles: langChainConfig.get<number>("maxContextFiles") || 10,
					similarityThreshold: langChainConfig.get<number>("similarityThreshold") || 0.7,
					openaiApiKey,
					modelName: langChainConfig.get<string>("modelName") || "text-embedding-3-small",
					...langChainConfig,
				})
			} catch (error) {
				console.error("[GhostContext] Failed to initialize LangChain enhancer:", error)
				// Don't throw - continue with LangChain disabled
				this.langChainEnhancer = null
			}
		}
		// kilocode_change end
	}

	private addRecentOperations(context: GhostSuggestionContext): GhostSuggestionContext {
		if (!context.document) {
			return context
		}
		const recentOperations = this.documentStore.getRecentOperations(context.document)
		if (recentOperations) {
			context.recentOperations = recentOperations
		}
		return context
	}

	private addEditor(context: GhostSuggestionContext): GhostSuggestionContext {
		const editor = vscode.window.activeTextEditor
		if (editor) {
			context.editor = editor
		}
		return context
	}

	private addOpenFiles(context: GhostSuggestionContext): GhostSuggestionContext {
		const openFiles = vscode.workspace.textDocuments.filter((doc) => doc.uri.scheme === "file")
		context.openFiles = openFiles
		return context
	}

	private addRange(context: GhostSuggestionContext): GhostSuggestionContext {
		if (!context.range && context.editor) {
			context.range = context.editor.selection
		}
		return context
	}

	private async addAST(context: GhostSuggestionContext): Promise<GhostSuggestionContext> {
		if (!context.document) {
			return context
		}
		if (this.documentStore.needsASTUpdate(context.document)) {
			await this.documentStore.storeDocument({
				document: context.document,
				parseAST: true,
				bypassDebounce: true,
			})
		}
		context.documentAST = this.documentStore.getAST(context.document.uri)
		return context
	}

	private addRangeASTNode(context: GhostSuggestionContext): GhostSuggestionContext {
		if (!context.range || !context.documentAST) {
			return context
		}
		const startPosition = {
			row: context.range.start.line,
			column: context.range.start.character,
		}
		const endPosition = {
			row: context.range.end.line,
			column: context.range.end.character,
		}
		const nodeAtCursor = context.documentAST.rootNode.descendantForPosition(startPosition, endPosition)
		if (!nodeAtCursor) {
			return context
		}
		context.rangeASTNode = nodeAtCursor
		return context
	}

	private addDiagnostics(context: GhostSuggestionContext): GhostSuggestionContext {
		if (!context.document) {
			return context
		}
		const diagnostics = vscode.languages.getDiagnostics(context.document.uri)
		if (diagnostics && diagnostics.length > 0) {
			context.diagnostics = diagnostics
		}
		return context
	}

	public async generate(initialContext: GhostSuggestionContext): Promise<GhostSuggestionContext> {
		let context = initialContext
		context = this.addEditor(context)
		context = this.addOpenFiles(context)
		context = this.addRange(context)
		//context = await this.addAST(context)
		context = this.addRangeASTNode(context)
		context = this.addRecentOperations(context)
		context = this.addDiagnostics(context)

		// kilocode_change start
		// Index workspace documents for LangChain if enabled
		if (this.langChainEnhancer && context.openFiles) {
			await this.langChainEnhancer.indexWorkspaceDocuments(context.openFiles)
		}
		// kilocode_change end

		return context
	}

	// kilocode_change start
	/**
	 * Gets enhanced context using LangChain if available
	 * This is an optional method that doesn't affect existing functionality
	 */
	public async getEnhancedContext(
		context: GhostSuggestionContext,
		query?: string,
	): Promise<LangChainEnhancedContext | null> {
		console.log("[GhostContext] getEnhancedContext called - enhancer available:", !!this.langChainEnhancer)
		if (!this.langChainEnhancer) {
			console.log("[GhostContext] No LangChain enhancer available")
			return null
		}
		console.log("[GhostContext] Calling enhancer.enhanceContext...")
		const result = await this.langChainEnhancer.enhanceContext(context, query)
		console.log("[GhostContext] Enhanced context result:", !!result)
		return result
	}

	/**
	 * Check if LangChain enhancement is available
	 */
	public hasLangChainEnhancement(): boolean {
		const hasEnhancer = this.langChainEnhancer !== null
		const isReady = hasEnhancer ? this.langChainEnhancer!.isReady() : false
		console.log(
			"[GhostContext] hasLangChainEnhancement check - enhancer exists:",
			hasEnhancer,
			"is ready:",
			isReady,
		)
		return hasEnhancer && isReady
	}

	/**
	 * Update LangChain configuration
	 */
	public updateLangChainConfig(config: Partial<LangChainContextConfig>): void {
		if (this.langChainEnhancer) {
			this.langChainEnhancer.updateConfig(config)
		}
	}
	// kilocode_change end
}
