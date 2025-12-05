// Configuration constants for Miro MCP Server

// OAuth Configuration
export const OAUTH_CONFIG = {
  DEFAULT_REDIRECT_URI: 'http://localhost:3003/oauth/callback',
  CALLBACK_PORT: 3003,
  API_BASE_URL: 'https://api.miro.com/v2',
};

// Token Management
export const TOKEN_CONFIG = {
  // Long-lived token duration (1 year in seconds)
  LONG_LIVED_TOKEN_SECONDS: 365 * 24 * 60 * 60,
  // Refresh token when within 5 minutes of expiration
  REFRESH_BUFFER_MINUTES: 5,
  REFRESH_BUFFER_MS: 5 * 60 * 1000,
  // Assumed token validity for caching (1 hour in milliseconds)
  ASSUMED_VALIDITY_MS: 3600 * 1000,
};

// Rate Limiting
export const RATE_LIMIT_CONFIG = {
  // Miro API default rate limit
  DEFAULT_REMAINING: 100,
  DEFAULT_RETRY_SECONDS: 60,
};

// Cache Configuration
export const CACHE_CONFIG = {
  // Board list and metadata cache TTL (5 minutes)
  BOARD_TTL_MS: 5 * 60 * 1000,
  // Item list cache TTL (5 minutes for consistent agent experience)
  ITEM_TTL_MS: 5 * 60 * 1000,
};

// Pagination Configuration
export const PAGINATION_CONFIG = {
  // Items per page for API pagination (optimized for 20-30% faster fetches)
  ITEMS_PER_PAGE: 100,
};

// Layout Defaults
export const LAYOUT_DEFAULTS = {
  // Default spacing between items
  SPACING: 50,
  // Tree layout: vertical distance between levels
  TREE_LEVEL_SPACING: 300,
  // Tree layout: horizontal distance between siblings
  TREE_SIBLING_SPACING: 50,
  // Radial layout: distance from center
  RADIAL_RADIUS: 300,
  // Radial layout: starting angle in radians (0 = right)
  RADIAL_START_ANGLE: 0,
};

// Miro API Defaults
export const MIRO_DEFAULTS = {
  // Geometry defaults
  TEXT_WIDTH: 300,
  SHAPE_WIDTH: 300,
  SHAPE_HEIGHT: 150,
  FRAME_WIDTH: 1000,
  FRAME_HEIGHT: 800,
  STICKY_NOTE_SIZE: 200,

  // Style defaults
  DEFAULT_BORDER_WIDTH: '2.0',
  DEFAULT_STROKE_WIDTH: '2',

  // Position defaults
  DEFAULT_POSITION: { x: 0, y: 0 },

  // Color defaults
  STICKY_NOTE_COLOR: 'light_yellow',
  SHAPE_FILL_COLOR: 'light_blue',
  SHAPE_BORDER_COLOR: 'blue',
  FRAME_FILL_COLOR: 'light_gray',
  CONNECTOR_STROKE_COLOR: 'blue',
};

// Configuration Paths
export const CONFIG_PATHS = {
  get tokensFile(): string {
    return process.env.TOKENS_FILE || '/data/tokens.json';
  },
};

// Credentials from environment variables (base64 encoded)
export function getCredentials(): { clientId: string; clientSecret: string } {
  const clientIdB64 = process.env.MIRO_CLIENT_ID_B64;
  const clientSecretB64 = process.env.MIRO_CLIENT_SECRET_B64;

  if (!clientIdB64 || !clientSecretB64) {
    throw new Error('Missing MIRO_CLIENT_ID_B64 or MIRO_CLIENT_SECRET_B64 environment variables');
  }

  return {
    clientId: Buffer.from(clientIdB64, 'base64').toString('utf-8'),
    clientSecret: Buffer.from(clientSecretB64, 'base64').toString('utf-8'),
  };
}
