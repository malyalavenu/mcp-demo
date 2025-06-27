# MCP Demo - TypeScript Implementation

This is a TypeScript implementation of the **MCP: Build Rich-Context AI Apps with Anthropic** course from [DeepLearning.AI](https://learn.deeplearning.ai/courses/mcp-build-rich-context-ai-apps-with-anthropic).

## Overview

This project demonstrates the Model Context Protocol (MCP) implementation with streamable HTTP capabilities. MCP is an open protocol that standardizes how LLM applications can access context through tools and data resources using a client-server architecture.

**⚠️ This project is for educational and demo purposes only.**

## Features

- MCP client-server architecture implementation
- Streamable HTTP communication
- arXiv paper search functionality
- Paper information extraction
- Tool selection and argument extraction
- Prompt template management

## Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- Anthropic API key

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp-demo
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```bash
   ANTHROPIC_API_KEY=<your_anthropic_api_key_here>
   ```
   
   **Important:** Replace `<your_anthropic_api_key_here>` with your actual Anthropic API key.

4. **Build the project**
   ```bash
   yarn build
   ```

## Project Structure

```
mcp-demo/
├── src/
│   ├── client.ts      # MCP client implementation
│   ├── server.ts      # MCP server implementation
│   └── index.ts       # Core functionality and utilities
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── yarn.lock          # Locked dependencies
└── README.md          # This file
```

## Usage

### Starting the MCP Server
```bash
yarn start:server
```

### Starting the MCP Client
```bash
yarn start:client
```

### Running Both (Development)
```bash
yarn dev
```

## Available Tools

The MCP server provides the following tools:

1. **`search_papers`** - Search for papers on arXiv
   - Arguments:
     - `topic` (string): The topic to search for
     - `max_results` (number, optional): Maximum number of results (default: 5)

2. **`extract_info`** - Extract information from a specific paper
   - Arguments:
     - `paper_id` (string): The ID of the paper to look for

## API Reference

### `search_papers(topic: string, max_results?: number)`
Searches for papers on arXiv based on a topic and returns their information.

### `extract_info(paper_id: string)`
Searches for information about a specific paper by ID from arXiv.

### `getToolSelectionPrompt(toolList: string, userQuery: string)`
Generates a detailed prompt for tool selection and argument extraction.

## Course Reference

This implementation is based on the **MCP: Build Rich-Context AI Apps with Anthropic** course by DeepLearning.AI in partnership with Anthropic. The course covers:

- Core concepts of MCP
- Client-server architecture
- Building MCP-compatible applications
- Connecting to third-party servers
- Deploying MCP servers remotely

For the complete course content, visit: [https://learn.deeplearning.ai/courses/mcp-build-rich-context-ai-apps-with-anthropic](https://learn.deeplearning.ai/courses/mcp-build-rich-context-ai-apps-with-anthropic)

## Contributing

This is a demo project for educational purposes. Feel free to experiment and modify the code to learn more about MCP implementation.

## License

This project is for educational purposes only. Please refer to the original course materials for licensing information.

## Support

For questions about the MCP protocol or the original course, please refer to:
- [MCP Documentation](https://modelcontextprotocol.io/)
- [DeepLearning.AI Course](https://learn.deeplearning.ai/courses/mcp-build-rich-context-ai-apps-with-anthropic)
- [Anthropic Documentation](https://docs.anthropic.com/) 