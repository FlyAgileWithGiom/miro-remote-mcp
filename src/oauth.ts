import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

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
  private tokenFile: string;
  private tokens: TokenData | null = null;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenFile: string = 'tokens.json'
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.tokenFile = tokenFile;
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

      const tokenData: TokenData = {
        ...response.data,
        expires_at: Date.now() + response.data.expires_in * 1000,
      };

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

      const tokenData: TokenData = {
        ...response.data,
        expires_at: Date.now() + response.data.expires_in * 1000,
      };

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
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      await this.loadTokens();
    }

    if (!this.tokens) {
      throw new Error('No tokens available. Please authenticate first.');
    }

    // Check if token is expired or will expire in the next 5 minutes
    const expiresAt = this.tokens.expires_at || 0;
    const shouldRefresh = Date.now() + 5 * 60 * 1000 > expiresAt;

    if (shouldRefresh) {
      console.error('[OAuth] Token expired or expiring soon, refreshing...');
      await this.refreshAccessToken();
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
   * Save tokens to file
   */
  private async saveTokens(tokens: TokenData): Promise<void> {
    try {
      await fs.writeFile(this.tokenFile, JSON.stringify(tokens, null, 2), 'utf-8');
      console.error('[OAuth] Tokens saved successfully');
    } catch (error) {
      console.error('[OAuth] Failed to save tokens:', error);
    }
  }

  /**
   * Load tokens from file
   */
  private async loadTokens(): Promise<void> {
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
