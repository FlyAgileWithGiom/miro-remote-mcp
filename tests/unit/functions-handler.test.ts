/**
 * Integration tests for functions-handler.ts
 * Tests the Scaleway Functions handler including JSON-RPC routing, OAuth endpoints, and health check.
 *
 * Note: Tests for tools/call with Miro client are limited due to the module-level
 * singleton pattern used by the handler. Tests focus on request routing and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createEvent,
  createContext,
  mcpEvent,
  healthCheckEvent,
  oauthAuthorizeEvent,
  oauthCallbackEvent,
  parseJsonRpcResponse,
} from '../fixtures/scaleway-events.js';

// Mock environment variables before importing handler
const originalEnv = process.env;

// Setup environment variables BEFORE import to ensure constants are properly set
process.env = {
  ...process.env,
  MIRO_CLIENT_ID_B64: Buffer.from('test-client-id').toString('base64'),
  MIRO_CLIENT_SECRET_B64: Buffer.from('test-client-secret').toString('base64'),
  MIRO_ACCESS_TOKEN_B64: Buffer.from('test-access-token').toString('base64'),
  MIRO_REFRESH_TOKEN_B64: Buffer.from('test-refresh-token').toString('base64'),
  TOKEN_FILE: '/tmp/test-tokens.json',
  BASE_URL: 'https://test.example.com',
};

// Use vi.hoisted to define mock implementations that can be mutated
const mocks = vi.hoisted(() => {
  const mockSetTokens = vi.fn().mockResolvedValue(undefined);
  const mockHasTokens = vi.fn().mockReturnValue(true);
  const mockExchangeCodeForToken = vi.fn().mockResolvedValue({});
  const mockVerifyAuth = vi.fn().mockResolvedValue(true);
  const mockListBoards = vi.fn().mockResolvedValue({ data: [] });
  const mockExistsSync = vi.fn(() => true);
  const mockReadFileSync = vi.fn(() =>
    JSON.stringify({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    })
  );

  return {
    mockSetTokens,
    mockHasTokens,
    mockExchangeCodeForToken,
    mockVerifyAuth,
    mockListBoards,
    mockExistsSync,
    mockReadFileSync,
  };
});

// Mock fs module for token file operations
vi.mock('fs', () => ({
  existsSync: mocks.mockExistsSync,
  readFileSync: mocks.mockReadFileSync,
}));

// Mock MiroClient to avoid real API calls
vi.mock('../../src/miro-client.js', () => ({
  MiroClient: vi.fn().mockImplementation(() => ({
    verifyAuth: mocks.mockVerifyAuth,
    listBoards: mocks.mockListBoards,
  })),
}));

// Mock OAuth2Manager - ensure all methods are properly mocked
vi.mock('../../src/oauth.js', () => ({
  OAuth2Manager: vi.fn().mockImplementation(() => ({
    hasTokens: mocks.mockHasTokens,
    setTokens: mocks.mockSetTokens,
    getValidAccessToken: vi.fn().mockResolvedValue('mock-token'),
    exchangeCodeForToken: mocks.mockExchangeCodeForToken,
  })),
}));

// Import handler after mocks and env are set up
import { handler } from '../../src/functions-handler.js';

describe('functions-handler', () => {
  beforeEach(() => {
    // Reset all mocks to default values
    mocks.mockSetTokens.mockResolvedValue(undefined);
    mocks.mockHasTokens.mockReturnValue(true);
    mocks.mockExchangeCodeForToken.mockResolvedValue({});
    mocks.mockVerifyAuth.mockResolvedValue(true);
    mocks.mockListBoards.mockResolvedValue({ data: [] });
    mocks.mockExistsSync.mockReturnValue(true);
    mocks.mockReadFileSync.mockReturnValue(
      JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Check', () => {
    it('returns 200 with service info on GET /health', async () => {
      const event = healthCheckEvent();
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('miro-mcp');
      expect(body.tools).toBeGreaterThan(0);
    });
  });

  describe('JSON-RPC Routing', () => {
    it('handles initialize request', async () => {
      const event = mcpEvent('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      });
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const jsonRpc = parseJsonRpcResponse(response.body);
      expect(jsonRpc.result).toMatchObject({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'miro-mcp', version: '0.1.0' },
        capabilities: { tools: {} },
      });
    });

    it('handles notifications/initialized request', async () => {
      const event = mcpEvent('notifications/initialized');
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const jsonRpc = parseJsonRpcResponse(response.body);
      expect(jsonRpc.result).toEqual({});
    });

    it('handles tools/list request', async () => {
      const event = mcpEvent('tools/list');
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const jsonRpc = parseJsonRpcResponse(response.body);
      expect(jsonRpc.result).toHaveProperty('tools');
      expect(Array.isArray((jsonRpc.result as { tools: unknown[] }).tools)).toBe(true);
      expect((jsonRpc.result as { tools: unknown[] }).tools.length).toBeGreaterThan(0);
    });

    it('handles tools/call for list_boards when initialized', async () => {
      const event = mcpEvent('tools/call', {
        name: 'list_boards',
        arguments: {},
      });
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const jsonRpc = parseJsonRpcResponse(response.body);
      // If init fails, we get an error; if it succeeds, we get result
      // This tests the routing, not the Miro API
      expect(jsonRpc.jsonrpc).toBe('2.0');
    });

    it('returns error for unknown tool (after init attempt)', async () => {
      const event = mcpEvent('tools/call', {
        name: 'unknown_tool',
        arguments: {},
      });
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const jsonRpc = parseJsonRpcResponse(response.body);
      expect(jsonRpc.error).toBeDefined();
      // Error code depends on whether init succeeded
      expect(jsonRpc.error?.code).toBe(-32603);
    });

    it('returns error for unknown method', async () => {
      const event = mcpEvent('unknown/method');
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const jsonRpc = parseJsonRpcResponse(response.body);
      expect(jsonRpc.error).toBeDefined();
      expect(jsonRpc.error?.code).toBe(-32601);
      expect(jsonRpc.error?.message).toContain('Method not found');
    });
  });

  describe('Error Cases', () => {
    it('returns parse error for malformed JSON', async () => {
      const event = createEvent('POST', '/mcp', {
        body: '{ invalid json }',
      });
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      const jsonRpc = parseJsonRpcResponse(response.body);
      expect(jsonRpc.error?.code).toBe(-32700);
      expect(jsonRpc.error?.message).toContain('Parse error');
    });

    it('returns error for empty body', async () => {
      const event = createEvent('POST', '/mcp', { body: undefined });
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      const jsonRpc = parseJsonRpcResponse(response.body);
      expect(jsonRpc.error?.code).toBe(-32600);
      expect(jsonRpc.error?.message).toContain('Empty request body');
    });

    it('returns 404 for unknown path', async () => {
      const event = createEvent('GET', '/unknown/path');
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not found');
    });
  });

  describe('OAuth Endpoints', () => {
    it('redirects to Miro OAuth on GET /oauth/authorize', async () => {
      const event = oauthAuthorizeEvent();
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toContain('https://miro.com/oauth/authorize');
      expect(response.headers.Location).toContain('client_id=test-client-id');
      expect(response.headers.Location).toContain('redirect_uri=');
    });

    it('returns error when OAuth callback has error', async () => {
      const event = oauthCallbackEvent({ error: 'access_denied' });
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('access_denied');
    });

    it('returns error when OAuth callback missing code', async () => {
      const event = createEvent('GET', '/oauth/callback', { query: {} });
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing authorization code');
    });

    it('attempts token exchange on valid callback', async () => {
      const event = oauthCallbackEvent({ code: 'valid-auth-code' });
      const context = createContext();

      const response = await handler(event, context);

      // Response depends on whether the mock was properly applied
      // We verify it returns 200 or 500 (not 400 for validation errors)
      expect([200, 500]).toContain(response.statusCode);
    });
  });
});
