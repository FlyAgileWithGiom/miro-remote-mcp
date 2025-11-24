/**
 * Helper functions to build Scaleway Functions event objects for testing
 */

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

/**
 * Create a base Scaleway event
 */
export function createEvent(
  method: string,
  path: string,
  options: {
    body?: string | object;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}
): ScalewayEvent {
  return {
    httpMethod: method,
    path,
    body: typeof options.body === 'object' ? JSON.stringify(options.body) : options.body,
    queryStringParameters: options.query,
    headers: options.headers ?? { 'Content-Type': 'application/json' },
  };
}

/**
 * Create a Scaleway context object
 */
export function createContext(requestId: string = 'test-request-id'): ScalewayContext {
  return {
    requestId,
    functionName: 'miro-mcp-test',
    functionVersion: '1.0.0',
  };
}

/**
 * Create a JSON-RPC request body
 */
export function jsonRpcRequest(
  method: string,
  params?: Record<string, unknown>,
  id: string | number = 1
): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    method,
    params,
    id,
  });
}

/**
 * Create a GET /health event
 */
export function healthCheckEvent(): ScalewayEvent {
  return createEvent('GET', '/health');
}

/**
 * Create a POST /mcp event with JSON-RPC body
 */
export function mcpEvent(
  method: string,
  params?: Record<string, unknown>,
  id: string | number = 1
): ScalewayEvent {
  return createEvent('POST', '/mcp', {
    body: jsonRpcRequest(method, params, id),
  });
}

/**
 * Create a GET /oauth/authorize event
 */
export function oauthAuthorizeEvent(): ScalewayEvent {
  return createEvent('GET', '/oauth/authorize');
}

/**
 * Create a GET /oauth/callback event with code or error
 */
export function oauthCallbackEvent(
  codeOrError: { code: string } | { error: string }
): ScalewayEvent {
  return createEvent('GET', '/oauth/callback', {
    query: 'code' in codeOrError
      ? { code: codeOrError.code }
      : { error: codeOrError.error },
  });
}

/**
 * Parse JSON-RPC response from API response body
 */
export function parseJsonRpcResponse(body: string): {
  jsonrpc: string;
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
} {
  return JSON.parse(body);
}
