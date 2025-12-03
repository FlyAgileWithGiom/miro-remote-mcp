import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MiroClient } from '../../src/miro-client';

// Mock axios for unit tests
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

describe('MiroClient.getRateLimitStatus', () => {
  let client: MiroClient;

  beforeEach(() => {
    client = new MiroClient({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600000,
    });
  });

  it('should return initial rate limit status', () => {
    const status = client.getRateLimitStatus();

    expect(status.remaining).toBe(100);
    expect(status.threshold).toBe(10);
    expect(typeof status.resetAt).toBe('number');
  });

  it('should have configurable threshold', () => {
    const status = client.getRateLimitStatus();
    expect(status.threshold).toBe(10);
  });
});

describe('MiroClient.searchItems', () => {
  let client: MiroClient;
  const boardId = 'test-board-123';

  beforeEach(() => {
    client = new MiroClient({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600000,
    });
  });

  it('should filter items by content (case-insensitive)', async () => {
    const mockItems = [
      { id: '1', type: 'sticky_note', data: { content: 'Hello World' } },
      { id: '2', type: 'sticky_note', data: { content: 'Goodbye' } },
      { id: '3', type: 'shape', data: { content: 'Hello Again' } },
    ];

    vi.spyOn(client, 'listItems').mockResolvedValue(mockItems);

    const results = await client.searchItems(boardId, 'hello');

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('should return empty array when no matches', async () => {
    const mockItems = [
      { id: '1', type: 'sticky_note', data: { content: 'Hello World' } },
    ];

    vi.spyOn(client, 'listItems').mockResolvedValue(mockItems);

    const results = await client.searchItems(boardId, 'xyz');

    expect(results).toHaveLength(0);
  });

  it('should filter by type when provided', async () => {
    // Mock returns only sticky_notes (as real API would with type filter)
    const mockStickyNotes = [
      { id: '1', type: 'sticky_note', data: { content: 'Hello' } },
    ];

    const listItemsSpy = vi.spyOn(client, 'listItems').mockResolvedValue(mockStickyNotes);

    const results = await client.searchItems(boardId, 'hello', 'sticky_note');

    expect(listItemsSpy).toHaveBeenCalledWith(boardId, 'sticky_note');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('should handle items without content field', async () => {
    const mockItems = [
      { id: '1', type: 'frame', data: { title: 'My Frame' } },
      { id: '2', type: 'sticky_note', data: { content: 'Hello' } },
    ];

    vi.spyOn(client, 'listItems').mockResolvedValue(mockItems);

    const results = await client.searchItems(boardId, 'hello');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('2');
  });

  it('should search in frame titles', async () => {
    const mockItems = [
      { id: '1', type: 'frame', data: { title: 'Sprint Planning' } },
      { id: '2', type: 'frame', data: { title: 'Backlog' } },
    ];

    vi.spyOn(client, 'listItems').mockResolvedValue(mockItems);

    const results = await client.searchItems(boardId, 'sprint');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });
});
