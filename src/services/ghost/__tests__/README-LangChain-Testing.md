# LangChain Real API Testing Guide

This guide explains how to test the LangChain integration with real OpenAI API calls (no mocks).

## Overview

The LangChain integration includes **4 test suites**:

1. **`LangChainContextEnhancer.spec.ts`** - Core functionality tests
2. **`LangChainContextEnhancer.edge-cases.spec.ts`** - Edge cases and error scenarios
3. **`LangChainContextEnhancer.diagnostic.spec.ts`** - API call diagnostics and validation
4. **`LangChainContextEnhancer.integration.spec.ts`** - Full integration tests with real OpenAI API

## Test Modes

### 🔧 Validation Mode (Default)

**No API key required** - Tests run configuration validation and basic functionality without API calls.

```bash
cd src && npx vitest run services/ghost/__tests__/LangChainContextEnhancer.*.spec.ts
```

**Result**: ✅ All validation tests pass, API-dependent tests are skipped

### 🚀 Full API Integration Mode

**Requires OpenAI API key** - Tests make real API calls to OpenAI embeddings service.

## Setting Up Real API Testing

### Step 1: Get OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Step 2: Set Environment Variable

```bash
# Method 1: Direct environment variable
export OPENAI_API_KEY="sk-your-actual-key-here"

# Method 2: Test-specific variable
export TEST_OPENAI_API_KEY="sk-your-actual-key-here"
```

### Step 3: Run Real API Tests

```bash
# Run all LangChain tests with real API calls
cd src && npx vitest run services/ghost/__tests__/LangChainContextEnhancer.*.spec.ts

# Run specific test suites
cd src && npx vitest run services/ghost/__tests__/LangChainContextEnhancer.integration.spec.ts
cd src && npx vitest run services/ghost/__tests__/LangChainContextEnhancer.diagnostic.spec.ts
```

## Test Suite Breakdown

### 📋 Core Tests (`LangChainContextEnhancer.spec.ts`)

- ✅ **16 tests**: 13 validation + 3 API-dependent
- Tests basic initialization, configuration validation, and core functionality
- **API Tests**: Document indexing, context enhancement, integration workflows

### 🔍 Edge Cases (`LangChainContextEnhancer.edge-cases.spec.ts`)

- ✅ **17 tests**: 10 validation + 7 API-dependent
- Tests error handling, empty documents, extreme configurations
- **API Tests**: Low/high similarity thresholds, context building edge cases

### 🩺 Diagnostics (`LangChainContextEnhancer.diagnostic.spec.ts`)

- ✅ **8 tests**: 3 validation + 5 API-dependent
- Tests API call tracking, error handling, vector quality validation
- **API Tests**: Real OpenAI API integration, embedding validation, error scenarios

### 🎯 Integration (`LangChainContextEnhancer.integration.spec.ts`)

- ✅ **7 tests**: 1 validation + 6 API-dependent
- Comprehensive real-world scenarios with actual OpenAI API calls
- **API Tests**: Document indexing, similarity search, query types, error handling

## Expected Results

### Without API Key (Validation Mode)

```
Test Files  4 passed (4)
Tests       27 passed | 21 skipped (48)
```

### With API Key (Full Integration)

```
Test Files  4 passed (4)
Tests       48 passed | 0 skipped (48)
```

## API Usage & Costs

### Cost Estimates

- **Model**: `text-embedding-3-small` (cost-effective)
- **Test run**: ~$0.01-0.05 USD (varies by workspace size)
- **Embeddings**: Small test documents, minimal API calls

### API Call Breakdown

1. **Document Indexing**: `embedDocuments()` - Creates vectors for test documents
2. **Query Processing**: `embedQuery()` - Creates vectors for search queries
3. **Similarity Search**: Local cosine similarity (no additional API calls)

## Production Integration

The tests validate the **production-ready** LangChain integration:

- ✅ **Real OpenAI embeddings** (text-embedding-3-small)
- ✅ **Production vector store** implementation
- ✅ **Error handling & graceful degradation**
- ✅ **Dynamic configuration updates**
- ✅ **VS Code settings integration**

## Troubleshooting

### Common Issues

#### "All tests skipped"

**Solution**: Set `OPENAI_API_KEY` or `TEST_OPENAI_API_KEY` environment variable

#### "OpenAI API key is required"

**Solution**: Check API key format (should start with `sk-`)

#### API rate limits

**Solution**: Tests use small documents and minimal calls, but wait between runs if needed

#### Network/API errors

**Solution**: Tests include error handling validation - failures are expected for invalid keys

## VS Code Settings Integration

The tests also validate the VS Code configuration:

```json
{
	"kilo-code.langchain.enabled": true,
	"kilo-code.langchain.openaiApiKey": "your-key-here",
	"kilo-code.langchain.chunkSize": 1000,
	"kilo-code.langchain.chunkOverlap": 200,
	"kilo-code.langchain.maxContextFiles": 10,
	"kilo-code.langchain.similarityThreshold": 0.7,
	"kilo-code.langchain.modelName": "text-embedding-3-small"
}
```

## Security Notes

- API keys are only used for testing - never committed to code
- Tests use minimal API calls to reduce costs
- Error handling ensures graceful failure without exposing keys
- Environment variables are the recommended approach for key management

---

**Ready to test?** Set your `OPENAI_API_KEY` and run the full test suite! 🚀
