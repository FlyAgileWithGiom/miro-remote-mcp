#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { OAuth2Manager } from './oauth.js';
import { MiroClient } from './miro-client.js';
import { TOOL_DEFINITIONS, handleToolCall } from './tools.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const REQUIRED_ENV_VARS = ['MIRO_CLIENT_ID', 'MIRO_CLIENT_SECRET'];
for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} environment variable is required`);
    process.exit(1);
  }
}

// Initialize OAuth2 manager
const oauth = new OAuth2Manager(
  process.env.MIRO_CLIENT_ID!,
  process.env.MIRO_CLIENT_SECRET!,
  process.env.MIRO_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
  process.env.TOKEN_FILE || 'tokens.json'
);

// Set initial tokens if provided in environment
if (process.env.MIRO_ACCESS_TOKEN && process.env.MIRO_REFRESH_TOKEN) {
  await oauth.setTokens(
    process.env.MIRO_ACCESS_TOKEN,
    process.env.MIRO_REFRESH_TOKEN
  );
}

// Initialize Miro client
const miroClient = new MiroClient(oauth);

// Create MCP server
const server = new Server(
  {
    name: 'miro-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOL_DEFINITIONS,
  };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[MCP] Tool called: ${name}`);
  console.error(`[MCP] Arguments:`, JSON.stringify(args, null, 2));

  try {
    const result = await handleToolCall(name, args || {}, miroClient);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    console.error(`[MCP] Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  console.error('[MCP] Starting Miro MCP Server...');

  // Verify authentication
  try {
    const isValid = await miroClient.verifyAuth();
    if (isValid) {
      console.error('[MCP] Authentication verified successfully');
    } else {
      console.error('[MCP] Warning: Authentication failed. OAuth flow may be needed.');
    }
  } catch (error) {
    console.error('[MCP] Warning: Failed to verify authentication. OAuth flow may be needed.');
    console.error('[MCP] Error:', error);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Server started successfully');
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
