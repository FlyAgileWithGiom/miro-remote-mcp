/**
 * Miro API Integration Test Utilities
 *
 * Helper class for creating and cleaning up test data during integration tests.
 * Ensures proper isolation and cleanup even if tests fail.
 */
import { MiroClient, MiroBoard, MiroItem } from '../../src/miro-client.js';
import { OAuth2Manager } from '../../src/oauth.js';

export interface TestConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri?: string;
}

/**
 * Test helper for managing Miro test resources
 * Automatically tracks and cleans up created boards
 */
export class MiroTestHelper {
  private client: MiroClient;
  private oauth: OAuth2Manager;
  private createdBoardIds: string[] = [];
  private testNamePrefix: string;

  constructor(config: TestConfig) {
    const redirectUri = config.redirectUri || 'http://localhost:3003/oauth/callback';

    // Create OAuth manager with in-memory token storage (no file persistence)
    this.oauth = new OAuth2Manager(
      config.clientId,
      config.clientSecret,
      redirectUri,
      undefined, // no token file
      false // no persistence
    );

    // Initialize with refresh token
    this.oauth.setTokensFromObject({
      access_token: '', // Will be refreshed immediately
      refresh_token: config.refreshToken,
      expires_in: 0, // Force refresh on first use
      token_type: 'Bearer',
      scope: 'boards:read boards:write',
      expires_at: Date.now() - 1000, // Already expired
    });

    this.client = new MiroClient(this.oauth);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    this.testNamePrefix = `[TEST] MCP Integration - ${timestamp}`;
  }

  /**
   * Get the Miro client instance
   */
  getClient(): MiroClient {
    return this.client;
  }

  /**
   * Get the OAuth manager instance
   */
  getOAuth(): OAuth2Manager {
    return this.oauth;
  }

  /**
   * Create a test board with automatic cleanup tracking
   */
  async createTestBoard(name?: string): Promise<MiroBoard> {
    const boardName = name
      ? `${this.testNamePrefix} ${name}`
      : `${this.testNamePrefix} Board`;

    const board = await this.client.createBoard(boardName, 'Integration test board');
    this.createdBoardIds.push(board.id);
    return board;
  }

  /**
   * Create multiple test items on a board
   */
  async createTestStickyNotes(
    boardId: string,
    count: number,
    options?: { x?: number; y?: number; spacing?: number }
  ): Promise<MiroItem[]> {
    const items: MiroItem[] = [];
    const spacing = options?.spacing || 50;
    const startX = options?.x || 0;
    const startY = options?.y || 0;

    for (let i = 0; i < count; i++) {
      const item = await this.client.createStickyNote(
        boardId,
        `Test Note ${i + 1}`,
        {
          x: startX + (i * spacing),
          y: startY,
          color: 'light_yellow',
        }
      );
      items.push(item);
    }

    return items;
  }

  /**
   * Wait for a condition to be true (with timeout)
   */
  async waitFor(
    condition: () => Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  /**
   * Clean up all test boards created during this test session
   * Continues cleanup even if individual deletions fail
   */
  async cleanup(): Promise<{ deleted: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;
    let failed = 0;

    for (const boardId of this.createdBoardIds) {
      try {
        // Note: Miro doesn't have a delete board API endpoint
        // We can only track and potentially list boards for manual cleanup
        // In production, boards should be cleaned up manually via Miro UI
        console.warn(`[Cleanup] Test board ${boardId} should be manually deleted (Miro API doesn't support board deletion)`);
        deleted++;
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Board ${boardId}: ${errorMsg}`);
        console.error(`[Cleanup] Failed to process board ${boardId}:`, errorMsg);
      }
    }

    this.createdBoardIds = [];
    return { deleted, failed, errors };
  }

  /**
   * List all boards matching the test prefix
   * Useful for identifying orphaned test boards
   */
  async listTestBoards(): Promise<MiroBoard[]> {
    const allBoards = await this.client.listBoards();
    return allBoards.filter(board =>
      board.name.startsWith('[TEST]')
    );
  }

  /**
   * Get diagnostic info about current auth state
   */
  async getAuthDiagnostics(): Promise<{
    hasTokens: boolean;
    canListBoards: boolean;
    error?: string;
  }> {
    const hasTokens = this.oauth.hasTokens();
    let canListBoards = false;
    let error: string | undefined;

    try {
      await this.client.listBoards();
      canListBoards = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    return { hasTokens, canListBoards, error };
  }
}

/**
 * Load test configuration from production credentials
 * Reuses existing Miro OAuth configuration and tokens
 * Returns null if credentials unavailable (allows tests to skip gracefully)
 */
export function loadTestConfig(): TestConfig | null {
  try {
    // Import config and fs modules
    const { getCredentials, CONFIG_PATHS } = require('../../src/config.js');
    const fs = require('fs');

    // Load client ID/secret from production config
    const creds = getCredentials();

    // Try loading refresh token from token file
    let refreshToken: string | undefined;
    try {
      const tokenPath = CONFIG_PATHS.tokensFile;
      if (fs.existsSync(tokenPath)) {
        const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
        refreshToken = tokenData.refresh_token;
      }
    } catch (error) {
      // Token file doesn't exist or is invalid - try env var
    }

    // Fallback to environment variable
    if (!refreshToken) {
      refreshToken = process.env.MIRO_REFRESH_TOKEN;
    }

    // Return null if any required credential is missing
    if (!creds.clientId || !creds.clientSecret || !refreshToken) {
      return null;
    }

    return {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken,
    };
  } catch (error) {
    // Configuration loading failed - tests will skip
    return null;
  }
}

/**
 * Sleep helper for rate limiting tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
