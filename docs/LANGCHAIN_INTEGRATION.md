# LangChain Integration for Context Awareness

This document describes the LangChain integration added to Kilo Code for enhanced context awareness in code suggestions.

## Overview

The LangChain integration provides an optional enhancement to the existing Ghost suggestion system. It adds semantic context understanding by indexing workspace documents and providing relevant code chunks during suggestion generation.

## Key Features

- **Non-breaking integration**: The existing context system continues to work unchanged
- **Optional enhancement**: Can be enabled/disabled via VS Code settings
- **Semantic code search**: Uses text similarity to find relevant code chunks
- **Context-aware prompts**: Enhances AI prompts with related code from other files

## Architecture

### Core Components

1. **LangChainContextEnhancer**: Main service that handles document indexing and context enhancement
2. **SimpleMemoryVectorStore**: Lightweight in-memory vector store for semantic search
3. **Enhanced GhostContext**: Extended to optionally provide LangChain-enhanced context
4. **Updated PromptStrategyManager**: Incorporates enhanced context into AI prompts

### Integration Points

The integration hooks into the existing system at these points:

- `GhostContext.generate()`: Indexes workspace documents when LangChain is enabled
- `GhostContext.getEnhancedContext()`: New method to get LangChain-enhanced context
- `PromptStrategyManager.buildPrompt()`: Accepts optional enhanced context parameter
- `GhostProvider.provideCodeSuggestions()`: Uses enhanced context when available

## Configuration

Add these settings to VS Code settings.json:

```json
{
  "kilo-code.langchain.enabled": false,
  "kilo-code.langchain.chunkSize": 1000,
  "kilo-code.langchain.maxContextFiles": 10
}
```

### Settings

- `enabled`: Enable/disable LangChain context enhancement (default: false)
- `chunkSize`: Size of text chunks for processing (default: 1000)
- `maxContextFiles`: Maximum number of files to include in analysis (default: 10)

## How It Works

1. **Document Indexing**: When enabled, workspace documents are split into chunks and indexed
2. **Semantic Search**: When generating suggestions, the system searches for relevant code chunks
3. **Context Enhancement**: Relevant chunks are added to the AI prompt for better context
4. **Backward Compatibility**: If disabled or if it fails, the system works exactly as before

## Example Enhanced Prompt

When LangChain finds relevant context, it enhances the prompt like this:

```
[Original system prompt]

## Additional Context from LangChain Analysis
Context Summary: Current file: test.ts. Found 2 relevant code chunks. Related files: utils.ts, types.ts

### Related Code 1 (utils.ts):
```
function validateInput(input: string): boolean {
  return input.length > 0 && input.trim() !== '';
}
```

### Related Code 2 (types.ts):
```
interface UserInput {
  value: string;
  isValid: boolean;
}
```
```

## Benefits

- **Better Context Understanding**: AI can see related code from other files
- **Improved Suggestions**: More relevant and consistent code completions
- **Safe Integration**: Does not break existing functionality
- **Performance Conscious**: Only processes when needed and limits file count

## Limitations

- **Simple Similarity**: Currently uses basic text matching (can be upgraded to real embeddings)
- **Memory Storage**: Vector store is in-memory only (resets on restart)
- **File Limit**: Processes a limited number of files to maintain performance

## Future Enhancements

1. **Real Embeddings**: Integrate with actual embedding models for better semantic understanding
2. **Persistent Storage**: Save indexed documents to disk for faster startup
3. **Advanced Filtering**: Smart file filtering based on relevance and language
4. **Configuration UI**: Visual interface for configuration management

## Development Notes

All changes are marked with `// kilocode_change` comments for easy identification during merges with the Roo codebase.

The integration is designed to be minimal and surgical, adding functionality without modifying existing interfaces or breaking existing behavior.