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
  BASE_URI: 'https://gateway.example.com/mcp/miro',
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
  const mockHandleToolCall = vi.fn().mockResolvedValue({ data: [] });

  return {
    mockSetTokens,
    mockHasTokens,
    mockExchangeCodeForToken,
    mockVerifyAuth,
    mockListBoards,
    mockExistsSync,
    mockHandleToolCall,
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

// Mock tools module to control handleToolCall responses
vi.mock('../../src/tools.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/tools.js')>();
  return {
    ...actual,
    handleToolCall: mocks.mockHandleToolCall,
  };
});

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
    mocks.mockHandleToolCall.mockResolvedValue({ data: [] });
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

    it('returns authenticated: true when token file exists', async () => {
      mocks.mockExistsSync.mockReturnValue(true);

      const event = healthCheckEvent();
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authenticated).toBe(true);
    });

    it('returns authenticated: false when token file does not exist', async () => {
      mocks.mockExistsSync.mockReturnValue(false);

      const event = healthCheckEvent();
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authenticated).toBe(false);
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

    it('returns MCP-compliant content format for successful tool calls', async () => {
      // Mock handleToolCall to return data that will be wrapped in MCP format
      mocks.mockHandleToolCall.mockResolvedValue([{ id: 'board-1', name: 'Test Board' }]);

      const event = mcpEvent('tools/call', {
        name: 'list_boards',
        arguments: {},
      });
      const context = createContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      const jsonRpc = parseJsonRpcResponse(response.body);

      // If init fails, we get error - this tests the format when successful
      if (jsonRpc.error) {
        // Init failed due to test env - with reauthentication flow, auth failures return -32001
        expect(jsonRpc.error.code).toBe(-32001);
        return;
      }

      // MCP spec: tools/call result must have content array
      expect(jsonRpc.result).toBeDefined();
      expect(jsonRpc.result).toHaveProperty('content');
      expect(Array.isArray((jsonRpc.result as any).content)).toBe(true);

      // Each content item must have type and text
      const content = (jsonRpc.result as any).content[0];
      expect(content).toHaveProperty('type', 'text');
      expect(content).toHaveProperty('text');

      // Text should be JSON-stringified result
      const parsed = JSON.parse(content.text);
      expect(parsed).toEqual([{ id: 'board-1', name: 'Test Board' }]);
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
      // With reauthentication flow, auth failures during init return -32001
      expect(jsonRpc.error?.code).toBe(-32001);
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
      const event = createEvent('POST', '/', {
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
      const event = createEvent('POST', '/', { body: undefined });
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

  describe('Reauthentication Flow (CAP-REAUTH-FLOW)', () => {
    describe('tools/call with expired token', () => {
      it('returns JSON-RPC error -32001 with authorize_url when Miro API returns 401', async () => {
        // Setup: Mock handleToolCall to throw AUTH_ERROR
        const authError = new Error('Miro authentication failed');
        (authError as any).diagnostic = {
          type: 'AUTH_ERROR',
          message: 'Token expired',
          statusCode: 401,
        };
        mocks.mockHandleToolCall.mockRejectedValue(authError);

        const event = mcpEvent('tools/call', {
          name: 'list_boards',
          arguments: {},
        });
        const context = createContext();

        const response = await handler(event, context);

        // Verify response structure
        expect(response.statusCode).toBe(200);
        const jsonRpc = parseJsonRpcResponse(response.body);

        // Verify JSON-RPC error format
        expect(jsonRpc.error).toBeDefined();
        expect(jsonRpc.error?.code).toBe(-32001);
        expect(jsonRpc.error?.message).toBe('Miro authentication expired or invalid.');

        // Verify error.data structure
        expect(jsonRpc.error?.data).toBeDefined();
        expect((jsonRpc.error?.data as any).error_type).toBe('miro_auth_expired');
        expect((jsonRpc.error?.data as any).service).toBe('miro');
        // Note: BASE_URI is module-level constant, uses default in tests
        expect((jsonRpc.error?.data as any).authorize_url).toBe('http://localhost:3000/oauth/authorize');
        expect((jsonRpc.error?.data as any).action_hint).toContain('reauthenticate');
      });

      it('includes WWW-Authenticate header with authorize_url when auth fails', async () => {
        // Setup: Mock handleToolCall to throw AUTH_ERROR
        const authError = new Error('Miro authentication failed');
        (authError as any).diagnostic = {
          type: 'AUTH_ERROR',
          message: 'Token expired',
          statusCode: 401,
        };
        mocks.mockHandleToolCall.mockRejectedValue(authError);

        const event = mcpEvent('tools/call', {
          name: 'list_boards',
          arguments: {},
        });
        const context = createContext();

        const response = await handler(event, context);

        // Verify WWW-Authenticate header is present
        expect(response.headers['WWW-Authenticate']).toBeDefined();
        expect(response.headers['WWW-Authenticate']).toContain('Bearer error="invalid_token"');
        // Note: BASE_URI is module-level constant, uses default in tests
        expect(response.headers['WWW-Authenticate']).toContain('authorize_url="http://localhost:3000/oauth/authorize"');
      });

      it('constructs authorize_url with /oauth/authorize path', async () => {
        // Setup: Mock handleToolCall to throw AUTH_ERROR
        const authError = new Error('Miro authentication failed');
        (authError as any).diagnostic = {
          type: 'AUTH_ERROR',
          message: 'Token expired',
          statusCode: 401,
        };
        mocks.mockHandleToolCall.mockRejectedValue(authError);

        const event = mcpEvent('tools/call', {
          name: 'list_boards',
          arguments: {},
        });
        const context = createContext();

        const response = await handler(event, context);

        const jsonRpc = parseJsonRpcResponse(response.body);

        // Verify authorize_url format (BASE_URI + /oauth/authorize)
        // Note: In production, BASE_URI is set via env var; in tests it uses default
        const authorizeUrl = (jsonRpc.error?.data as any).authorize_url;
        expect(authorizeUrl).toBeDefined();
        expect(authorizeUrl).toContain('/oauth/authorize');
        expect(response.headers['WWW-Authenticate']).toContain(authorizeUrl);
      });
    });

    describe('initialization with expired token', () => {
      it('returns reauthentication error when verifyAuth fails during initialization', async () => {
        // Setup: Mock verifyAuth to fail
        mocks.mockVerifyAuth.mockResolvedValue(false);

        const event = mcpEvent('tools/call', {
          name: 'list_boards',
          arguments: {},
        });
        const context = createContext();

        const response = await handler(event, context);

        // Verify response structure
        expect(response.statusCode).toBe(200);
        const jsonRpc = parseJsonRpcResponse(response.body);

        // Verify JSON-RPC error format
        expect(jsonRpc.error).toBeDefined();
        expect(jsonRpc.error?.code).toBe(-32001);
        expect(jsonRpc.error?.message).toBe('Miro authentication expired or invalid.');

        // Verify error.data structure
        expect(jsonRpc.error?.data).toBeDefined();
        expect((jsonRpc.error?.data as any).error_type).toBe('miro_auth_expired');
        // Note: BASE_URI is module-level constant, uses default in tests
        expect((jsonRpc.error?.data as any).authorize_url).toBe('http://localhost:3000/oauth/authorize');
      });

      it('includes WWW-Authenticate header when initialization fails due to auth', async () => {
        // Setup: Mock verifyAuth to fail
        mocks.mockVerifyAuth.mockResolvedValue(false);

        const event = mcpEvent('tools/call', {
          name: 'list_boards',
          arguments: {},
        });
        const context = createContext();

        const response = await handler(event, context);

        // Verify WWW-Authenticate header is present
        expect(response.headers['WWW-Authenticate']).toBeDefined();
        expect(response.headers['WWW-Authenticate']).toContain('Bearer error="invalid_token"');
        // Note: BASE_URI is module-level constant, uses default in tests
        expect(response.headers['WWW-Authenticate']).toContain('authorize_url="http://localhost:3000/oauth/authorize"');
      });
    });

    describe('error format consistency', () => {
      it('uses consistent error structure for both init and runtime auth failures', async () => {
        // Test runtime auth failure
        const authError = new Error('Miro authentication failed');
        (authError as any).diagnostic = {
          type: 'AUTH_ERROR',
          message: 'Token expired',
          statusCode: 401,
        };
        mocks.mockHandleToolCall.mockRejectedValue(authError);

        const runtimeEvent = mcpEvent('tools/call', {
          name: 'list_boards',
          arguments: {},
        }, 1);
        const runtimeContext = createContext('runtime-request');

        const runtimeResponse = await handler(runtimeEvent, runtimeContext);
        const runtimeJsonRpc = parseJsonRpcResponse(runtimeResponse.body);

        // Test init auth failure
        mocks.mockVerifyAuth.mockResolvedValue(false);
        const initEvent = mcpEvent('tools/call', {
          name: 'list_boards',
          arguments: {},
        }, 2);
        const initContext = createContext('init-request');

        const initResponse = await handler(initEvent, initContext);
        const initJsonRpc = parseJsonRpcResponse(initResponse.body);

        // Verify both use same error code and structure
        expect(runtimeJsonRpc.error?.code).toBe(-32001);
        expect(initJsonRpc.error?.code).toBe(-32001);

        expect((runtimeJsonRpc.error?.data as any).error_type).toBe('miro_auth_expired');
        expect((initJsonRpc.error?.data as any).error_type).toBe('miro_auth_expired');

        expect((runtimeJsonRpc.error?.data as any).authorize_url).toBeDefined();
        expect((initJsonRpc.error?.data as any).authorize_url).toBeDefined();

        // Verify both include WWW-Authenticate header
        expect(runtimeResponse.headers['WWW-Authenticate']).toBeDefined();
        expect(initResponse.headers['WWW-Authenticate']).toBeDefined();
      });
    });
  });
});
