// kilocode_change - new file
import { describe, it, expect, beforeEach, vi } from "vitest"
import * as vscode from "vscode"
import { LangChainContextEnhancer } from "../LangChainContextEnhancer"
import { GhostSuggestionContext } from "../types"

// Mock vscode module
const mockDocument = {
	uri: { scheme: "file", fsPath: "/test/file.ts" },
	languageId: "typescript",
	getText: () => "function test() { return 'hello world'; }",
} as vscode.TextDocument

// kilocode_change start - Mock OpenAI embeddings for testing
vi.mock("@langchain/openai", () => ({
	OpenAIEmbeddings: vi.fn().mockImplementation(() => ({
		embedDocuments: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]),
		embedQuery: vi.fn().mockResolvedValue([0.2, 0.3, 0.4]),
	}))
}))
// kilocode_change end

describe("LangChainContextEnhancer", () => {
	let enhancer: LangChainContextEnhancer

	beforeEach(() => {
		// kilocode_change - Use mock embeddings for testing instead of requiring OpenAI key
		enhancer = new LangChainContextEnhancer({ 
			enabled: true,
			useOpenAI: false // Use mock embeddings for testing
		})
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

	// kilocode_change start - Add test for OpenAI integration
	it("should work with OpenAI embeddings when configured", () => {
		const openaiEnhancer = new LangChainContextEnhancer({
			enabled: true,
			useOpenAI: true,
			openaiApiKey: "test-key"
		})
		expect(openaiEnhancer.getConfig().useOpenAI).toBe(true)
		expect(openaiEnhancer.getConfig().openaiApiKey).toBe("test-key")
	})
	// kilocode_change end
})