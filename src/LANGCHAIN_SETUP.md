# LangChain Integration Setup

## Overview

Kilo Code includes optional LangChain integration for enhanced context-aware code suggestions. This feature uses OpenAI embeddings to provide more relevant code context from your workspace.

## Configuration

To enable LangChain integration, configure the following settings in your VS Code settings:

### Required Settings

- `kilo-code.langchain.enabled`: Enable/disable LangChain integration (default: false)
- `kilo-code.langchain.openaiApiKey`: Your OpenAI API key (can also be set via `OPENAI_API_KEY` environment variable)

### Optional Settings

- `kilo-code.langchain.chunkSize`: Size of text chunks for processing (default: 1000, range: 100-4000)
- `kilo-code.langchain.chunkOverlap`: Overlap between text chunks (default: 200, range: 0-1000)
- `kilo-code.langchain.maxContextFiles`: Maximum files to include in analysis (default: 10, range: 1-50)
- `kilo-code.langchain.similarityThreshold`: Minimum similarity for relevant code (default: 0.7, range: 0.0-1.0)
- `kilo-code.langchain.modelName`: OpenAI embedding model to use (default: "text-embedding-3-small")

## Setup Instructions

1. **Get an OpenAI API Key**: Visit [OpenAI API](https://platform.openai.com/api-keys) to generate an API key

2. **Configure in VS Code**: 
   - Open VS Code Settings (Ctrl/Cmd + ,)
   - Search for "kilo-code.langchain"
   - Set `enabled` to `true`
   - Add your OpenAI API key to `openaiApiKey`

3. **Environment Variable** (alternative):
   - Set the `OPENAI_API_KEY` environment variable
   - Restart VS Code

## Features

When enabled, LangChain integration provides:

- **Enhanced Context Awareness**: Finds relevant code from your workspace based on semantic similarity
- **Smart Code Suggestions**: Uses context from related files to provide better suggestions
- **Automatic Indexing**: Indexes your workspace documents automatically
- **Real-time Updates**: Configuration changes apply without restart

## Troubleshooting

### Common Issues

1. **"OpenAI API key is required"**: Ensure you've set the API key in settings or environment variables
2. **Configuration validation errors**: Check that numeric settings are within valid ranges
3. **Performance issues**: Reduce `maxContextFiles` or `chunkSize` if experiencing slowdowns

### Error Handling

The system gracefully degrades if LangChain is unavailable - code suggestions continue to work without enhanced context.

## Architecture

The LangChain integration consists of:

- `LangChainContextEnhancer`: Core enhancement logic with OpenAI embeddings
- `ProductionMemoryVectorStore`: In-memory vector store for document similarity
- `GhostContext`: Integration point with the existing context system
- Configuration listeners for dynamic updates

## Cost Considerations

- Uses OpenAI's text-embedding-3-small model by default (cost-effective)
- Embedding costs depend on workspace size and activity
- Consider adjusting `maxContextFiles` to manage costs