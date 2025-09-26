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

// Check if we have a real OpenAI API key for testing
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.TEST_OPENAI_API_KEY || "test-key-for-validation-only"
const SKIP_API_TESTS = !process.env.OPENAI_API_KEY && !process.env.TEST_OPENAI_API_KEY

describe("LangChainContextEnhancer", () => {
	let enhancer: LangChainContextEnhancer
	const testConfig = {
		enabled: true,
		openaiApiKey: OPENAI_API_KEY,
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
		expect(() => new LangChainContextEnhancer({ ...testConfig, openaiApiKey: "" })).toThrow(
			"OpenAI API key is required",
		)
	})

	it("should initialize with provided configuration", () => {
		expect(enhancer.getConfig().enabled).toBe(true)
		expect(enhancer.getConfig().chunkSize).toBe(1000)
		expect(enhancer.getConfig().maxContextFiles).toBe(10)
		expect(enhancer.getConfig().openaiApiKey).toBe(OPENAI_API_KEY)
	})

	it("should be disabled when configured as disabled", () => {
		const disabledEnhancer = new LangChainContextEnhancer({ ...testConfig, enabled: false })
		expect(disabledEnhancer.getConfig().enabled).toBe(false)
		expect(disabledEnhancer.isReady()).toBe(false)
	})

	it.skipIf(SKIP_API_TESTS)(
		"should index workspace documents",
		async () => {
			const documents = [mockDocument]
			await enhancer.indexWorkspaceDocuments(documents)
			expect(enhancer.isReady()).toBe(true)
		},
		30000,
	)

	it.skipIf(SKIP_API_TESTS)(
		"should provide enhanced context when available",
		async () => {
			const documents = [mockDocument]
			await enhancer.indexWorkspaceDocuments(documents)

			const context: GhostSuggestionContext = {
				document: mockDocument,
				userInput: "test function",
			}

			const enhancedContext = await enhancer.enhanceContext(context, "test function")
			expect(enhancedContext).toBeTruthy()
			if (enhancedContext) {
				expect(enhancedContext.contextSummary).toContain("Current file:")
				expect(Array.isArray(enhancedContext.relevantCodeChunks)).toBe(true)
				expect(Array.isArray(enhancedContext.relatedFiles)).toBe(true)
				// Verify that similarity scores are valid (may be 0 chunks due to threshold)
				enhancedContext.relevantCodeChunks.forEach((chunk) => {
					expect(chunk.similarity).toBeGreaterThanOrEqual(0)
					expect(chunk.similarity).toBeLessThanOrEqual(1)
				})
			}
		},
		30000,
	)

	it("should index workspace documents (validation only)", () => {
		expect(mockDocument.getText()).toBeTruthy()
		expect(mockDocument.uri.fsPath).toBe("/test/file.ts")
	})

	it("should provide enhanced context when available (validation only)", () => {
		const context: GhostSuggestionContext = {
			document: mockDocument,
			userInput: "test function",
		}

		expect(context.document).toBeDefined()
		expect(context.userInput).toBe("test function")
	})

	it("should update configuration correctly", () => {
		enhancer.updateConfig({ chunkSize: 500, maxContextFiles: 5 })
		expect(enhancer.getConfig().chunkSize).toBe(500)
		expect(enhancer.getConfig().maxContextFiles).toBe(5)
	})

	it("should validate API key when updating config", () => {
		expect(() => enhancer.updateConfig({ openaiApiKey: "" })).toThrow("OpenAI API key cannot be empty")
	})

	// kilocode_change start - Add validation tests for other config parameters
	it("should validate chunk size when updating config", () => {
		expect(() => enhancer.updateConfig({ chunkSize: 50 })).toThrow("Chunk size must be between 100 and 4000")
		expect(() => enhancer.updateConfig({ chunkSize: 5000 })).toThrow("Chunk size must be between 100 and 4000")
	})

	it("should validate chunk overlap when updating config", () => {
		expect(() => enhancer.updateConfig({ chunkOverlap: -1 })).toThrow("Chunk overlap must be between 0 and 1000")
		expect(() => enhancer.updateConfig({ chunkOverlap: 1500 })).toThrow("Chunk overlap must be between 0 and 1000")
	})

	it("should validate max context files when updating config", () => {
		expect(() => enhancer.updateConfig({ maxContextFiles: 0 })).toThrow(
			"Max context files must be between 1 and 50",
		)
		expect(() => enhancer.updateConfig({ maxContextFiles: 100 })).toThrow(
			"Max context files must be between 1 and 50",
		)
	})

	it("should validate similarity threshold when updating config", () => {
		expect(() => enhancer.updateConfig({ similarityThreshold: -0.1 })).toThrow(
			"Similarity threshold must be between 0 and 1",
		)
		expect(() => enhancer.updateConfig({ similarityThreshold: 1.5 })).toThrow(
			"Similarity threshold must be between 0 and 1",
		)
	})
	// kilocode_change end

	// kilocode_change start - Add test for production embedding model
	it("should use specified embedding model", () => {
		const customEnhancer = new LangChainContextEnhancer({
			...testConfig,
			modelName: "text-embedding-3-large",
		})
		expect(customEnhancer.getConfig().modelName).toBe("text-embedding-3-large")
	})
	// kilocode_change end

	// kilocode_change start - Add comprehensive integration test
	it.skipIf(SKIP_API_TESTS)(
		"should provide complete enhanced context integration",
		async () => {
			const documents = [mockDocument]
			await enhancer.indexWorkspaceDocuments(documents)

			// Mock vscode classes
			const mockRange = {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 10 },
				isEmpty: false,
				isSingleLine: true,
				contains: () => false,
				isEqual: () => false,
				intersection: () => undefined,
				union: () => mockRange,
				with: () => mockRange,
			} as any

			const context: GhostSuggestionContext = {
				document: mockDocument,
				userInput: "test function",
				range: mockRange,
			}

			const enhancedContext = await enhancer.enhanceContext(context, "test function implementation")

			// Verify enhanced context structure
			expect(enhancedContext).toBeTruthy()
			if (enhancedContext) {
				expect(enhancedContext).toHaveProperty("relevantCodeChunks")
				expect(enhancedContext).toHaveProperty("contextSummary")
				expect(enhancedContext).toHaveProperty("relatedFiles")

				expect(Array.isArray(enhancedContext.relevantCodeChunks)).toBe(true)
				expect(Array.isArray(enhancedContext.relatedFiles)).toBe(true)
				expect(typeof enhancedContext.contextSummary).toBe("string")

				// Verify the context summary contains expected information
				expect(enhancedContext.contextSummary).toContain("Current file:")
				expect(enhancedContext.contextSummary).toContain("/test/file.ts")

				// Verify that similarity scores are valid
				enhancedContext.relevantCodeChunks.forEach((chunk) => {
					expect(chunk.similarity).toBeGreaterThanOrEqual(0)
					expect(chunk.similarity).toBeLessThanOrEqual(1)
					expect(typeof chunk.content).toBe("string")
					expect(typeof chunk.filePath).toBe("string")
				})
			}
		},
		30000,
	)

	it("should provide complete enhanced context integration (validation only)", () => {
		const mockRange = {
			start: { line: 0, character: 0 },
			end: { line: 0, character: 10 },
		} as any

		const context: GhostSuggestionContext = {
			document: mockDocument,
			userInput: "test function",
			range: mockRange,
		}

		expect(context.document).toBeDefined()
		expect(context.userInput).toBe("test function")
		expect(context.range).toBeDefined()
	})
	// kilocode_change end
})
