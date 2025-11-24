/**
 * Unit tests for OAuth2Manager
 * Tests token management, refresh logic, and persistence.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mockTokens from '../fixtures/mock-tokens.json';

// Mock axios for API calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: vi.fn((error) => error.isAxiosError === true),
  },
}));

// Mock fs for token persistence
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(JSON.stringify(mockTokens.valid)),
  },
}));

describe('OAuth2Manager', () => {
  let OAuth2Manager: typeof import('../../src/oauth.js').OAuth2Manager;
  let axios: { post: ReturnType<typeof vi.fn>; isAxiosError: ReturnType<typeof vi.fn> };
  let fsPromises: { writeFile: ReturnType<typeof vi.fn>; readFile: ReturnType<typeof vi.fn> };

  const testClientId = mockTokens.envVars.clientId;
  const testClientSecret = mockTokens.envVars.clientSecret;
  const testRedirectUri = 'http://localhost:3000/oauth/callback';

  beforeEach(async () => {
    vi.resetModules();

    const module = await import('../../src/oauth.js');
    OAuth2Manager = module.OAuth2Manager;

    const axiosModule = await import('axios');
    axios = axiosModule.default as unknown as typeof axios;

    const fsModule = await import('fs');
    fsPromises = fsModule.promises as unknown as typeof fsPromises;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('creates instance with client credentials', () => {
      const oauth = new OAuth2Manager(testClientId, testClientSecret, testRedirectUri);
      expect(oauth).toBeInstanceOf(OAuth2Manager);
    });

    it('generates correct authorization URL', () => {
      const oauth = new OAuth2Manager(testClientId, testClientSecret, testRedirectUri);
      const url = oauth.getAuthorizationUrl();

      expect(url).toContain('https://miro.com/oauth/authorize');
      expect(url).toContain(`client_id=${testClientId}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(testRedirectUri)}`);
      expect(url).toContain('response_type=code');
    });

    it('includes team_id in authorization URL when provided', () => {
      const oauth = new OAuth2Manager(testClientId, testClientSecret, testRedirectUri);
      const url = oauth.getAuthorizationUrl('test-team-123');

      expect(url).toContain('team_id=test-team-123');
    });
  });

  describe('Token Management', () => {
    it('has no tokens initially', () => {
      const oauth = new OAuth2Manager(testClientId, testClientSecret, testRedirectUri);
      expect(oauth.hasTokens()).toBe(false);
    });

    it('reports hasTokens true after setTokens', async () => {
      const oauth = new OAuth2Manager(
        testClientId,
        testClientSecret,
        testRedirectUri,
        undefined, // no token file
        false // no persistence
      );
      await oauth.setTokens('test-token', 'test-refresh', 3600);

      expect(oauth.hasTokens()).toBe(true);
    });

    it('setTokensFromObject sets tokens in memory only', () => {
      const oauth = new OAuth2Manager(
        testClientId,
        testClientSecret,
        testRedirectUri,
        undefined,
        false
      );

      oauth.setTokensFromObject(mockTokens.valid);

      expect(oauth.hasTokens()).toBe(true);
    });
  });

  describe('Token Refresh Logic', () => {
    it('triggers refresh when token is within 5-minute buffer', async () => {
      const oauth = new OAuth2Manager(
        testClientId,
        testClientSecret,
        testRedirectUri,
        undefined,
        false
      );

      // Set token that expires in 2 minutes (within 5-minute buffer)
      const expiringToken = {
        ...mockTokens.valid,
        expires_at: Date.now() + 2 * 60 * 1000, // 2 minutes from now
      };
      oauth.setTokensFromObject(expiringToken);

      // Mock refresh response
      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'boards:read',
        },
      });

      const token = await oauth.getValidAccessToken();

      // Refresh should have been called
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.miro.com/v1/oauth/token',
        expect.any(URLSearchParams),
        expect.any(Object)
      );
      expect(token).toBe('new-access-token');
    });

    it('does not refresh when token has plenty of time', async () => {
      const oauth = new OAuth2Manager(
        testClientId,
        testClientSecret,
        testRedirectUri,
        undefined,
        false
      );

      // Set token that expires in 30 minutes (well outside 5-minute buffer)
      const validToken = {
        ...mockTokens.valid,
        expires_at: Date.now() + 30 * 60 * 1000, // 30 minutes from now
      };
      oauth.setTokensFromObject(validToken);

      const token = await oauth.getValidAccessToken();

      // No refresh should have been called
      expect(axios.post).not.toHaveBeenCalled();
      expect(token).toBe(mockTokens.valid.access_token);
    });

    it('throws error when no refresh token available for expired token', async () => {
      const oauth = new OAuth2Manager(
        testClientId,
        testClientSecret,
        testRedirectUri,
        undefined,
        false
      );

      // Set expired token with no refresh token
      const expiredNoRefresh = {
        ...mockTokens.noRefresh,
        expires_at: Date.now() - 1000, // Already expired
      };
      oauth.setTokensFromObject(expiredNoRefresh);

      // Should still return the access token (logs warning but doesn't throw)
      const token = await oauth.getValidAccessToken();
      expect(token).toBe(mockTokens.noRefresh.access_token);
    });
  });

  describe('Token Persistence', () => {
    it('saves tokens to file when persistence enabled', async () => {
      const tokenFile = '/tmp/test-tokens.json';
      const oauth = new OAuth2Manager(
        testClientId,
        testClientSecret,
        testRedirectUri,
        tokenFile,
        true
      );

      await oauth.setTokens('test-token', 'test-refresh', 3600);

      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        tokenFile,
        expect.stringContaining('test-token'),
        'utf-8'
      );
    });

    it('does not save tokens when persistence disabled', async () => {
      const oauth = new OAuth2Manager(
        testClientId,
        testClientSecret,
        testRedirectUri,
        undefined,
        false
      );

      await oauth.setTokens('test-token', 'test-refresh', 3600);

      expect(fsPromises.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('throws error when no tokens available', async () => {
      const oauth = new OAuth2Manager(
        testClientId,
        testClientSecret,
        testRedirectUri,
        undefined,
        false
      );

      // Mock loadTokens to not find any tokens
      fsPromises.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(oauth.getValidAccessToken()).rejects.toThrow('No tokens available');
    });

    it('throws descriptive error on refresh failure', async () => {
      const oauth = new OAuth2Manager(
        testClientId,
        testClientSecret,
        testRedirectUri,
        undefined,
        false
      );

      // Set expired token
      const expiredToken = {
        ...mockTokens.expired,
        expires_at: Date.now() - 1000,
      };
      oauth.setTokensFromObject(expiredToken);

      // Mock refresh failure
      const axiosError = new Error('Network error') as Error & {
        isAxiosError: boolean;
        response?: { data?: { error_description?: string } };
      };
      axiosError.isAxiosError = true;
      axiosError.response = { data: { error_description: 'Invalid refresh token' } };
      axios.post.mockRejectedValueOnce(axiosError);

      await expect(oauth.refreshAccessToken()).rejects.toThrow('Invalid refresh token');
    });
  });
});
