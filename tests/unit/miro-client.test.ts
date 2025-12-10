import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MiroClient, MiroItem } from '../../src/miro-client';

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

describe('MiroClient Item Format Filtering', () => {
  let client: MiroClient;
  const boardId = 'test-board-123';

  // Full item with all fields
  const fullItem: MiroItem = {
    id: 'item-1',
    type: 'sticky_note',
    data: { content: 'Test content' },
    style: { fillColor: '#fff9b1' },
    position: {
      x: 100,
      y: 200,
      origin: 'center',
      relativeTo: 'canvas_center',
    },
    geometry: {
      width: 300,
      height: 150,
      rotation: 45,
    },
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-01-02T00:00:00Z',
    createdBy: { id: 'user-1', type: 'user' },
    modifiedBy: { id: 'user-2', type: 'user' },
    parent: { id: 'frame-1', links: { related: 'http://example.com' } },
    links: { self: 'http://example.com/item-1' },
  };

  beforeEach(() => {
    client = new MiroClient({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: Date.now() + 3600000,
    });
  });

  describe('format: minimal (default)', () => {
    it('should exclude createdAt, modifiedAt, createdBy, modifiedBy, links', async () => {
      // Mock the axios client to return full item
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId, undefined, 'minimal');

      expect(results).toHaveLength(1);
      const item = results[0];

      // Should NOT have these fields
      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('modifiedAt');
      expect(item).not.toHaveProperty('createdBy');
      expect(item).not.toHaveProperty('modifiedBy');
      expect(item).not.toHaveProperty('links');
    });

    it('should only include x, y in position (no origin, relativeTo)', async () => {
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId, undefined, 'minimal');
      const item = results[0];

      expect(item.position).toEqual({ x: 100, y: 200 });
      expect(item.position).not.toHaveProperty('origin');
      expect(item.position).not.toHaveProperty('relativeTo');
    });

    it('should only include width, height in geometry (no rotation)', async () => {
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId, undefined, 'minimal');
      const item = results[0];

      expect(item.geometry).toEqual({ width: 300, height: 150 });
      expect(item.geometry).not.toHaveProperty('rotation');
    });

    it('should exclude style in minimal format', async () => {
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId, undefined, 'minimal');
      const item = results[0];

      expect(item).not.toHaveProperty('style');
    });

    it('should exclude parent in minimal format', async () => {
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId, undefined, 'minimal');
      const item = results[0];

      expect(item).not.toHaveProperty('parent');
    });
  });

  describe('format: standard', () => {
    it('should include style', async () => {
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId, undefined, 'standard');
      const item = results[0];

      expect(item.style).toEqual({ fillColor: '#fff9b1' });
    });

    it('should include parent.id but not parent.links', async () => {
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId, undefined, 'standard');
      const item = results[0];

      expect(item.parent).toEqual({ id: 'frame-1' });
      expect(item.parent).not.toHaveProperty('links');
    });

    it('should still exclude metadata fields in standard format', async () => {
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId, undefined, 'standard');
      const item = results[0];

      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('modifiedAt');
      expect(item).not.toHaveProperty('links');
    });
  });

  describe('format: full', () => {
    it('should return unmodified item with all fields', async () => {
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId, undefined, 'full');
      const item = results[0];

      // Should have ALL fields
      expect(item).toEqual(fullItem);
      expect(item.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(item.modifiedAt).toBe('2024-01-02T00:00:00Z');
      expect(item.links).toEqual({ self: 'http://example.com/item-1' });
      expect(item.position?.origin).toBe('center');
      expect(item.geometry?.rotation).toBe(45);
    });
  });

  describe('default format parameter', () => {
    it('should default to minimal when format is not specified', async () => {
      const mockAxiosClient = (client as any).client;
      mockAxiosClient.get.mockResolvedValue({
        data: { data: [fullItem], cursor: undefined },
        headers: {},
      });

      const results = await client.listItems(boardId);
      const item = results[0];

      // Should behave like minimal
      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('style');
      expect(item.position).toEqual({ x: 100, y: 200 });
    });
  });

  describe('syncBoard with format filtering', () => {
    it('should apply format filtering to all item types', async () => {
      const mockAxiosClient = (client as any).client;

      // Mock different endpoints
      mockAxiosClient.get.mockImplementation((url: string) => {
        if (url.includes('/boards/')) {
          if (url.endsWith('/items')) {
            return Promise.resolve({
              data: { data: [fullItem], cursor: undefined },
              headers: {},
            });
          } else if (url.endsWith('/connectors')) {
            return Promise.resolve({
              data: { data: [fullItem], cursor: undefined },
              headers: {},
            });
          } else {
            // Board metadata
            return Promise.resolve({
              data: {
                id: boardId,
                name: 'Test Board',
                modifiedAt: '2024-01-01T00:00:00Z',
              },
              headers: {},
            });
          }
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await client.syncBoard(boardId, 'minimal');

      // Check connectors are filtered
      expect(result.items.connectors[0]).not.toHaveProperty('createdAt');
      expect(result.items.connectors[0].position).toEqual({ x: 100, y: 200 });
    });
  });

  describe('syncBoard with TOON output format', () => {
    it('should return compact TOON text format when output_format is toon', async () => {
      const mockAxiosClient = (client as any).client;

      // Mock different endpoints with various item types
      mockAxiosClient.get.mockImplementation((url: string, config?: any) => {
        if (url.includes('/boards/')) {
          if (url.includes('/items') && config?.params?.type === 'frame') {
            return Promise.resolve({
              data: {
                data: [
                  {
                    id: 'frame1',
                    type: 'frame',
                    position: { x: 0, y: 0 },
                    geometry: { width: 800, height: 600 },
                    data: { title: 'Test Frame' },
                  },
                ],
                cursor: undefined,
              },
              headers: {},
            });
          } else if (url.includes('/items') && config?.params?.type === 'sticky_note') {
            return Promise.resolve({
              data: {
                data: [
                  {
                    id: 'sticky1',
                    type: 'sticky_note',
                    position: { x: 100, y: 200 },
                    geometry: { width: 80, height: 100 },
                    style: { fillColor: 'light_yellow' },
                    data: { content: 'Hello world' },
                  },
                ],
                cursor: undefined,
              },
              headers: {},
            });
          } else if (url.includes('/items') && config?.params?.type === 'shape') {
            return Promise.resolve({
              data: {
                data: [
                  {
                    id: 'shape1',
                    type: 'shape',
                    position: { x: 300, y: 300 },
                    geometry: { width: 50, height: 50 },
                    data: { shape: 'rectangle', content: 'Label' },
                  },
                ],
                cursor: undefined,
              },
              headers: {},
            });
          } else if (url.includes('/items') && config?.params?.type === 'text') {
            return Promise.resolve({
              data: {
                data: [
                  {
                    id: 'text1',
                    type: 'text',
                    position: { x: 400, y: 400 },
                    geometry: { width: 200 },
                    data: { content: 'Some content' },
                  },
                ],
                cursor: undefined,
              },
              headers: {},
            });
          } else if (url.includes('/connectors')) {
            return Promise.resolve({
              data: {
                data: [
                  {
                    id: 'conn1',
                    type: 'connector',
                    data: {
                      startItem: { id: 'sticky1' },
                      endItem: { id: 'shape1' },
                      endStrokeCap: 'stealth',
                    },
                  },
                ],
                cursor: undefined,
              },
              headers: {},
            });
          } else {
            // Board metadata
            return Promise.resolve({
              data: {
                id: boardId,
                name: 'Test Board',
                modifiedAt: '2024-01-01T00:00:00Z',
              },
              headers: {},
            });
          }
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await client.syncBoard(boardId, 'standard', 'toon');

      // Result should be a string in TOON format
      expect(typeof result).toBe('string');

      const lines = (result as string).split('\n');

      // Check header line
      expect(lines[0]).toMatch(/^# board:.*"Test Board" mod:2024-01-01T00:00:00Z count:5$/);

      // Check sections exist
      expect(result).toContain('## frames (1)');
      expect(result).toContain('## sticky_notes (1)');
      expect(result).toContain('## shapes (1)');
      expect(result).toContain('## text (1)');
      expect(result).toContain('## connectors (1)');

      // Check item formats
      expect(result).toContain('frame|frame1|0,0|800x600|Test Frame');
      expect(result).toContain('sticky_note|sticky1|100,200|80x100|light_yellow|Hello world');
      expect(result).toContain('shape|shape1|300,300|50x50|rectangle|Label');
      expect(result).toContain('text|text1|400,400|200x0|Some content');
      expect(result).toContain('connector|conn1|||sticky1->shape1|stealth');
    });

    it('should handle edge cases in TOON format', async () => {
      const mockAxiosClient = (client as any).client;

      mockAxiosClient.get.mockImplementation((url: string, config?: any) => {
        if (url.includes('/boards/')) {
          if (url.includes('/items') && config?.params?.type === 'sticky_note') {
            return Promise.resolve({
              data: {
                data: [
                  {
                    id: 'sticky1',
                    type: 'sticky_note',
                    position: { x: 100, y: 200 },
                    geometry: { width: 80, height: 100 },
                    style: { fillColor: 'light_yellow' },
                    data: { content: 'Line 1\nLine 2|with pipe' },
                  },
                ],
                cursor: undefined,
              },
              headers: {},
            });
          } else if (url.includes('/items') && config?.params?.type) {
            // Other item types return empty
            return Promise.resolve({ data: { data: [], cursor: undefined }, headers: {} });
          } else if (url.includes('/connectors')) {
            return Promise.resolve({ data: { data: [], cursor: undefined }, headers: {} });
          } else {
            return Promise.resolve({
              data: {
                id: boardId,
                name: 'Test Board',
                modifiedAt: '2024-01-01T00:00:00Z',
              },
              headers: {},
            });
          }
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await client.syncBoard(boardId, 'minimal', 'toon');

      // Check that newlines and pipes are escaped
      expect(result).toContain('Line 1\\nLine 2\\|with pipe');
    });

    it('should return JSON format by default', async () => {
      const mockAxiosClient = (client as any).client;

      mockAxiosClient.get.mockImplementation((url: string) => {
        if (url.includes('/boards/')) {
          if (url.endsWith('/items')) {
            return Promise.resolve({ data: { data: [], cursor: undefined }, headers: {} });
          } else if (url.endsWith('/connectors')) {
            return Promise.resolve({ data: { data: [], cursor: undefined }, headers: {} });
          } else {
            return Promise.resolve({
              data: {
                id: boardId,
                name: 'Test Board',
                modifiedAt: '2024-01-01T00:00:00Z',
              },
              headers: {},
            });
          }
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const result = await client.syncBoard(boardId, 'minimal');

      // Result should be an object (JSON), not a string
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('items');
    });
  });

  describe('listItems with TOON output format', () => {
    it('should return compact TOON text format when output_format is toon', async () => {
      const mockAxiosClient = (client as any).client;

      mockAxiosClient.get.mockResolvedValue({
        data: {
          data: [
            {
              id: 'sticky1',
              type: 'sticky_note',
              position: { x: 100, y: 200 },
              geometry: { width: 80, height: 100 },
              style: { fillColor: 'yellow' },
              data: { content: 'Hello world' },
            },
            {
              id: 'shape1',
              type: 'shape',
              position: { x: 300, y: 400 },
              geometry: { width: 50, height: 50 },
              data: { shape: 'rectangle', content: 'Label' },
            },
          ],
          cursor: undefined,
        },
        headers: {},
      });

      const result = await client.listItems(boardId, undefined, 'minimal', 'toon');

      // Result should be a string in TOON format
      expect(typeof result).toBe('string');

      const lines = (result as string).split('\n');

      // Check header line
      expect(lines[0]).toBe('# items count:2');

      // Check item formats
      expect(result).toContain('sticky_note|sticky1|100,200|80x100|yellow|Hello world');
      expect(result).toContain('shape|shape1|300,400|50x50|rectangle|Label');
    });

    it('should return empty count header when no items', async () => {
      const mockAxiosClient = (client as any).client;

      mockAxiosClient.get.mockResolvedValue({
        data: {
          data: [],
          cursor: undefined,
        },
        headers: {},
      });

      const result = await client.listItems(boardId, undefined, 'minimal', 'toon');

      expect(result).toBe('# items count:0');
    });

    it('should handle type filtering with TOON format', async () => {
      const mockAxiosClient = (client as any).client;

      mockAxiosClient.get.mockResolvedValue({
        data: {
          data: [
            {
              id: 'sticky1',
              type: 'sticky_note',
              position: { x: 100, y: 200 },
              geometry: { width: 80, height: 100 },
              style: { fillColor: 'light_yellow' },
              data: { content: 'Test' },
            },
          ],
          cursor: undefined,
        },
        headers: {},
      });

      const result = await client.listItems(boardId, 'sticky_note', 'minimal', 'toon');

      expect(typeof result).toBe('string');
      expect(result).toContain('# items count:1');
      expect(result).toContain('sticky_note|sticky1|100,200|80x100|light_yellow|Test');
    });

    it('should default to JSON format when output_format is not specified', async () => {
      const mockAxiosClient = (client as any).client;

      mockAxiosClient.get.mockResolvedValue({
        data: {
          data: [
            {
              id: 'sticky1',
              type: 'sticky_note',
              position: { x: 100, y: 200 },
              data: { content: 'Test' },
            },
          ],
          cursor: undefined,
        },
        headers: {},
      });

      const result = await client.listItems(boardId);

      // Result should be an array (JSON), not a string
      expect(Array.isArray(result)).toBe(true);
      expect((result as any)[0].id).toBe('sticky1');
    });
  });

  describe('searchItems with TOON output format', () => {
    it('should return filtered items in TOON format when output_format is toon', async () => {
      const mockItems = [
        {
          id: 'sticky1',
          type: 'sticky_note',
          position: { x: 100, y: 200 },
          geometry: { width: 80, height: 100 },
          style: { fillColor: 'yellow' },
          data: { content: 'Hello world' },
        },
        {
          id: 'sticky2',
          type: 'sticky_note',
          position: { x: 150, y: 250 },
          geometry: { width: 80, height: 100 },
          style: { fillColor: 'pink' },
          data: { content: 'Goodbye' },
        },
        {
          id: 'sticky3',
          type: 'sticky_note',
          position: { x: 200, y: 300 },
          geometry: { width: 80, height: 100 },
          style: { fillColor: 'green' },
          data: { content: 'Hello again' },
        },
      ];

      vi.spyOn(client, 'listItems').mockResolvedValue(mockItems);

      const result = await client.searchItems(boardId, 'hello', undefined, 'toon');

      // Result should be a string in TOON format
      expect(typeof result).toBe('string');

      const lines = (result as string).split('\n');

      // Check header line - should only contain items matching 'hello'
      expect(lines[0]).toBe('# items count:2');

      // Check filtered items are in TOON format
      expect(result).toContain('sticky_note|sticky1|100,200|80x100|yellow|Hello world');
      expect(result).toContain('sticky_note|sticky3|200,300|80x100|green|Hello again');
      expect(result).not.toContain('Goodbye');
    });

    it('should return empty count when search has no matches', async () => {
      const mockItems = [
        {
          id: 'sticky1',
          type: 'sticky_note',
          data: { content: 'Hello' },
        },
      ];

      vi.spyOn(client, 'listItems').mockResolvedValue(mockItems);

      const result = await client.searchItems(boardId, 'xyz', undefined, 'toon');

      expect(result).toBe('# items count:0');
    });

    it('should default to JSON format when output_format is not specified', async () => {
      const mockItems = [
        {
          id: 'sticky1',
          type: 'sticky_note',
          data: { content: 'Hello world' },
        },
      ];

      vi.spyOn(client, 'listItems').mockResolvedValue(mockItems);

      const result = await client.searchItems(boardId, 'hello');

      // Result should be an array (JSON), not a string
      expect(Array.isArray(result)).toBe(true);
      expect((result as any)[0].id).toBe('sticky1');
    });
  });
});
