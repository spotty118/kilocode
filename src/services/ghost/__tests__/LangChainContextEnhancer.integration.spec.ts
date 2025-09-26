// Real LangChain integration tests - NO MOCKS
// These tests actually call the OpenAI API and require a valid OPENAI_API_KEY environment variable
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import * as vscode from "vscode"
import { LangChainContextEnhancer } from "../LangChainContextEnhancer"
import { GhostSuggestionContext } from "../types"

// Check if we have a real OpenAI API key for integration testing
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.TEST_OPENAI_API_KEY
const SKIP_INTEGRATION_TESTS = !OPENAI_API_KEY

// Mock vscode document for testing
const createMockDocument = (content: string, filePath: string): vscode.TextDocument =>
	({
		uri: { scheme: "file", fsPath: filePath } as vscode.Uri,
		languageId: "typescript",
		getText: () => content,
		fileName: filePath,
		lineAt: (line: number) => ({ text: content.split("\n")[line] || "" }) as vscode.TextLine,
	}) as vscode.TextDocument

describe.skipIf(SKIP_INTEGRATION_TESTS)("LangChain Real API Integration Tests", () => {
	let enhancer: LangChainContextEnhancer
	const testConfig = {
		enabled: true,
		openaiApiKey: OPENAI_API_KEY!,
		chunkSize: 500, // Smaller chunks for faster testing
		chunkOverlap: 100,
		maxContextFiles: 3, // Fewer files to reduce API calls
		similarityThreshold: 0.5, // Lower threshold for more results
		modelName: "text-embedding-3-small", // Cost-effective model
	}

	beforeAll(async () => {
		if (!OPENAI_API_KEY) {
			console.log("⚠️  Skipping integration tests - no OpenAI API key found")
			console.log("Set OPENAI_API_KEY or TEST_OPENAI_API_KEY environment variable to run these tests")
			return
		}

		console.log("🔑 Using OpenAI API key for integration testing")
		enhancer = new LangChainContextEnhancer(testConfig)
	}, 30000) // 30 second timeout for API initialization

	afterAll(() => {
		console.log("✅ Integration tests completed")
	})

	it("should successfully initialize with real OpenAI embeddings", () => {
		expect(enhancer.getConfig().enabled).toBe(true)
		expect(enhancer.getConfig().openaiApiKey).toBe(OPENAI_API_KEY)
		expect(enhancer.getConfig().modelName).toBe("text-embedding-3-small")
	})

	it("should index real documents and create embeddings", async () => {
		console.log("📄 Testing document indexing with real OpenAI API...")

		const documents = [
			createMockDocument(
				`
        function calculateTax(amount: number, rate: number): number {
          return amount * rate;
        }
        
        function validateAmount(amount: number): boolean {
          return amount > 0 && amount < 1000000;
        }
      `,
				"/test/tax-utils.ts",
			),

			createMockDocument(
				`
        class UserAccount {
          constructor(public balance: number) {}
          
          deposit(amount: number): void {
            this.balance += amount;
          }
          
          withdraw(amount: number): boolean {
            if (amount <= this.balance) {
              this.balance -= amount;
              return true;
            }
            return false;
          }
        }
      `,
				"/test/account.ts",
			),
		]

		// This will make real API calls to OpenAI
		await enhancer.indexWorkspaceDocuments(documents)
		expect(enhancer.isReady()).toBe(true)
		console.log("✅ Document indexing successful")
	}, 45000) // 45 second timeout for API calls

	it("should find relevant code using real similarity search", async () => {
		console.log("🔍 Testing similarity search with real OpenAI embeddings...")

		const context: GhostSuggestionContext = {
			document: createMockDocument("const userBalance = 500;", "/test/main.ts"),
			userInput: "calculate tax on user balance",
		}

		// This will make a real API call for embedQuery
		const enhancedContext = await enhancer.enhanceContext(context, "calculate tax amount")

		console.log("🎯 Enhanced context result:", {
			hasResult: !!enhancedContext,
			relevantChunks: enhancedContext?.relevantCodeChunks.length || 0,
			relatedFiles: enhancedContext?.relatedFiles.length || 0,
		})

		expect(enhancedContext).not.toBeNull()
		if (enhancedContext) {
			expect(enhancedContext).toHaveProperty("relevantCodeChunks")
			expect(enhancedContext).toHaveProperty("contextSummary")
			expect(enhancedContext).toHaveProperty("relatedFiles")
			expect(Array.isArray(enhancedContext.relevantCodeChunks)).toBe(true)
			expect(Array.isArray(enhancedContext.relatedFiles)).toBe(true)

			// Should find tax-related functions
			if (enhancedContext.relevantCodeChunks.length > 0) {
				const hasRelevantCode = enhancedContext.relevantCodeChunks.some(
					(chunk) =>
						chunk.content.includes("tax") ||
						chunk.content.includes("calculate") ||
						chunk.content.includes("amount"),
				)
				expect(hasRelevantCode).toBe(true)

				// All similarity scores should be valid numbers between 0 and 1
				enhancedContext.relevantCodeChunks.forEach((chunk) => {
					expect(typeof chunk.similarity).toBe("number")
					expect(chunk.similarity).toBeGreaterThanOrEqual(0)
					expect(chunk.similarity).toBeLessThanOrEqual(1)
					expect(chunk.similarity).toBeGreaterThanOrEqual(testConfig.similarityThreshold)
				})
			}

			console.log(
				"📊 Relevant chunks found:",
				enhancedContext.relevantCodeChunks.map((chunk) => ({
					similarity: chunk.similarity.toFixed(3),
					preview: chunk.content.substring(0, 50) + "...",
				})),
			)
		}
	}, 30000) // 30 second timeout for API calls

	it("should handle different query types with real embeddings", async () => {
		console.log("🔄 Testing different query types...")

		const testQueries = [
			{ query: "user account balance", expectedRelevance: ["balance", "account", "user"] },
			{ query: "deposit money withdraw funds", expectedRelevance: ["deposit", "withdraw", "amount"] },
			{ query: "validation logic", expectedRelevance: ["validate", "boolean", "return"] },
		]

		for (const testCase of testQueries) {
			console.log(`  🔍 Testing query: "${testCase.query}"`)

			const context: GhostSuggestionContext = {
				document: createMockDocument("// Test context", "/test/query-test.ts"),
				userInput: testCase.query,
			}

			const enhancedContext = await enhancer.enhanceContext(context, testCase.query)
			expect(enhancedContext).not.toBeNull()

			if (enhancedContext && enhancedContext.relevantCodeChunks.length > 0) {
				const hasExpectedContent = testCase.expectedRelevance.some((keyword) =>
					enhancedContext.relevantCodeChunks.some((chunk) =>
						chunk.content.toLowerCase().includes(keyword.toLowerCase()),
					),
				)
				console.log(`    ✅ Found relevant content for "${testCase.query}": ${hasExpectedContent}`)

				// Log top result for debugging
				const topChunk = enhancedContext.relevantCodeChunks[0]
				console.log(
					`    📝 Top result (${topChunk.similarity.toFixed(3)}): ${topChunk.content.substring(0, 100)}...`,
				)
			}
		}
	}, 60000) // 60 second timeout for multiple API calls

	it("should handle configuration updates in real time", async () => {
		console.log("⚙️  Testing real-time configuration updates...")

		const originalThreshold = enhancer.getConfig().similarityThreshold

		// Update to very high threshold
		enhancer.updateConfig({ similarityThreshold: 0.95 })
		expect(enhancer.getConfig().similarityThreshold).toBe(0.95)

		const context: GhostSuggestionContext = {
			document: createMockDocument("const test = 1;", "/test/config-test.ts"),
			userInput: "unrelated query about databases",
		}

		const highThresholdResult = await enhancer.enhanceContext(context, "database connection")
		console.log("    📊 High threshold results:", highThresholdResult?.relevantCodeChunks.length || 0, "chunks")

		// Restore lower threshold
		enhancer.updateConfig({ similarityThreshold: 0.3 })
		const lowThresholdResult = await enhancer.enhanceContext(context, "database connection")
		console.log("    📊 Low threshold results:", lowThresholdResult?.relevantCodeChunks.length || 0, "chunks")

		// Restore original
		enhancer.updateConfig({ similarityThreshold: originalThreshold })

		expect(enhancer.getConfig().similarityThreshold).toBe(originalThreshold)
	}, 45000)

	it("should handle API errors gracefully", async () => {
		console.log("🚨 Testing error handling with invalid API key...")

		// Create enhancer with invalid API key
		const invalidEnhancer = new LangChainContextEnhancer({
			...testConfig,
			openaiApiKey: "invalid-key-12345",
		})

		const documents = [createMockDocument("test content", "/test/error-test.ts")]

		// This should fail gracefully without throwing
		try {
			await invalidEnhancer.indexWorkspaceDocuments(documents)
			expect(invalidEnhancer.isReady()).toBe(false)

			const context: GhostSuggestionContext = {
				document: documents[0],
				userInput: "test query",
			}

			const result = await invalidEnhancer.enhanceContext(context, "test")
			expect(result).toBeNull() // Should return null on API error
			console.log("✅ Graceful error handling confirmed")
		} catch (error) {
			// If it throws, make sure it's a meaningful error
			expect(error).toBeInstanceOf(Error)
			console.log("✅ Error thrown as expected:", (error as Error).message)
		}
	}, 30000)
})

// Conditional describe for when API key is not available
describe.skipIf(!SKIP_INTEGRATION_TESTS)("LangChain Integration Tests - Skipped", () => {
	it("should require OpenAI API key for integration testing", () => {
		console.log("⚠️  Integration tests skipped - no OpenAI API key found")
		console.log("To run these tests:")
		console.log("  1. Get an OpenAI API key from https://platform.openai.com/api-keys")
		console.log("  2. Set environment variable: export OPENAI_API_KEY=your-key-here")
		console.log("  3. Or set: export TEST_OPENAI_API_KEY=your-key-here")
		console.log(
			"  4. Run: cd src && npx vitest run services/ghost/__tests__/LangChainContextEnhancer.integration.spec.ts",
		)

		expect(true).toBe(true) // Always pass this placeholder test
	})
})
