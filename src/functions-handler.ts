import { OAuth2Manager } from './oauth.js';
import { MiroClient } from './miro-client.js';
import { handleToolCall, TOOL_DEFINITIONS } from './tools.js';
import { existsSync, readFileSync } from 'fs';

// JSON-RPC types
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id: string | number | null;
}

// Scaleway Functions event structure
interface ScalewayEvent {
  httpMethod: string;
  path: string;
  body?: string;
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
}

interface ScalewayContext {
  requestId: string;
  functionName: string;
  functionVersion: string;
}

interface ApiResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

// JSON-RPC helpers
function jsonRpcSuccess(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', result, id };
}

function jsonRpcError(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', error: { code, message }, id };
}

function apiResponse(statusCode: number, body: unknown): ApiResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  };
}

/**
 * Token file path - mount a volume here for persistence across restarts
 */
const TOKEN_FILE = process.env.TOKEN_FILE || '/data/tokens.json';

/**
 * External base URI for this MCP (used for OAuth callback)
 * Example: https://gateway.example.com/mcp/miro
 */
const BASE_URI = process.env.BASE_URI || 'http://localhost:3000';

const OAUTH_REDIRECT_URI = `${BASE_URI}/oauth/callback`;

/**
 * Initialize OAuth - tries token file first, falls back to env vars
 */
async function initializeOAuth(
  clientId: string,
  clientSecret: string
): Promise<OAuth2Manager> {
  const oauth = new OAuth2Manager(
    clientId,
    clientSecret,
    OAUTH_REDIRECT_URI,
    TOKEN_FILE
  );

  // Priority 1: Token file (persisted, survives restarts)
  if (existsSync(TOKEN_FILE)) {
    try {
      const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf-8'));
      if (data.access_token) {
        await oauth.setTokens(data.access_token, data.refresh_token || '', 3600);
        console.log(`[OAuth] Loaded tokens from ${TOKEN_FILE}`);
        return oauth;
      }
    } catch (e) {
      console.warn(`[OAuth] Failed to read ${TOKEN_FILE}, trying env vars`);
    }
  }

  // Priority 2: Environment variables (initial bootstrap)
  const accessTokenB64 = process.env.MIRO_ACCESS_TOKEN_B64;
  const refreshTokenB64 = process.env.MIRO_REFRESH_TOKEN_B64;

  if (!accessTokenB64) {
    throw new Error('No tokens: neither TOKEN_FILE nor MIRO_ACCESS_TOKEN_B64 available');
  }

  const accessToken = Buffer.from(accessTokenB64, 'base64').toString('utf-8');
  const refreshToken = refreshTokenB64
    ? Buffer.from(refreshTokenB64, 'base64').toString('utf-8')
    : '';

  await oauth.setTokens(accessToken, refreshToken, 3600);
  console.log('[OAuth] Initialized from env vars, will persist to', TOKEN_FILE);
  return oauth;
}

class MiroFunctionHandler {
  private miroClient: MiroClient | null = null;
  private initialized = false;

