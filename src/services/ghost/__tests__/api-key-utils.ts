// kilocode_change - new file
// Utility functions for API key detection in tests
import * as vscode from "vscode"

/**
 * Checks for OpenAI API key in all possible locations:
 * 1. Environment variables (OPENAI_API_KEY, TEST_OPENAI_API_KEY)
 * 2. VSCode settings (kilo-code.langchain.openaiApiKey)
 * 3. Kilo settings via ContextProxy (openAiApiKey secret)
 */
export function getAvailableOpenAIApiKey(): string | null {
	// Check environment variables first
	const envKey = process.env.OPENAI_API_KEY || process.env.TEST_OPENAI_API_KEY
	if (envKey) {
		return envKey
	}

	// Check VSCode langchain-specific setting
	try {
		const langChainConfig = vscode.workspace.getConfiguration("kilo-code.langchain")
		const vsCodeKey = langChainConfig.get<string>("openaiApiKey")
		if (vsCodeKey) {
			return vsCodeKey
		}
	} catch (error) {
		// VSCode workspace might not be available in test environment
		console.warn("Could not access VSCode workspace configuration:", error)
	}

	// Check main kilo settings via ContextProxy
	try {
		const { ContextProxy } = require("../../core/config/ContextProxy")
		const kiloKey = ContextProxy.instance?.getSecret("openAiApiKey")
		if (kiloKey) {
			return kiloKey
		}
	} catch (error) {
		// ContextProxy might not be initialized in test environment
		console.warn("Could not access ContextProxy:", error)
	}

	return null
}

/**
 * Determines if LangChain integration tests should be skipped
 * Returns false (don't skip) if ANY OpenAI API key is available
 */
export function shouldSkipLangChainTests(): boolean {
	const apiKey = getAvailableOpenAIApiKey()
	const shouldSkip = !apiKey

	if (shouldSkip) {
		console.log("⚠️  Skipping LangChain tests - no OpenAI API key found")
		console.log("To run these tests, set the API key in one of these ways:")
		console.log("  1. Environment variable: OPENAI_API_KEY or TEST_OPENAI_API_KEY")
		console.log("  2. VSCode setting: kilo-code.langchain.openaiApiKey")
		console.log("  3. Kilo settings: Main OpenAI API key in extension settings")
	} else {
		console.log("🔑 Found OpenAI API key for LangChain testing")
	}

	return shouldSkip
}

/**
 * Gets the OpenAI API key for test configuration
 * Throws an error if no key is available
 */
export function getTestOpenAIApiKey(): string {
	const apiKey = getAvailableOpenAIApiKey()
	if (!apiKey) {
		throw new Error("No OpenAI API key available for testing")
	}
	return apiKey
}