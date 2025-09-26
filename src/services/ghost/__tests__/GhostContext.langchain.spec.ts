// kilocode_change - new file
// Test to verify GhostContext properly integrates with LangChain initialization fix
import { describe, it, expect, beforeEach, vi } from "vitest"
import * as vscode from "vscode"
import { GhostContext } from "../GhostContext"
import { GhostDocumentStore } from "../GhostDocumentStore"
import { GhostSuggestionContext } from "../types"

// Mock vscode configuration
vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: (key: string) => ({
			get: (subkey: string, defaultVal?: any) => {
				const config = {
					"kilo-code.langchain": {
						enabled: true,
						openaiApiKey: "test-key-for-ghost-context-test",
						chunkSize: 1000,
						chunkOverlap: 200,
						maxContextFiles: 10,
						similarityThreshold: 0.7,
						modelName: "text-embedding-3-small",
					},
				}
				return config[key as keyof typeof config]?.[subkey as keyof typeof config["kilo-code.langchain"]] ?? defaultVal
			},
		}),
	},
}))

// Mock ContextProxy
vi.mock("../../core/config/ContextProxy", () => ({
	ContextProxy: {
		instance: {
			getSecret: (key: string) => {
				if (key === "openAiApiKey") return "fallback-test-key"
				return null
			},
		},
	},
}))

describe("GhostContext LangChain Integration", () => {
	let ghostContext: GhostContext
	let documentStore: GhostDocumentStore
	
	const mockDocument = {
		uri: { scheme: "file", fsPath: "/test/file.ts" },
		languageId: "typescript",
		getText: () => "function test() { return 'hello world'; }",
		fileName: "/test/file.ts",
	} as vscode.TextDocument

	beforeEach(() => {
		documentStore = new GhostDocumentStore()
		
		// Mock console methods to reduce noise
		vi.spyOn(console, 'log').mockImplementation(() => {})
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	it("should create GhostContext with LangChain enabled", () => {
		ghostContext = new GhostContext(documentStore, true)
		
		// Should immediately report as having LangChain enhancement due to isAvailable() fix
		expect(ghostContext.hasLangChainEnhancement()).toBe(true)
	})

	it("should create GhostContext with LangChain disabled", () => {
		ghostContext = new GhostContext(documentStore, false)
		
		expect(ghostContext.hasLangChainEnhancement()).toBe(false)
	})

	it("should generate context and attempt LangChain enhancement", async () => {
		ghostContext = new GhostContext(documentStore, true)
		
		const initialContext: GhostSuggestionContext = {
			document: mockDocument,
			userInput: "test function",
		}

		// Mock open files
		vi.spyOn(vscode.workspace, 'textDocuments', 'get').mockReturnValue([mockDocument])

		const context = await ghostContext.generate(initialContext)
		expect(context).toBeDefined()
		expect(context.document).toBe(mockDocument)

		// Should be able to attempt getting enhanced context without throwing
		if (ghostContext.hasLangChainEnhancement()) {
			const enhancedContext = await ghostContext.getEnhancedContext(context)
			// May be null due to fake API key, but should not throw
			expect(enhancedContext === null || typeof enhancedContext === 'object').toBe(true)
		}
	})

	it("should handle LangChain configuration updates", () => {
		ghostContext = new GhostContext(documentStore, true)
		
		expect(ghostContext.hasLangChainEnhancement()).toBe(true)
		
		// Update configuration
		expect(() => {
			ghostContext.updateLangChainConfig({
				enabled: true,
				chunkSize: 2000,
			})
		}).not.toThrow()
		
		// Should still have enhancement
		expect(ghostContext.hasLangChainEnhancement()).toBe(true)
	})

	it("should handle LangChain disable via configuration", () => {
		ghostContext = new GhostContext(documentStore, true)
		
		expect(ghostContext.hasLangChainEnhancement()).toBe(true)
		
		// Disable LangChain
		ghostContext.updateLangChainConfig({ enabled: false })
		
		// Should no longer have enhancement
		expect(ghostContext.hasLangChainEnhancement()).toBe(false)
	})
})