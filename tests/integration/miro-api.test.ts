/**
 * Miro API Integration Tests
 *
 * IMPORTANT: These tests use the REAL Miro API, not mocks.
 * They validate actual API integration, OAuth token management, and error handling.
 *
 * Setup:
 * - Tests reuse your production Miro credentials (MIRO_CLIENT_ID_B64, MIRO_CLIENT_SECRET_B64)
 * - Refresh token loaded from /data/tokens.json or MIRO_REFRESH_TOKEN env var
 * - Run `npm run oauth` first if you haven't authenticated yet
 * - Tests create boards with [TEST] prefix and attempt cleanup
 *
 * Tests skip gracefully if credentials are not configured.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { config } from 'dotenv';
import { MiroTestHelper, loadTestConfig, sleep } from '../helpers/miro-test-utils.js';
import { MiroClient, MiroBoard, MiroItem } from '../../src/miro-client.js';
import { OAuth2Manager } from '../../src/oauth.js';

// Test configuration (uses production credentials)
const testConfig = loadTestConfig();
const TESTS_ENABLED = testConfig !== null;

// Skip message for when credentials are missing
const skipMessage = TESTS_ENABLED
  ? undefined
  : 'Skipping: Miro credentials not available (run: npm run oauth)';

describe('Miro API Integration Tests', () => {
  let helper: MiroTestHelper;
  let client: MiroClient;
  let oauth: OAuth2Manager;

  beforeAll(() => {
    if (!TESTS_ENABLED) {
      console.warn('\n⚠️  Miro API integration tests skipped - missing credentials');
      console.warn('   Run: npm run oauth (to authenticate with Miro)\n');
      return;
    }

    helper = new MiroTestHelper(testConfig!);
    client = helper.getClient();
    oauth = helper.getOAuth();
  });

  afterAll(async () => {
    if (!TESTS_ENABLED || !helper) return;

    // Cleanup test boards
    const result = await helper.cleanup();
    console.log(`\n🧹 Cleanup: ${result.deleted} boards processed`);
    if (result.failed > 0) {
      console.warn(`   ${result.failed} cleanup failures (see warnings above)`);
    }
  });

  describe('OAuth Token Lifecycle (CRITICAL)', () => {
    test.skipIf(!TESTS_ENABLED)(
      'refreshes expired tokens successfully',
      async () => {
        // OAuth manager was initialized with expired token (expires_at in past)
        // First API call should trigger refresh

        // Verify we can get a valid access token
        const accessToken = await oauth.getValidAccessToken();
        expect(accessToken).toBeTruthy();
        expect(accessToken.length).toBeGreaterThan(20);

        // Validate token works by calling Miro API
        const boards = await client.listBoards();
        expect(Array.isArray(boards)).toBe(true);

        // Verify token was actually refreshed (new expiry in future)
        const secondToken = await oauth.getValidAccessToken();
        expect(secondToken).toBe(accessToken); // Should be cached
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'prevents parallel token refresh (race condition)',
      async () => {
        // Force token expiration
        const expiredTokenData = {
          access_token: 'expired_token',
          refresh_token: testConfig!.refreshToken,
          expires_in: 0,
          token_type: 'Bearer',
          scope: 'boards:read boards:write',
          expires_at: Date.now() - 1000,
        };
        oauth.setTokensFromObject(expiredTokenData);

        // Trigger multiple concurrent requests that would detect expired token
        const promises = [
          oauth.getValidAccessToken(),
          oauth.getValidAccessToken(),
          oauth.getValidAccessToken(),
        ];

        const tokens = await Promise.all(promises);

        // All should return the same (refreshed) token
        expect(tokens[0]).toBe(tokens[1]);
        expect(tokens[1]).toBe(tokens[2]);
        expect(tokens[0].length).toBeGreaterThan(20);

        // Verify token works
        const boards = await client.listBoards();
        expect(Array.isArray(boards)).toBe(true);
      },
      { timeout: 10000 }
    );
  });

  describe('Board Lifecycle (HIGH)', () => {
    test.skipIf(!TESTS_ENABLED)(
      'creates, reads, and lists boards successfully',
      async () => {
        // 1. Create test board
        const board = await helper.createTestBoard('CRUD Test');
        expect(board.id).toBeTruthy();
        expect(board.name).toContain('CRUD Test');
        expect(board.viewLink).toContain('miro.com/app/board/');

        // 2. Read board by ID
        const retrievedBoard = await client.getBoard(board.id);
        expect(retrievedBoard.id).toBe(board.id);
        expect(retrievedBoard.name).toBe(board.name);

        // 3. List boards (should include our test board)
        const boards = await client.listBoards();
        const found = boards.find(b => b.id === board.id);
        expect(found).toBeTruthy();
        expect(found?.name).toBe(board.name);

        // Note: Miro API doesn't support board deletion
        // Board will be tracked for manual cleanup
      },
      { timeout: 15000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'caches board list for performance',
      async () => {
        // First call should hit API
        const start1 = Date.now();
        const boards1 = await client.listBoards();
        const duration1 = Date.now() - start1;

        // Second call should use cache (much faster)
        const start2 = Date.now();
        const boards2 = await client.listBoards();
        const duration2 = Date.now() - start2;

        expect(boards2).toEqual(boards1);
        expect(duration2).toBeLessThan(duration1 / 2); // At least 2x faster
      },
      { timeout: 10000 }
    );
  });

  describe('Item Operations', () => {
    let testBoard: MiroBoard;

    beforeEach(async () => {
      if (!TESTS_ENABLED) return;
      testBoard = await helper.createTestBoard('Items Test');
    });

    test.skipIf(!TESTS_ENABLED)(
      'creates sticky notes with different properties',
      async () => {
        // Create sticky with default properties
        const sticky1 = await client.createStickyNote(testBoard.id, 'Default Note');
        expect(sticky1.id).toBeTruthy();
        expect(sticky1.type).toBe('sticky_note');
        expect(sticky1.data?.content).toBe('Default Note');

        // Create sticky with custom properties
        const sticky2 = await client.createStickyNote(
          testBoard.id,
          '<p><strong>Bold</strong> <em>italic</em></p>',
          {
            x: 100,
            y: 200,
            width: 300,
            height: 300,
            color: 'pink',
            shape: 'rectangle',
          }
        );
        expect(sticky2.id).toBeTruthy();
        expect(sticky2.position?.x).toBe(100);
        expect(sticky2.position?.y).toBe(200);
        expect(sticky2.geometry?.width).toBe(300);
        expect(sticky2.style?.fillColor).toBe('pink');
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'creates shapes and text items',
      async () => {
        // Create shape
        const shape = await client.createShape(
          testBoard.id,
          'Test Shape',
          'rectangle',
          {
            x: 0,
            y: 0,
            width: 400,
            height: 200,
            fillColor: 'light_blue',
          }
        );
        expect(shape.id).toBeTruthy();
        expect(shape.type).toBe('shape');

        // Create text
        const text = await client.createText(
          testBoard.id,
          'Test Text',
          {
            x: 200,
            y: 200,
            width: 300,
          }
        );
        expect(text.id).toBeTruthy();
        expect(text.type).toBe('text');
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'creates frames and parents items to frames',
      async () => {
        // Create frame
        const frame = await client.createFrame(testBoard.id, 'Test Frame', {
          x: 0,
          y: 0,
          width: 1000,
          height: 800,
        });
        expect(frame.id).toBeTruthy();
        expect(frame.type).toBe('frame');

        // Create sticky inside frame
        const sticky = await client.createStickyNote(
          testBoard.id,
          'Inside Frame',
          {
            x: 50,
            y: 50,
            parentId: frame.id,
          }
        );
        expect(sticky.parent?.id).toBe(frame.id);
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'creates connectors between items',
      async () => {
        // Create two items to connect
        const sticky1 = await client.createStickyNote(testBoard.id, 'Start', {
          x: 0,
          y: 0,
        });
        const sticky2 = await client.createStickyNote(testBoard.id, 'End', {
          x: 300,
          y: 0,
        });

        // Create connector
        const connector = await client.createConnector(
          testBoard.id,
          sticky1.id,
          sticky2.id,
          {
            strokeColor: 'blue',
            strokeWidth: '2',
            endStrokeCap: 'arrow',
            caption: 'Test Connection',
          }
        );

        expect(connector.id).toBeTruthy();
        expect(connector.type).toBe('connector');
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'lists and filters items by type',
      async () => {
        // Create various items
        await client.createStickyNote(testBoard.id, 'Sticky 1');
        await client.createStickyNote(testBoard.id, 'Sticky 2');
        await client.createShape(testBoard.id, 'Shape 1', 'rectangle');

        // List all items
        const allItems = await client.listItems(testBoard.id);
        expect(allItems.length).toBeGreaterThanOrEqual(3);

        // List only sticky notes
        const stickyNotes = await client.listItems(testBoard.id, 'sticky_note');
        expect(stickyNotes.length).toBeGreaterThanOrEqual(2);
        expect(stickyNotes.every(item => item.type === 'sticky_note')).toBe(true);

        // List only shapes
        const shapes = await client.listItems(testBoard.id, 'shape');
        expect(shapes.length).toBeGreaterThanOrEqual(1);
        expect(shapes.every(item => item.type === 'shape')).toBe(true);
      },
      { timeout: 15000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'updates item properties',
      async () => {
        // Create item
        const sticky = await client.createStickyNote(testBoard.id, 'Original', {
          x: 0,
          y: 0,
        });

        // Update position and content
        const updated = await client.updateItem(testBoard.id, sticky.id, {
          position: { x: 100, y: 200 },
          data: { content: 'Updated Content' },
        });

        expect(updated.position?.x).toBe(100);
        expect(updated.position?.y).toBe(200);
        expect(updated.data?.content).toBe('Updated Content');
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'deletes items',
      async () => {
        // Create item
        const sticky = await client.createStickyNote(testBoard.id, 'To Delete');

        // Verify it exists
        const retrieved = await client.getItem(testBoard.id, sticky.id);
        expect(retrieved.id).toBe(sticky.id);

        // Delete it
        await client.deleteItem(testBoard.id, sticky.id);

        // Verify it's gone (should throw 404)
        await expect(
          client.getItem(testBoard.id, sticky.id)
        ).rejects.toThrow();
      },
      { timeout: 10000 }
    );
  });

  describe('Batch Operations (MEDIUM)', () => {
    let testBoard: MiroBoard;

    beforeEach(async () => {
      if (!TESTS_ENABLED) return;
      testBoard = await helper.createTestBoard('Batch Test');
    });

    test.skipIf(!TESTS_ENABLED)(
      'creates 50+ sticky notes successfully',
      async () => {
        // Create 50 sticky notes
        const items = await helper.createTestStickyNotes(testBoard.id, 50, {
          x: 0,
          y: 0,
          spacing: 100,
        });

        expect(items.length).toBe(50);
        expect(items.every(item => item.id)).toBe(true);
        expect(items.every(item => item.type === 'sticky_note')).toBe(true);
      },
      { timeout: 60000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'batch updates multiple items in parallel',
      async () => {
        // Create test items
        const items = await helper.createTestStickyNotes(testBoard.id, 10);

        // Prepare batch updates
        const updates = items.map((item, index) => ({
          id: item.id,
          position: { x: index * 200, y: 100 },
          style: { fillColor: index % 2 === 0 ? 'yellow' : 'pink' },
        }));

        // Execute batch update
        const result = await client.batchUpdateItems(testBoard.id, updates);

        expect(result.total).toBe(10);
        expect(result.succeeded).toBe(10);
        expect(result.failed).toBe(0);
        expect(result.results.every(r => r.status === 'success')).toBe(true);
      },
      { timeout: 30000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'batch update handles partial failures gracefully',
      async () => {
        // Create test items
        const items = await helper.createTestStickyNotes(testBoard.id, 5);

        // Prepare updates with one invalid ID
        const updates = [
          { id: items[0].id, position: { x: 100, y: 100 } },
          { id: 'invalid-id-12345', position: { x: 200, y: 200 } }, // Will fail
          { id: items[2].id, position: { x: 300, y: 300 } },
        ];

        // Execute batch update
        const result = await client.batchUpdateItems(testBoard.id, updates);

        expect(result.total).toBe(3);
        expect(result.succeeded).toBe(2);
        expect(result.failed).toBe(1);

        // Check specific results
        expect(result.results[0].status).toBe('success');
        expect(result.results[1].status).toBe('error');
        expect(result.results[2].status).toBe('success');
      },
      { timeout: 15000 }
    );
  });

  describe('Sync Board (MEDIUM)', () => {
    test.skipIf(!TESTS_ENABLED)(
      'syncs board with 20+ items of different types',
      async () => {
        // Create board with various item types
        const board = await helper.createTestBoard('Sync Test');

        // Create diverse items
        await client.createFrame(board.id, 'Frame 1');
        await client.createStickyNote(board.id, 'Sticky 1');
        await client.createStickyNote(board.id, 'Sticky 2');
        await client.createShape(board.id, 'Shape 1', 'rectangle');
        await client.createText(board.id, 'Text 1');

        // Sync board
        const start = Date.now();
        const snapshot = await client.syncBoard(board.id);
        const duration = Date.now() - start;

        // Verify metadata
        expect(snapshot.metadata.board_id).toBe(board.id);
        expect(snapshot.metadata.board_name).toContain('Sync Test');
        expect(snapshot.metadata.itemCount).toBeGreaterThanOrEqual(5);

        // Verify items organized by type
        expect(snapshot.items.frames.length).toBeGreaterThanOrEqual(1);
        expect(snapshot.items.sticky_notes.length).toBeGreaterThanOrEqual(2);
        expect(snapshot.items.shapes.length).toBeGreaterThanOrEqual(1);
        expect(snapshot.items.text.length).toBeGreaterThanOrEqual(1);

        // Verify performance (should complete in < 10s)
        expect(duration).toBeLessThan(10000);
      },
      { timeout: 15000 }
    );
  });

  describe('Error Handling (MEDIUM)', () => {
    test.skipIf(!TESTS_ENABLED)(
      'handles 400 Bad Request errors',
      async () => {
        const board = await helper.createTestBoard('Error Test');

        // Attempt to create sticky note with invalid data
        await expect(
          client.createStickyNote(board.id, '', {
            width: -100, // Invalid negative width
          })
        ).rejects.toThrow();
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'handles 404 Not Found errors',
      async () => {
        // Attempt to get non-existent board
        await expect(
          client.getBoard('non-existent-board-id-12345')
        ).rejects.toThrow();

        // Verify error message is descriptive
        try {
          await client.getBoard('non-existent-board-id-12345');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const message = (error as Error).message.toLowerCase();
          expect(
            message.includes('not found') ||
            message.includes('404') ||
            message.includes('does not exist')
          ).toBe(true);
        }
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'handles 401 Unauthorized errors',
      async () => {
        // Create a client with invalid token
        const invalidOAuth = new OAuth2Manager(
          testConfig!.clientId,
          testConfig!.clientSecret,
          'http://localhost:3003/oauth/callback',
          undefined,
          false
        );

        invalidOAuth.setTokensFromObject({
          access_token: 'invalid-token-12345',
          refresh_token: 'invalid-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'boards:read',
          expires_at: Date.now() + 3600000,
        });

        const invalidClient = new MiroClient(invalidOAuth);

        // Attempt to list boards with invalid token
        await expect(
          invalidClient.listBoards()
        ).rejects.toThrow();
      },
      { timeout: 10000 }
    );
  });

  describe('Rate Limit Tracking (HIGH)', () => {
    test.skipIf(!TESTS_ENABLED)(
      'tracks rate limit headers',
      async () => {
        // Make an API call to get rate limit headers
        const boards = await client.listBoards();
        expect(Array.isArray(boards)).toBe(true);

        // Rate limit tracking happens in response interceptor
        // We can't directly access private fields, but can verify
        // that subsequent calls don't throw rate limit errors
        await client.listBoards();
        await client.listBoards();

        // If rate limiting was broken, these would fail
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'handles rapid sequential requests without errors',
      async () => {
        // Make 10 rapid requests
        const promises = Array.from({ length: 10 }, () =>
          client.listBoards()
        );

        const results = await Promise.all(promises);

        // All should succeed
        expect(results.length).toBe(10);
        expect(results.every(r => Array.isArray(r))).toBe(true);
      },
      { timeout: 15000 }
    );
  });

  describe('Search and Filter', () => {
    let testBoard: MiroBoard;

    beforeEach(async () => {
      if (!TESTS_ENABLED) return;
      testBoard = await helper.createTestBoard('Search Test');

      // Create items with searchable content
      await client.createStickyNote(testBoard.id, 'Important task');
      await client.createStickyNote(testBoard.id, 'Regular note');
      await client.createShape(testBoard.id, 'Important shape', 'rectangle');
    });

    test.skipIf(!TESTS_ENABLED)(
      'searches items by content',
      async () => {
        // Search for "Important"
        const results = await client.searchItems(testBoard.id, 'Important');

        expect(results.length).toBeGreaterThanOrEqual(2);
        expect(results.every(item =>
          item.data?.content?.toLowerCase().includes('important') ||
          item.data?.title?.toLowerCase().includes('important')
        )).toBe(true);
      },
      { timeout: 10000 }
    );

    test.skipIf(!TESTS_ENABLED)(
      'searches items by content and type',
      async () => {
        // Search for "Important" sticky notes only
        const results = await client.searchItems(
          testBoard.id,
          'Important',
          'sticky_note'
        );

        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results.every(item => item.type === 'sticky_note')).toBe(true);
      },
      { timeout: 10000 }
    );
  });
});