  async initializeMiroClient(): Promise<boolean> {
    if (this.initialized && this.miroClient) return true;

    try {
      const clientIdB64 = process.env.MIRO_CLIENT_ID_B64;
      const clientSecretB64 = process.env.MIRO_CLIENT_SECRET_B64;

      if (!clientIdB64 || !clientSecretB64) {
        throw new Error('MIRO_CLIENT_ID_B64 or MIRO_CLIENT_SECRET_B64 not set');
      }

      const clientId = Buffer.from(clientIdB64, 'base64').toString('utf-8');
      const clientSecret = Buffer.from(clientSecretB64, 'base64').toString('utf-8');

      const oauth = await initializeOAuth(clientId, clientSecret);

      if (!oauth.hasTokens()) {
        throw new Error('No Miro tokens available');
      }

      this.miroClient = new MiroClient(oauth);

      if (!await this.miroClient.verifyAuth()) {
        throw new Error('Miro authentication failed');
      }

      this.initialized = true;
      console.log('✅ Miro API initialized');
      return true;
    } catch (error) {
      console.error('❌ Miro init failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  async handleRequest(event: ScalewayEvent): Promise<ApiResponse> {
    const { httpMethod, path, body } = event;
    console.log(`[Handler] ${httpMethod} ${path}`);

    // Health check
    if (path === '/health' && httpMethod === 'GET') {
      // Check if tokens exist (without making API call)
      const hasTokens = existsSync(TOKEN_FILE);
      const isAuth = hasTokens || (this.miroClient ? await this.miroClient.verifyAuth() : false);
      return apiResponse(200, {
        status: 'ok',
        service: 'miro-mcp',
        authenticated: isAuth,
        tools: TOOL_DEFINITIONS.length,
      });
    }

    // MCP JSON-RPC endpoint
    if (path === '/mcp' && httpMethod === 'POST') {
      if (!body) {
        return apiResponse(400, jsonRpcError(null, -32600, 'Empty request body'));
      }

      let request: JsonRpcRequest;
      try {
        request = JSON.parse(body);
      } catch {
        return apiResponse(400, jsonRpcError(null, -32700, 'Parse error'));
      }

      const { method, params, id } = request;

      // Handle MCP methods
      if (method === 'initialize') {
        return apiResponse(200, jsonRpcSuccess(id, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'miro-mcp', version: '0.1.0' },
          capabilities: { tools: {} },
        }));
      }

      if (method === 'notifications/initialized') {
        return apiResponse(200, jsonRpcSuccess(id, {}));
      }

      if (method === 'tools/list') {
        return apiResponse(200, jsonRpcSuccess(id, { tools: TOOL_DEFINITIONS }));
      }

      if (method === 'tools/call') {
        // Initialize Miro client if needed
        if (!this.initialized) {
          const success = await this.initializeMiroClient();
          if (!success) {
            return apiResponse(200, jsonRpcError(id, -32603, 'Failed to initialize Miro API'));
          }
        }

        const toolName = (params as { name?: string })?.name;
        const toolArgs = (params as { arguments?: Record<string, unknown> })?.arguments || {};

        if (!toolName) {
          return apiResponse(200, jsonRpcError(id, -32602, 'Missing tool name'));
        }

        const toolExists = TOOL_DEFINITIONS.some(t => t.name === toolName);
        if (!toolExists) {
          return apiResponse(200, jsonRpcError(id, -32601, `Unknown tool: ${toolName}`));
        }

        try {
          const result = await handleToolCall(toolName, toolArgs, this.miroClient!);
          return apiResponse(200, jsonRpcSuccess(id, result));
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Tool execution failed';
          return apiResponse(200, jsonRpcError(id, -32603, msg));
        }
      }

      return apiResponse(200, jsonRpcError(id, -32601, `Method not found: ${method}`));
    }

    // OAuth: Start authorization flow
    if (path === '/oauth/authorize' && httpMethod === 'GET') {
      const clientIdB64 = process.env.MIRO_CLIENT_ID_B64;
      if (!clientIdB64) {
        return apiResponse(500, { error: 'MIRO_CLIENT_ID_B64 not configured' });
      }
      const clientId = Buffer.from(clientIdB64, 'base64').toString('utf-8');

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: OAUTH_REDIRECT_URI,
      });

      const authUrl = `https://miro.com/oauth/authorize?${params.toString()}`;

      return {
        statusCode: 302,
        body: '',
        headers: { Location: authUrl, 'Content-Type': 'text/plain' },
      };
    }

    // OAuth: Handle callback with authorization code
    if (path === '/oauth/callback' && httpMethod === 'GET') {
      const code = event.queryStringParameters?.code;
      const error = event.queryStringParameters?.error;

      if (error) {
        return apiResponse(400, { error: `OAuth error: ${error}` });
      }

      if (!code) {
        return apiResponse(400, { error: 'Missing authorization code' });
      }

      const clientIdB64 = process.env.MIRO_CLIENT_ID_B64;
      const clientSecretB64 = process.env.MIRO_CLIENT_SECRET_B64;

      if (!clientIdB64 || !clientSecretB64) {
        return apiResponse(500, { error: 'OAuth credentials not configured' });
      }

      const clientId = Buffer.from(clientIdB64, 'base64').toString('utf-8');
      const clientSecret = Buffer.from(clientSecretB64, 'base64').toString('utf-8');

      try {
        const oauth = new OAuth2Manager(clientId, clientSecret, OAUTH_REDIRECT_URI, TOKEN_FILE);
        await oauth.exchangeCodeForToken(code);

        // Reset initialized state so next request uses new tokens
        this.initialized = false;
        this.miroClient = null;

        return apiResponse(200, {
          success: true,
          message: 'Miro authorization successful. Tokens have been saved.',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Token exchange failed';
        return apiResponse(500, { error: msg });
      }
    }

    return apiResponse(404, { error: 'Not found' });
  }
}

const miroHandler = new MiroFunctionHandler();

export const handler = async (event: ScalewayEvent, context: ScalewayContext): Promise<ApiResponse> => {
  console.log(`🚀 MCP Miro [${context.requestId}] ${event.httpMethod} ${event.path}`);
  return await miroHandler.handleRequest(event);
};
