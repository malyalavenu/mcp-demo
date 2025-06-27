import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { search_papers, extract_info } from './index.js';

const app = express();
app.use(express.json());

// Create MCP server
const server = new McpServer({
  name: 'arxiv-paper-search',
  version: '1.0.0'
});

// Define tool schemas
const searchPapersSchema = {
  name: z.string().describe('Topic to search for'),
  max_results: z.number().optional().describe('Maximum number of results to return')
};

const extractInfoSchema = {
  paper_id: z.string().describe('ID of the paper to extract information from')
};

// Register tools
server.tool(
  'search_papers',
  'Search for papers on arXiv based on a topic',
  searchPapersSchema,
  async ({ name: topic, max_results }) => {
    try {
      const results = await search_papers(topic, max_results);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    } catch (error: any) {
      throw new Error(`Failed to search papers: ${error.message}`);
    }
  }
);

server.tool(
  'extract_info',
  'Extract information from a specific paper',
  extractInfoSchema,
  async ({ paper_id }) => {
    try {
      const info = await extract_info(paper_id);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(info, null, 2)
          }
        ]
      };
    } catch (error: any) {
      throw new Error(`Failed to extract paper info: ${error.message}`);
    }
  }
);

// Map to store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

// MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          console.log(`Session initialized with ID: ${sid}`);
          transports[sid] = transport;
        }
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}, removing from transports map`);
          delete transports[sid];
        }
      };

      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

// Handle GET requests for SSE streams
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Handle DELETE requests for session termination
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error handling session termination:', error);
    if (!res.headersSent) {
      res.status(500).send('Error processing session termination');
    }
  }
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  console.log('Server shutdown complete');
  process.exit(0);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`MCP Server listening on port ${PORT}`);
}); 