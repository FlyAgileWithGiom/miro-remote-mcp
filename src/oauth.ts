import axios from 'axios';
import { promises as fs } from 'fs';
import { TOKEN_CONFIG } from './config.js';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expires_at?: number;
}

export class OAuth2Manager {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tokenFile: string | null;
  private persistTokens: boolean;
  private tokens: TokenData | null = null;

  /**
   * Lock to prevent parallel token refreshes (race condition prevention).
   * When multiple concurrent requests detect an expired token, only one
   * should actually call the Miro API to refresh. Others wait for the
   * in-progress refresh to complete.
   */
  private refreshLock: Promise<void> | null = null;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenFile?: string,
    persistTokens: boolean = true
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.tokenFile = tokenFile || null;
    this.persistTokens = persistTokens;
  }

  /**
   * Generate authorization URL for OAuth2 flow
   */
  getAuthorizationUrl(teamId?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
    });

    if (teamId) {
      params.append('team_id', teamId);
    }

    return `https://miro.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<TokenData> {
    try {
      const response = await axios.post(
        'https://api.miro.com/v1/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Use Miro's expires_in, fallback to 1h if missing
      const expiresIn = response.data.expires_in || 3600;
      if (!response.data.expires_in) {
        console.error('[OAuth] Warning: expires_in missing from response, using 1h default');
      }
      const tokenData: TokenData = {
        ...response.data,
        expires_at: Date.now() + expiresIn * 1000,
      };
      console.error(`[OAuth] Token exchanged, expires in ${expiresIn}s`);

      this.tokens = tokenData;
      await this.saveTokens(tokenData);
      return tokenData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Token exchange failed: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken?: string): Promise<TokenData> {
    const token = refreshToken || this.tokens?.refresh_token;
    if (!token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        'https://api.miro.com/v1/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Use Miro's expires_in, fallback to 1h if missing
      const expiresIn = response.data.expires_in || 3600;
      if (!response.data.expires_in) {
        console.error('[OAuth] Warning: expires_in missing from response, using 1h default');
      }
      const tokenData: TokenData = {
        ...response.data,
        expires_at: Date.now() + expiresIn * 1000,
      };
      console.error(`[OAuth] Token refreshed, expires in ${expiresIn}s`);

      this.tokens = tokenData;
      await this.saveTokens(tokenData);
      return tokenData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Token refresh failed: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get valid access token, refreshing if necessary.
   *
   * Race condition prevention: If multiple concurrent requests detect an expired
   * token, only the first one initiates a refresh. Others wait for the in-progress
   * refresh to complete via the refreshLock.
   */
  async getValidAccessToken(): Promise<string> {
    // Wait for any in-progress refresh to complete
    if (this.refreshLock) {
      await this.refreshLock;
    }

    if (!this.tokens) {
      await this.loadTokens();
    }

    if (!this.tokens) {
      throw new Error('No tokens available. Please authenticate first.');
    }

    // Check if token is expired or will expire in the next 5 minutes
    const expiresAt = this.tokens.expires_at || 0;
    const shouldRefresh = Date.now() + TOKEN_CONFIG.REFRESH_BUFFER_MS > expiresAt;

    // Only refresh if we have a refresh token and token is expiring
    if (shouldRefresh && this.tokens.refresh_token) {
      // Double-check: another request might have refreshed while we were waiting
      if (!this.refreshLock) {
        console.error('[OAuth] Token expired or expiring soon, refreshing...');
        // Create the refresh lock to prevent parallel refreshes
        this.refreshLock = this.refreshAccessToken()
          .then(() => {})
          .finally(() => {
            // Always clear the lock when done (success or failure)
            this.refreshLock = null;
          });
      }
      // Wait for the refresh to complete
      await this.refreshLock;
    } else if (shouldRefresh && !this.tokens.refresh_token) {
      console.error('[OAuth] Token expired but no refresh token available. Please re-authenticate.');
    }

    return this.tokens!.access_token;
  }

  /**
   * Set tokens manually (useful for initial setup with existing tokens)
   */
  async setTokens(accessToken: string, refreshToken: string, expiresIn: number = 3600): Promise<void> {
    this.tokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: 'Bearer',
      scope: 'boards:read boards:write identity:read team:read',
      expires_at: Date.now() + expiresIn * 1000,
    };
    await this.saveTokens(this.tokens);
  }

  /**
   * Initialize tokens from object (for environment variables, no persistence)
   */
  setTokensFromObject(tokenData: TokenData): void {
    this.tokens = tokenData;
    console.error('[OAuth] Tokens initialized from object (in-memory only)');
  }

  /**
   * Save tokens to file (only if persistence enabled and tokenFile specified)
   */
  private async saveTokens(tokens: TokenData): Promise<void> {
    if (!this.persistTokens || !this.tokenFile) {
      console.error('[OAuth] Token persistence disabled (in-memory only)');
      return;
    }

    try {
      await fs.writeFile(this.tokenFile, JSON.stringify(tokens, null, 2), 'utf-8');
      console.error('[OAuth] Tokens saved successfully');
    } catch (error) {
      console.error('[OAuth] Failed to save tokens:', error);
    }
  }

  /**
   * Load tokens from file (only if tokenFile specified)
   */
  private async loadTokens(): Promise<void> {
    if (!this.tokenFile) {
      console.error('[OAuth] No token file specified (in-memory mode)');
      return;
    }

    try {
      const data = await fs.readFile(this.tokenFile, 'utf-8');
      this.tokens = JSON.parse(data);
      console.error('[OAuth] Tokens loaded successfully');
    } catch (error) {
      // File doesn't exist or is invalid - this is ok for first run
      console.error('[OAuth] No saved tokens found');
    }
  }

  /**
   * Check if we have valid tokens
   */
  hasTokens(): boolean {
    return this.tokens !== null;
  }
}
