import * as vscode from "vscode"
import { GhostSuggestionContext } from "./types"
import { GhostDocumentStore } from "./GhostDocumentStore"
import { LangChainContextEnhancer, type LangChainEnhancedContext } from "./LangChainContextEnhancer" // kilocode_change

export class GhostContext {
	private documentStore: GhostDocumentStore
	private langChainEnhancer: LangChainContextEnhancer | null = null // kilocode_change

	constructor(documentStore: GhostDocumentStore, enableLangChain = false) { // kilocode_change
		this.documentStore = documentStore
		// kilocode_change start
		if (enableLangChain) {
			this.langChainEnhancer = new LangChainContextEnhancer()
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
		if (!this.langChainEnhancer) {
			return null
		}
		return await this.langChainEnhancer.enhanceContext(context, query)
	}

	/**
	 * Check if LangChain enhancement is available
	 */
	public hasLangChainEnhancement(): boolean {
		return this.langChainEnhancer !== null && this.langChainEnhancer.isReady()
	}

	/**
	 * Update LangChain configuration
	 */
	public updateLangChainConfig(config: Parameters<LangChainContextEnhancer['updateConfig']>[0]): void {
		if (this.langChainEnhancer) {
			this.langChainEnhancer.updateConfig(config)
		}
	}
	// kilocode_change end
}
