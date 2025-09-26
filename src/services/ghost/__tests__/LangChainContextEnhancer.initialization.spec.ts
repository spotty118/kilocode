// kilocode_change - new file
// Test to verify the LangChain initialization race condition fix
import { describe, it, expect, beforeEach, vi } from "vitest"
import * as vscode from "vscode"
import { LangChainContextEnhancer } from "../LangChainContextEnhancer"
import { GhostSuggestionContext } from "../types"

// Mock vscode document
const mockDocument = {
	uri: { scheme: "file", fsPath: "/test/file.ts" },
	languageId: "typescript",
	getText: () => "function test() { return 'hello world'; }",
} as vscode.TextDocument

// Use a test API key (won't make real calls in this test)
const testConfig = {
	enabled: true,
	openaiApiKey: "test-key-for-initialization-test",
	chunkSize: 1000,
	chunkOverlap: 200,
	maxContextFiles: 10,
	similarityThreshold: 0.7,
	modelName: "text-embedding-3-small",
}

describe("LangChainContextEnhancer Initialization Fix", () => {
	let enhancer: LangChainContextEnhancer

	beforeEach(() => {
		enhancer = new LangChainContextEnhancer(testConfig)
	})

	it("should have isAvailable() return true immediately after construction when enabled", () => {
		expect(enhancer.isAvailable()).toBe(true)
		// isReady() might still be false due to async initialization
		console.log("isReady():", enhancer.isReady())
		console.log("isAvailable():", enhancer.isAvailable())
	})

	it("should have isAvailable() return false when disabled", () => {
		const disabledEnhancer = new LangChainContextEnhancer({ ...testConfig, enabled: false })
		expect(disabledEnhancer.isAvailable()).toBe(false)
		expect(disabledEnhancer.isReady()).toBe(false)
	})

	it("should handle indexWorkspaceDocuments gracefully during initialization", async () => {
		// This should not throw even if initialization is still pending
		const documents = [mockDocument]
		
		// Mock the vector store to avoid real API calls
		vi.spyOn(console, 'log').mockImplementation(() => {})
		vi.spyOn(console, 'error').mockImplementation(() => {})
		
		await expect(enhancer.indexWorkspaceDocuments(documents)).resolves.not.toThrow()
	})

	it("should handle enhanceContext gracefully during initialization", async () => {
		const context: GhostSuggestionContext = {
			document: mockDocument,
			userInput: "test function",
		}

		// Mock console methods to avoid noise
		vi.spyOn(console, 'log').mockImplementation(() => {})
		vi.spyOn(console, 'error').mockImplementation(() => {})

		// This should return null gracefully if initialization fails, not throw
		const result = await enhancer.enhanceContext(context, "test query")
		expect(result).toBeNull() // Expected since we're using a fake API key
	})

	it("should properly update configuration", () => {
		const newConfig = { chunkSize: 2000, enabled: true }
		
		expect(() => enhancer.updateConfig(newConfig)).not.toThrow()
		expect(enhancer.getConfig().chunkSize).toBe(2000)
		expect(enhancer.isAvailable()).toBe(true)
	})

	it("should handle disabled configuration properly", () => {
		enhancer.updateConfig({ enabled: false })
		
		expect(enhancer.getConfig().enabled).toBe(false)
		expect(enhancer.isAvailable()).toBe(false)
		expect(enhancer.isReady()).toBe(false)
	})
})