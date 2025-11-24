/**
 * Integration tests for tools.ts
 * Tests tool routing and error propagation from MiroClient.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleToolCall, TOOL_DEFINITIONS } from '../../src/tools.js';
import type { MiroClient } from '../../src/miro-client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

describe('tools', () => {
  let mockMiroClient: MiroClient;

  beforeEach(() => {
    // Create a mock MiroClient with all required methods
    mockMiroClient = {
      verifyAuth: vi.fn().mockResolvedValue(true),
      listBoards: vi.fn().mockResolvedValue({ data: [{ id: 'board-1', name: 'Test Board' }] }),
      getBoard: vi.fn().mockResolvedValue({ id: 'board-1', name: 'Test Board' }),
      createBoard: vi.fn().mockResolvedValue({ id: 'new-board', name: 'New Board' }),
      listItems: vi.fn().mockResolvedValue({ data: [] }),
      getItem: vi.fn().mockResolvedValue({ id: 'item-1', type: 'sticky_note' }),
      updateItem: vi.fn().mockResolvedValue({ id: 'item-1', data: { content: 'Updated' } }),
      deleteItem: vi.fn().mockResolvedValue(undefined),
      createStickyNote: vi.fn().mockResolvedValue({ id: 'sticky-1', type: 'sticky_note' }),
      createShape: vi.fn().mockResolvedValue({ id: 'shape-1', type: 'shape' }),
      createText: vi.fn().mockResolvedValue({ id: 'text-1', type: 'text' }),
      createFrame: vi.fn().mockResolvedValue({ id: 'frame-1', type: 'frame' }),
      createConnector: vi.fn().mockResolvedValue({ id: 'connector-1', type: 'connector' }),
      updateConnector: vi.fn().mockResolvedValue({ id: 'connector-1', type: 'connector' }),
    } as unknown as MiroClient;
  });

  describe('TOOL_DEFINITIONS', () => {
    it('exports tool definitions array', () => {
      expect(Array.isArray(TOOL_DEFINITIONS)).toBe(true);
      expect(TOOL_DEFINITIONS.length).toBeGreaterThan(0);
    });

    it('all tools have required properties', () => {
      for (const tool of TOOL_DEFINITIONS) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
      }
    });

    it('contains expected tools', () => {
      const toolNames = TOOL_DEFINITIONS.map((t) => t.name);
      expect(toolNames).toContain('list_boards');
      expect(toolNames).toContain('get_board');
      expect(toolNames).toContain('create_board');
      expect(toolNames).toContain('create_sticky_note');
      expect(toolNames).toContain('create_connector');
    });
  });

  describe('handleToolCall - Board Operations', () => {
    it('routes list_boards correctly', async () => {
      const result = await handleToolCall('list_boards', {}, mockMiroClient);

      expect(mockMiroClient.listBoards).toHaveBeenCalled();
      expect(result).toEqual({ data: [{ id: 'board-1', name: 'Test Board' }] });
    });

    it('routes get_board with board_id', async () => {
      const result = await handleToolCall('get_board', { board_id: 'board-123' }, mockMiroClient);

      expect(mockMiroClient.getBoard).toHaveBeenCalledWith('board-123');
      expect(result).toHaveProperty('id', 'board-1');
    });

    it('routes create_board with name and description', async () => {
      const result = await handleToolCall(
        'create_board',
        { name: 'My Board', description: 'Test description' },
        mockMiroClient
      );

      expect(mockMiroClient.createBoard).toHaveBeenCalledWith('My Board', 'Test description');
      expect(result).toHaveProperty('id');
    });
  });

  describe('handleToolCall - Item Operations', () => {
    it('routes create_sticky_note with options', async () => {
      const args = {
        board_id: 'board-1',
        content: 'Hello',
        x: 100,
        y: 200,
        color: 'yellow',
      };

      const result = await handleToolCall('create_sticky_note', args, mockMiroClient);

      expect(mockMiroClient.createStickyNote).toHaveBeenCalledWith('board-1', 'Hello', {
        x: 100,
        y: 200,
        width: undefined,
        height: undefined,
        color: 'yellow',
        shape: undefined,
        parentId: undefined,
      });
      expect(result).toHaveProperty('type', 'sticky_note');
    });

    it('routes delete_item and returns success message', async () => {
      const result = await handleToolCall(
        'delete_item',
        { board_id: 'board-1', item_id: 'item-1' },
        mockMiroClient
      );

      expect(mockMiroClient.deleteItem).toHaveBeenCalledWith('board-1', 'item-1');
      expect(result).toEqual({ success: true, message: 'Item deleted successfully' });
    });
  });

  describe('handleToolCall - Error Handling', () => {
    it('throws McpError for unknown tool', async () => {
      await expect(handleToolCall('nonexistent_tool', {}, mockMiroClient)).rejects.toThrow(
        McpError
      );

      try {
        await handleToolCall('nonexistent_tool', {}, mockMiroClient);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        // Note: The error handler wraps all errors in InternalError
        // because the catch block re-throws even McpError as InternalError
        expect((error as McpError).code).toBe(ErrorCode.InternalError);
        expect((error as McpError).message).toContain('Unknown tool');
      }
    });

    it('propagates API errors as McpError', async () => {
      const apiError = new Error('API Error') as Error & {
        response?: { data?: object };
      };
      apiError.response = { data: { message: 'Rate limited' } };
      (mockMiroClient.listBoards as ReturnType<typeof vi.fn>).mockRejectedValueOnce(apiError);

      await expect(handleToolCall('list_boards', {}, mockMiroClient)).rejects.toThrow(McpError);

      try {
        await handleToolCall('list_boards', {}, mockMiroClient);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InternalError);
      }
    });

    it('handles generic errors gracefully', async () => {
      (mockMiroClient.listBoards as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Something went wrong')
      );

      await expect(handleToolCall('list_boards', {}, mockMiroClient)).rejects.toThrow(
        'Something went wrong'
      );
    });
  });

  describe('handleToolCall - Connector Operations', () => {
    it('routes create_connector with options', async () => {
      const args = {
        board_id: 'board-1',
        start_item_id: 'item-1',
        end_item_id: 'item-2',
        stroke_color: 'red',
        end_stroke_cap: 'arrow',
      };

      const result = await handleToolCall('create_connector', args, mockMiroClient);

      expect(mockMiroClient.createConnector).toHaveBeenCalledWith('board-1', 'item-1', 'item-2', {
        strokeColor: 'red',
        strokeWidth: undefined,
        endStrokeCap: 'arrow',
        caption: undefined,
      });
      expect(result).toHaveProperty('type', 'connector');
    });
  });
});
