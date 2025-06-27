import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import readline from 'readline';
import Anthropic from '@anthropic-ai/sdk';
import { getToolSelectionPrompt } from './index.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

async function askLLM(userQuery: string, tools: any[]): Promise<{ tool: string; arguments: any }> {
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  
  // Create a detailed tool list with exact argument specifications
  const toolList = tools.map((t: any) => {
    const args = t.inputSchema?.properties ? 
      Object.entries(t.inputSchema.properties).map(([key, prop]: [string, any]) => 
        `${key} (${prop.type}${prop.description ? `: ${prop.description}` : ''}${t.inputSchema.required && t.inputSchema.required.includes(key) ? ', required' : ', optional'})`
      ).join(', ') : 'no arguments';
    return `- ${t.name}: ${t.description || ''} - Arguments: { ${args} }`;
  }).join('\n');

  // Use the imported prompt template
  const prompt = getToolSelectionPrompt(toolList, userQuery);

  const message = await anthropic.messages.create({
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 1000,
    messages: [
      { role: 'user', content: prompt }
    ]
  });
  
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Failed to parse LLM output: ' + text);
  }
}

async function main() {
  // Set up the MCP client
  const serverUrl = 'http://localhost:3000/mcp';
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  const client = new Client({ name: 'example-client', version: '1.0.0' });

  // Connect to the server
  await client.connect(transport);
  console.log('Connected to MCP server.');

  // List available tools
  const toolsRaw = await client.listTools();
  console.log('Raw tools response:', JSON.stringify(toolsRaw, null, 2));
  
  // Handle different possible formats of tools response
  let toolsArr: any[] = [];
  if (toolsRaw && typeof toolsRaw === 'object' && 'tools' in toolsRaw) {
    // Handle nested structure: { tools: [...] }
    toolsArr = Array.isArray(toolsRaw.tools) ? toolsRaw.tools : [];
  } else if (Array.isArray(toolsRaw)) {
    // Handle direct array
    toolsArr = toolsRaw;
  } else if (toolsRaw && typeof toolsRaw === 'object') {
    // Handle object with tool properties
    toolsArr = Object.values(toolsRaw);
  } else {
    console.error('Unexpected tools format:', typeof toolsRaw);
    return;
  }

  // Filter out any undefined or null tools and ensure proper structure
  toolsArr = toolsArr.filter(tool => tool && typeof tool === 'object' && tool.name);
  
  console.log('Available tools:');
  toolsArr.forEach((tool, index) => {
    console.log(`${index + 1}. ${tool.name}: ${tool.description || 'No description'}`);
  });

  if (toolsArr.length === 0) {
    console.error('No tools available. Please check if the server is running and has registered tools.');
    return;
  }

  // Set up readline for chatbot loop
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  async function promptUser(query: string): Promise<string> {
    return new Promise((resolve) => rl.question(query, resolve));
  }

  while (true) {
    const userInput = await promptUser('\nAsk me anything (or type "exit" to quit): ');
    const trimmedInput = userInput.trim().toLowerCase();
    if (trimmedInput === 'exit' || trimmedInput === 'quit') break;
    try {
      const { tool, arguments: toolArgs } = await askLLM(userInput, toolsArr);
      if (!tool || !toolsArr.some(t => t.name === tool)) {
        console.log('No suitable tool found for your query.');
        continue;
      }
      console.log(`\nLLM selected tool: ${tool}`);
      console.log('With arguments:', toolArgs);
      const result = await client.callTool({ name: tool, arguments: toolArgs });
      console.log('\nTool result:');
      console.dir(result, { depth: null });
    } catch (err) {
      console.error('Error:', err);
    }
  }

  rl.close();
  console.log('Client finished.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Client error:', err);
  process.exit(1);
}); 