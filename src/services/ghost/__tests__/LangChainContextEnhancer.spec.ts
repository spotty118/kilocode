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

// kilocode_change start - Mock OpenAI embeddings and LangChain for testing
vi.mock("@langchain/openai", () => ({
	OpenAIEmbeddings: vi.fn().mockImplementation(() => ({
		embedDocuments: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]),
		embedQuery: vi.fn().mockResolvedValue([0.2, 0.3, 0.4]),
	}))
}))

vi.mock("langchain/vectorstores/memory", () => ({
	MemoryVectorStore: vi.fn().mockImplementation(() => ({
		addDocuments: vi.fn().mockResolvedValue(undefined),
		similaritySearchWithScore: vi.fn().mockResolvedValue([
			[{ pageContent: "test content", metadata: { filePath: "/test/file.ts" } }, 0.8]
		])
	}))
}))
// kilocode_change end

describe("LangChainContextEnhancer", () => {
	let enhancer: LangChainContextEnhancer
	const testConfig = {
		enabled: true,
		openaiApiKey: "test-key-12345",
		chunkSize: 1000,
		chunkOverlap: 200, // kilocode_change - Add missing chunkOverlap
		maxContextFiles: 10,
		similarityThreshold: 0.7,
	}

	beforeEach(() => {
		// kilocode_change - Use real config with OpenAI key for production testing
		enhancer = new LangChainContextEnhancer(testConfig)
	})

	it("should require OpenAI API key for initialization", () => {
		expect(() => new LangChainContextEnhancer({ ...testConfig, openaiApiKey: "" })).toThrow("OpenAI API key is required")
	})

	it("should initialize with provided configuration", () => {
		expect(enhancer.getConfig().enabled).toBe(true)
		expect(enhancer.getConfig().chunkSize).toBe(1000)
		expect(enhancer.getConfig().maxContextFiles).toBe(10)
		expect(enhancer.getConfig().openaiApiKey).toBe("test-key-12345")
	})

	it("should be disabled when configured as disabled", () => {
		const disabledEnhancer = new LangChainContextEnhancer({ ...testConfig, enabled: false })
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

	it("should validate API key when updating config", () => {
		expect(() => enhancer.updateConfig({ openaiApiKey: "" })).toThrow("OpenAI API key cannot be empty")
	})

	// kilocode_change start - Add test for production embedding model
	it("should use specified embedding model", () => {
		const customEnhancer = new LangChainContextEnhancer({
			...testConfig,
			modelName: "text-embedding-3-large"
		})
		expect(customEnhancer.getConfig().modelName).toBe("text-embedding-3-large")
	})
	// kilocode_change end
})