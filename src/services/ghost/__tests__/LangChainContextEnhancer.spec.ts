// kilocode_change - new file
import { describe, it, expect, beforeEach } from "vitest"
import * as vscode from "vscode"
import { LangChainContextEnhancer } from "../LangChainContextEnhancer"
import { GhostSuggestionContext } from "../types"

// Mock vscode module
const mockDocument = {
	uri: { scheme: "file", fsPath: "/test/file.ts" },
	languageId: "typescript",
	getText: () => "function test() { return 'hello world'; }",
} as vscode.TextDocument

describe("LangChainContextEnhancer", () => {
	let enhancer: LangChainContextEnhancer

	beforeEach(() => {
		enhancer = new LangChainContextEnhancer({ enabled: true })
	})

	it("should initialize with default configuration", () => {
		expect(enhancer.getConfig().enabled).toBe(true)
		expect(enhancer.getConfig().chunkSize).toBe(1000)
		expect(enhancer.getConfig().maxContextFiles).toBe(10)
	})

	it("should be disabled when configured as disabled", () => {
		const disabledEnhancer = new LangChainContextEnhancer({ enabled: false })
		expect(disabledEnhancer.getConfig().enabled).toBe(false)
		expect(disabledEnhancer.isReady()).toBe(false)
	})

	it("should index workspace documents", async () => {
		const documents = [mockDocument]
		await enhancer.indexWorkspaceDocuments(documents)
		expect(enhancer.isReady()).toBe(true)
	})

	it("should provide enhanced context when available", async () => {
		const documents = [mockDocument]
		await enhancer.indexWorkspaceDocuments(documents)

		const context: GhostSuggestionContext = {
			document: mockDocument,
			userInput: "test function",
		}

		const enhancedContext = await enhancer.enhanceContext(context, "test function")
		expect(enhancedContext).not.toBeNull()
		if (enhancedContext) {
			expect(enhancedContext.contextSummary).toContain("Current file:")
			expect(Array.isArray(enhancedContext.relevantCodeChunks)).toBe(true)
			expect(Array.isArray(enhancedContext.relatedFiles)).toBe(true)
		}
	})

	it("should update configuration correctly", () => {
		enhancer.updateConfig({ chunkSize: 500, maxContextFiles: 5 })
		expect(enhancer.getConfig().chunkSize).toBe(500)
		expect(enhancer.getConfig().maxContextFiles).toBe(5)
	})
})