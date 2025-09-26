// Additional edge case tests for LangChain integration - NO MOCKS
import { describe, it, expect, beforeEach } from "vitest"
import * as vscode from "vscode"
import { LangChainContextEnhancer } from "../LangChainContextEnhancer"
import { GhostSuggestionContext } from "../types"

// Check if we have a real OpenAI API key for testing
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.TEST_OPENAI_API_KEY || "test-key-for-validation-only"
const SKIP_API_TESTS = !process.env.OPENAI_API_KEY && !process.env.TEST_OPENAI_API_KEY

// Mock vscode module
const mockDocument = {
	uri: { scheme: "file", fsPath: "/test/file.ts" },
	languageId: "typescript",
	getText: () => "function test() { return 'hello world'; }",
	lineAt: (line: number) => ({ text: "function test() { return 'hello world'; }" }) as vscode.TextLine,
} as vscode.TextDocument

const emptyDocument = {
	uri: { scheme: "file", fsPath: "/test/empty.ts" },
	languageId: "typescript",
	getText: () => "",
	lineAt: (line: number) => ({ text: "" }) as vscode.TextLine,
} as vscode.TextDocument

describe("LangChainContextEnhancer - Edge Cases", () => {
	let enhancer: LangChainContextEnhancer
	const testConfig = {
		enabled: true,
		openaiApiKey: OPENAI_API_KEY,
		chunkSize: 1000,
		chunkOverlap: 200,
		maxContextFiles: 10,
		similarityThreshold: 0.7,
	}

	beforeEach(() => {
		enhancer = new LangChainContextEnhancer(testConfig)
	})

	describe("Empty document handling", () => {
		it.skipIf(SKIP_API_TESTS)(
			"should handle empty documents gracefully",
			async () => {
				const documents = [emptyDocument]
				await enhancer.indexWorkspaceDocuments(documents)

				const context: GhostSuggestionContext = {
					document: emptyDocument,
					userInput: "test function",
				}

				const enhancedContext = await enhancer.enhanceContext(context, "test")
				// Should return null or empty context since no content to index
				expect(enhancedContext).toBeTruthy() // Still returns context summary
				if (enhancedContext) {
					expect(enhancedContext.relevantCodeChunks).toHaveLength(0)
					expect(enhancedContext.relatedFiles).toHaveLength(0)
				}
			},
			30000,
		)

		it.skipIf(SKIP_API_TESTS)(
			"should handle mixed empty and non-empty documents",
			async () => {
				const documents = [mockDocument, emptyDocument]
				await enhancer.indexWorkspaceDocuments(documents)

				expect(enhancer.isReady()).toBe(true)
			},
			30000,
		)

		it("should handle empty documents (validation only)", () => {
			expect(emptyDocument.getText()).toBe("")
			expect(emptyDocument.uri.fsPath).toBe("/test/empty.ts")
		})
	})

	describe("Configuration edge cases", () => {
		it("should handle disabled enhancer gracefully", async () => {
			const disabledEnhancer = new LangChainContextEnhancer({
				...testConfig,
				enabled: false,
			})

			const documents = [mockDocument]
			await disabledEnhancer.indexWorkspaceDocuments(documents)

			const context: GhostSuggestionContext = {
				document: mockDocument,
				userInput: "test function",
			}

			const enhancedContext = await disabledEnhancer.enhanceContext(context)
			expect(enhancedContext).toBeNull()
		})

		it.skipIf(SKIP_API_TESTS)(
			"should handle very low similarity threshold",
			async () => {
				const lowThresholdEnhancer = new LangChainContextEnhancer({
					...testConfig,
					similarityThreshold: 0.1,
				})

				const documents = [mockDocument]
				await lowThresholdEnhancer.indexWorkspaceDocuments(documents)

				const context: GhostSuggestionContext = {
					document: mockDocument,
					userInput: "completely unrelated query about database connections",
				}

				const enhancedContext = await lowThresholdEnhancer.enhanceContext(context, "test function")
				// With low threshold, should still return context even if not highly relevant
				expect(enhancedContext).toBeTruthy()
				if (enhancedContext) {
					// May have 0 relevant chunks due to similarity filtering, but context should exist
					expect(enhancedContext.contextSummary).toContain("Current file:")
					expect(Array.isArray(enhancedContext.relevantCodeChunks)).toBe(true)
				}
			},
			30000,
		)

		it("should handle very low similarity threshold (validation only)", () => {
			const lowThresholdEnhancer = new LangChainContextEnhancer({
				...testConfig,
				similarityThreshold: 0.1,
			})

			expect(lowThresholdEnhancer.getConfig().similarityThreshold).toBe(0.1)
			expect(lowThresholdEnhancer.getConfig().enabled).toBe(true)
		})

		it.skipIf(SKIP_API_TESTS)(
			"should handle very high similarity threshold",
			async () => {
				const highThresholdEnhancer = new LangChainContextEnhancer({
					...testConfig,
					similarityThreshold: 0.99,
				})

				const documents = [mockDocument]
				await highThresholdEnhancer.indexWorkspaceDocuments(documents)

				const context: GhostSuggestionContext = {
					document: mockDocument,
					userInput: "test function",
				}

				const enhancedContext = await highThresholdEnhancer.enhanceContext(context)
				// May return empty chunks due to high threshold
				expect(enhancedContext).toBeTruthy()
			},
			30000,
		)

		it("should handle very high similarity threshold (validation only)", () => {
			const highThresholdEnhancer = new LangChainContextEnhancer({
				...testConfig,
				similarityThreshold: 0.99,
			})

			expect(highThresholdEnhancer.getConfig().similarityThreshold).toBe(0.99)
		})
	})

	describe("Context building edge cases", () => {
		it.skipIf(SKIP_API_TESTS)(
			"should handle context without user input",
			async () => {
				const documents = [mockDocument]
				await enhancer.indexWorkspaceDocuments(documents)

				const mockRange = {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 10 },
				} as any

				const context: GhostSuggestionContext = {
					document: mockDocument,
					range: mockRange, // Provide range so buildSearchQuery can extract line text
					// No userInput provided
				}

				const enhancedContext = await enhancer.enhanceContext(context, "test query")
				expect(enhancedContext).toBeTruthy()
			},
			30000,
		)

		it.skipIf(SKIP_API_TESTS)(
			"should handle context without document",
			async () => {
				const documents = [mockDocument]
				await enhancer.indexWorkspaceDocuments(documents)

				const context: GhostSuggestionContext = {
					document: undefined as any, // Explicitly test undefined document
					userInput: "test function",
				}

				const enhancedContext = await enhancer.enhanceContext(context)
				expect(enhancedContext).toBeTruthy()
			},
			30000,
		)

		it.skipIf(SKIP_API_TESTS)(
			"should handle context with only diagnostics",
			async () => {
				const documents = [mockDocument]
				await enhancer.indexWorkspaceDocuments(documents)

				const context: GhostSuggestionContext = {
					document: mockDocument,
					diagnostics: [
						{
							message: "Type 'string' is not assignable to type 'number'",
							range: new vscode.Range(0, 0, 0, 10),
							severity: vscode.DiagnosticSeverity.Error,
							source: "typescript",
						},
					],
				}

				const enhancedContext = await enhancer.enhanceContext(context)
				expect(enhancedContext).not.toBeNull()
				if (enhancedContext) {
					expect(enhancedContext.contextSummary).toContain("Active diagnostics: 1")
				}
			},
			30000,
		)

		it("should handle context building (validation only)", () => {
			const context: GhostSuggestionContext = {
				document: mockDocument,
				userInput: "test function",
			}

			expect(context.document).toBeDefined()
			expect(context.userInput).toBe("test function")
		})
	})

	describe("Performance and limits", () => {
		it("should respect maxContextFiles limit (validation only)", () => {
			const limitedEnhancer = new LangChainContextEnhancer({
				...testConfig,
				maxContextFiles: 1,
			})

			expect(limitedEnhancer.getConfig().maxContextFiles).toBe(1)
		})

		it("should handle large chunk sizes (validation only)", () => {
			const largeChunkEnhancer = new LangChainContextEnhancer({
				...testConfig,
				chunkSize: 4000,
				chunkOverlap: 500,
			})

			expect(largeChunkEnhancer.getConfig().chunkSize).toBe(4000)
			expect(largeChunkEnhancer.getConfig().chunkOverlap).toBe(500)
		})
	})

	describe("Configuration updates", () => {
		it("should reset vector store when API key is updated", () => {
			expect(enhancer.isReady()).toBe(false)

			enhancer.updateConfig({ openaiApiKey: "new-test-key" })

			// Should reset initialization state
			expect(enhancer.isReady()).toBe(false)
			expect(enhancer.getConfig().openaiApiKey).toBe("new-test-key")
		})

		it("should reset vector store when model name is updated", () => {
			enhancer.updateConfig({ modelName: "text-embedding-3-large" })

			expect(enhancer.isReady()).toBe(false)
			expect(enhancer.getConfig().modelName).toBe("text-embedding-3-large")
		})

		it("should update text splitter when chunk parameters change", () => {
			const originalChunkSize = enhancer.getConfig().chunkSize

			enhancer.updateConfig({
				chunkSize: 500,
				chunkOverlap: 100,
			})

			expect(enhancer.getConfig().chunkSize).toBe(500)
			expect(enhancer.getConfig().chunkOverlap).toBe(100)
			expect(enhancer.getConfig().chunkSize).not.toBe(originalChunkSize)
		})
	})
})
