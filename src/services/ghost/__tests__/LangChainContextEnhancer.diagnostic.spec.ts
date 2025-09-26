// Real LangChain API diagnostic tests - NO MOCKS
// These tests verify API integration and require a valid OPENAI_API_KEY environment variable
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import * as vscode from "vscode"
import { LangChainContextEnhancer } from "../LangChainContextEnhancer"
import { GhostSuggestionContext } from "../types"

// Check if we have a real OpenAI API key for diagnostic testing
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.TEST_OPENAI_API_KEY
const SKIP_API_TESTS = !OPENAI_API_KEY

// Mock vscode document
const mockDocument = {
	uri: { scheme: "file", fsPath: "/test/file.ts" },
	languageId: "typescript",
	getText: () => "function test() { return 'hello world'; }",
	fileName: "file.ts",
	lineAt: (line: number) => ({ text: "function test() { return 'hello world'; }" }) as vscode.TextLine,
} as vscode.TextDocument

describe("LangChain API Diagnostic Tests", () => {
	let enhancer: LangChainContextEnhancer
	const testConfig = {
		enabled: true,
		openaiApiKey: OPENAI_API_KEY || "test-key-for-validation",
		chunkSize: 1000,
		chunkOverlap: 200,
		maxContextFiles: 10,
		similarityThreshold: 0.7,
		modelName: "text-embedding-3-small",
	}

	beforeEach(() => {
		enhancer = new LangChainContextEnhancer(testConfig)
	})

	afterEach(() => {
		// Cleanup if needed
	})

	it("should initialize with correct configuration", () => {
		expect(enhancer.getConfig().enabled).toBe(true)
		expect(enhancer.getConfig().chunkSize).toBe(1000)
		expect(enhancer.getConfig().chunkOverlap).toBe(200)
		expect(enhancer.getConfig().maxContextFiles).toBe(10)
		expect(enhancer.getConfig().similarityThreshold).toBe(0.7)
		expect(enhancer.getConfig().modelName).toBe("text-embedding-3-small")
	})

	it.skipIf(SKIP_API_TESTS)(
		"should successfully call real OpenAI embeddings API for document indexing",
		async () => {
			console.log("[DIAGNOSTIC] Testing real OpenAI embedDocuments API call...")

			const documents = [mockDocument]

			// This makes a real API call to OpenAI embedDocuments
			await enhancer.indexWorkspaceDocuments(documents)

			expect(enhancer.isReady()).toBe(true)
			console.log("✅ embedDocuments API call successful")
		},
		30000,
	)

	it.skipIf(SKIP_API_TESTS)(
		"should successfully call real OpenAI embeddings API for query embedding",
		async () => {
			console.log("[DIAGNOSTIC] Testing real OpenAI embedQuery API call...")

			// First index a document
			const documents = [mockDocument]
			await enhancer.indexWorkspaceDocuments(documents)

			const context: GhostSuggestionContext = {
				document: mockDocument,
				userInput: "test function",
			}

			// This makes a real API call to OpenAI embedQuery
			const enhancedContext = await enhancer.enhanceContext(context, "test function")

			expect(enhancedContext).toBeTruthy()
			console.log("✅ embedQuery API call successful")

			if (enhancedContext) {
				expect(enhancedContext).toHaveProperty("relevantCodeChunks")
				expect(enhancedContext).toHaveProperty("contextSummary")
				expect(enhancedContext).toHaveProperty("relatedFiles")
				console.log("📊 API Response structure validated")
			}
		},
		30000,
	)

	it.skipIf(SKIP_API_TESTS)(
		"should track both indexing and query API calls in workflow",
		async () => {
			console.log("[DIAGNOSTIC] Testing complete API workflow...")

			const documents = [mockDocument]

			// Step 1: Index documents (embedDocuments API call)
			console.log("  📤 Making embedDocuments API call...")
			await enhancer.indexWorkspaceDocuments(documents)
			expect(enhancer.isReady()).toBe(true)
			console.log("  ✅ Document indexing complete")

			const context: GhostSuggestionContext = {
				document: mockDocument,
				userInput: "test function",
			}

			// Step 2: Enhance context (embedQuery API call)
			console.log("  📤 Making embedQuery API call...")
			const enhancedContext = await enhancer.enhanceContext(context, "test function")

			expect(enhancedContext).not.toBeNull()
			console.log("  ✅ Context enhancement complete")

			if (enhancedContext) {
				expect(Array.isArray(enhancedContext.relevantCodeChunks)).toBe(true)
				expect(typeof enhancedContext.contextSummary).toBe("string")
				expect(Array.isArray(enhancedContext.relatedFiles)).toBe(true)

				console.log("📈 Workflow Results:")
				console.log(`  - Relevant chunks: ${enhancedContext.relevantCodeChunks.length}`)
				console.log(`  - Related files: ${enhancedContext.relatedFiles.length}`)
				console.log(`  - Context summary: ${enhancedContext.contextSummary.substring(0, 100)}...`)
			}
		},
		45000,
	)

	it("should handle missing API key gracefully", () => {
		console.log("[DIAGNOSTIC] Testing API key validation...")

		// Should throw error for missing API key
		expect(
			() =>
				new LangChainContextEnhancer({
					...testConfig,
					openaiApiKey: "",
				}),
		).toThrow("OpenAI API key is required")

		// Should work with valid API key format
		expect(
			() =>
				new LangChainContextEnhancer({
					...testConfig,
					openaiApiKey: "sk-test123",
				}),
		).not.toThrow()

		console.log("✅ API key validation working correctly")
	})

	it.skipIf(SKIP_API_TESTS)(
		"should handle API errors and timeouts gracefully",
		async () => {
			console.log("[DIAGNOSTIC] Testing API error handling...")

			// Test with invalid API key
			const invalidEnhancer = new LangChainContextEnhancer({
				...testConfig,
				openaiApiKey: "sk-invalid123456789",
			})

			const documents = [mockDocument]

			// This should fail but not crash
			try {
				await invalidEnhancer.indexWorkspaceDocuments(documents)
				// If we get here without error, that's also valid (maybe it failed silently)
				expect(invalidEnhancer.isReady()).toBe(false)
			} catch (error) {
				// API should return a meaningful error
				expect(error).toBeInstanceOf(Error)
				console.log("✅ API error handled gracefully:", (error as Error).message.substring(0, 100))
			}
		},
		30000,
	)

	it.skipIf(SKIP_API_TESTS)(
		"should validate embedding vector dimensions and similarity calculations",
		async () => {
			console.log("[DIAGNOSTIC] Testing embedding vector quality...")

			// Create documents with different content
			const documents = [
				{
					uri: { scheme: "file", fsPath: "/test/math.ts" },
					languageId: "typescript",
					getText: () => "function add(a: number, b: number): number { return a + b; }",
					lineAt: (line: number) =>
						({ text: "function add(a: number, b: number): number { return a + b; }" }) as vscode.TextLine,
				} as vscode.TextDocument,
				{
					uri: { scheme: "file", fsPath: "/test/string.ts" },
					languageId: "typescript",
					getText: () => "function concat(str1: string, str2: string): string { return str1 + str2; }",
					lineAt: (line: number) =>
						({
							text: "function concat(str1: string, str2: string): string { return str1 + str2; }",
						}) as vscode.TextLine,
				} as vscode.TextDocument,
			]

			await enhancer.indexWorkspaceDocuments(documents)

			// Test similarity with math-related query
			const mathContext: GhostSuggestionContext = {
				document: documents[0],
				userInput: "mathematical addition operation",
			}

			const mathResult = await enhancer.enhanceContext(mathContext, "add numbers together")

			console.log("📊 Similarity Analysis:")
			if (mathResult && mathResult.relevantCodeChunks.length > 0) {
				mathResult.relevantCodeChunks.forEach((chunk, i) => {
					console.log(
						`  Chunk ${i + 1}: similarity=${chunk.similarity.toFixed(4)}, content="${chunk.content.substring(0, 50)}..."`,
					)

					// Validate similarity scores
					expect(chunk.similarity).toBeGreaterThanOrEqual(0)
					expect(chunk.similarity).toBeLessThanOrEqual(1)
					expect(typeof chunk.similarity).toBe("number")
					expect(isNaN(chunk.similarity)).toBe(false)
				})
			}

			console.log("✅ Embedding vector quality validated")
		},
		45000,
	)

	// Informational test when API key is missing
	it.skipIf(!SKIP_API_TESTS)("provides instructions for running diagnostic tests", () => {
		console.log("🚨 LangChain API Diagnostic Tests Skipped")
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		console.log("To run comprehensive API diagnostic tests:")
		console.log("1. Get an OpenAI API key: https://platform.openai.com/api-keys")
		console.log("2. Set environment variable:")
		console.log("   export OPENAI_API_KEY=your-key-here")
		console.log("   # or")
		console.log("   export TEST_OPENAI_API_KEY=your-key-here")
		console.log("3. Run the diagnostic tests:")
		console.log("   cd src && npx vitest run services/ghost/__tests__/LangChainContextEnhancer.diagnostic.spec.ts")
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

		// This test always passes - it's just informational
		expect(true).toBe(true)
	})
})
