import { MiroClient } from './miro-client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const TOOL_DEFINITIONS = [
  // Board Operations
  {
    name: 'list_boards',
    description: 'List all accessible Miro boards',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_board',
    description: 'Get details of a specific Miro board',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board to retrieve',
        },
      },
      required: ['board_id'],
    },
  },
  {
    name: 'create_board',
    description: 'Create a new Miro board',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the new board',
        },
        description: {
          type: 'string',
          description: 'Optional description for the board',
        },
      },
      required: ['name'],
    },
  },

  // Item Operations
  {
    name: 'list_items',
    description: 'List all items on a board with optional type filtering',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        type: {
          type: 'string',
          description: 'Optional item type filter (frame, sticky_note, shape, text, connector)',
          enum: ['frame', 'sticky_note', 'shape', 'text', 'connector'],
        },
      },
      required: ['board_id'],
    },
  },
  {
    name: 'get_item',
    description: 'Get details of a specific item on a board',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        item_id: {
          type: 'string',
          description: 'The ID of the item',
        },
      },
      required: ['board_id', 'item_id'],
    },
  },
  {
    name: 'update_item',
    description: 'Update item properties (position, content, style)',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        item_id: {
          type: 'string',
          description: 'The ID of the item',
        },
        updates: {
          type: 'object',
          description: 'Object containing properties to update (data, style, position, geometry)',
        },
      },
      required: ['board_id', 'item_id', 'updates'],
    },
  },
  {
    name: 'delete_item',
    description: 'Delete an item from a board',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        item_id: {
          type: 'string',
          description: 'The ID of the item to delete',
        },
      },
      required: ['board_id', 'item_id'],
    },
  },

  // Item Creation
  {
    name: 'create_sticky_note',
    description: 'Create a sticky note with custom content, position, and color',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        content: {
          type: 'string',
          description: 'HTML content for the sticky note',
        },
        x: {
          type: 'number',
          description: 'X coordinate (default: 0)',
        },
        y: {
          type: 'number',
          description: 'Y coordinate (default: 0)',
        },
        width: {
          type: 'number',
          description: 'Width in pixels (default: 200)',
        },
        height: {
          type: 'number',
          description: 'Height in pixels (default: 200)',
        },
        color: {
          type: 'string',
          description: 'Fill color (default: light_yellow)',
          enum: ['light_yellow', 'yellow', 'orange', 'light_green', 'green', 'dark_green', 'cyan', 'light_pink', 'pink', 'violet', 'red', 'light_blue', 'blue', 'dark_blue', 'gray'],
        },
        shape: {
          type: 'string',
          description: 'Shape type (default: square)',
          enum: ['square', 'rectangle'],
        },
      },
      required: ['board_id', 'content'],
    },
  },
  {
    name: 'create_shape',
    description: 'Create a shape (rectangle, circle, flowchart symbols) with custom styling',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        content: {
          type: 'string',
          description: 'HTML content for the shape',
        },
        shape_type: {
          type: 'string',
          description: 'Type of shape to create',
          enum: ['rectangle', 'circle', 'triangle', 'rhombus', 'parallelogram', 'trapezoid', 'pentagon', 'hexagon', 'octagon', 'wedge_round_rectangle_callout', 'star', 'flow_chart_predefined_process', 'cloud', 'cross', 'can', 'right_arrow', 'left_arrow', 'left_right_arrow', 'left_brace', 'right_brace'],
        },
        x: {
          type: 'number',
          description: 'X coordinate (default: 0)',
        },
        y: {
          type: 'number',
          description: 'Y coordinate (default: 0)',
        },
        width: {
          type: 'number',
          description: 'Width in pixels (default: 300)',
        },
        height: {
          type: 'number',
          description: 'Height in pixels (default: 150)',
        },
        fill_color: {
          type: 'string',
          description: 'Fill color (default: light_blue)',
        },
        border_color: {
          type: 'string',
          description: 'Border color (default: blue)',
        },
        border_width: {
          type: 'string',
          description: 'Border width (default: "2")',
        },
      },
      required: ['board_id', 'content', 'shape_type'],
    },
  },
  {
    name: 'create_text',
    description: 'Create a text item',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        content: {
          type: 'string',
          description: 'HTML content for the text',
        },
        x: {
          type: 'number',
          description: 'X coordinate (default: 0)',
        },
        y: {
          type: 'number',
          description: 'Y coordinate (default: 0)',
        },
        width: {
          type: 'number',
          description: 'Width in pixels (default: 300)',
        },
      },
      required: ['board_id', 'content'],
    },
  },
  {
    name: 'create_frame',
    description: 'Create a frame for grouping content',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        title: {
          type: 'string',
          description: 'Title of the frame',
        },
        x: {
          type: 'number',
          description: 'X coordinate (default: 0)',
        },
        y: {
          type: 'number',
          description: 'Y coordinate (default: 0)',
        },
        width: {
          type: 'number',
          description: 'Width in pixels (default: 1000)',
        },
        height: {
          type: 'number',
          description: 'Height in pixels (default: 800)',
        },
        fill_color: {
          type: 'string',
          description: 'Fill color (default: light_gray)',
        },
      },
      required: ['board_id', 'title'],
    },
  },

  // Connectors
  {
    name: 'create_connector',
    description: 'Create a line or arrow connecting two items',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        start_item_id: {
          type: 'string',
          description: 'ID of the starting item',
        },
        end_item_id: {
          type: 'string',
          description: 'ID of the ending item',
        },
        stroke_color: {
          type: 'string',
          description: 'Line color (default: blue)',
        },
        stroke_width: {
          type: 'string',
          description: 'Line width (default: "2")',
        },
        end_stroke_cap: {
          type: 'string',
          description: 'End cap style (default: arrow)',
          enum: ['none', 'stealth', 'rounded_stealth', 'diamond', 'filled_diamond', 'oval', 'filled_oval', 'arrow', 'triangle', 'filled_triangle', 'erd_one', 'erd_many', 'erd_only_one', 'erd_zero_or_one', 'erd_one_or_many', 'erd_zero_or_many'],
        },
        caption: {
          type: 'string',
          description: 'Optional caption text for the connector',
        },
      },
      required: ['board_id', 'start_item_id', 'end_item_id'],
    },
  },
  {
    name: 'update_connector',
    description: 'Update connector styling',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: {
          type: 'string',
          description: 'The ID of the board',
        },
        connector_id: {
          type: 'string',
          description: 'ID of the connector to update',
        },
        stroke_color: {
          type: 'string',
          description: 'New line color',
        },
        stroke_width: {
          type: 'string',
          description: 'New line width',
        },
        end_stroke_cap: {
          type: 'string',
          description: 'New end cap style',
          enum: ['none', 'stealth', 'rounded_stealth', 'diamond', 'filled_diamond', 'oval', 'filled_oval', 'arrow', 'triangle', 'filled_triangle', 'erd_one', 'erd_many', 'erd_only_one', 'erd_zero_or_one', 'erd_one_or_many', 'erd_zero_or_many'],
        },
      },
      required: ['board_id', 'connector_id'],
    },
  },
];

export async function handleToolCall(name: string, args: any, miroClient: MiroClient): Promise<any> {
  try {
    switch (name) {
      // Board Operations
      case 'list_boards':
        return await miroClient.listBoards();

      case 'get_board':
        return await miroClient.getBoard(args.board_id);

      case 'create_board':
        return await miroClient.createBoard(args.name, args.description);

      // Item Operations
      case 'list_items':
        return await miroClient.listItems(args.board_id, args.type);

      case 'get_item':
        return await miroClient.getItem(args.board_id, args.item_id);

      case 'update_item':
        return await miroClient.updateItem(args.board_id, args.item_id, args.updates);

      case 'delete_item':
        await miroClient.deleteItem(args.board_id, args.item_id);
        return { success: true, message: 'Item deleted successfully' };

      // Item Creation
      case 'create_sticky_note':
        return await miroClient.createStickyNote(args.board_id, args.content, {
          x: args.x,
          y: args.y,
          width: args.width,
          height: args.height,
          color: args.color,
          shape: args.shape,
        });

      case 'create_shape':
        return await miroClient.createShape(args.board_id, args.content, args.shape_type, {
          x: args.x,
          y: args.y,
          width: args.width,
          height: args.height,
          fillColor: args.fill_color,
          borderColor: args.border_color,
          borderWidth: args.border_width,
        });

      case 'create_text':
        return await miroClient.createText(args.board_id, args.content, {
          x: args.x,
          y: args.y,
          width: args.width,
        });

      case 'create_frame':
        return await miroClient.createFrame(args.board_id, args.title, {
          x: args.x,
          y: args.y,
          width: args.width,
          height: args.height,
          fillColor: args.fill_color,
        });

      // Connectors
      case 'create_connector':
        return await miroClient.createConnector(
          args.board_id,
          args.start_item_id,
          args.end_item_id,
          {
            strokeColor: args.stroke_color,
            strokeWidth: args.stroke_width,
            endStrokeCap: args.end_stroke_cap,
            caption: args.caption,
          }
        );

      case 'update_connector':
        return await miroClient.updateConnector(args.board_id, args.connector_id, {
          strokeColor: args.stroke_color,
          strokeWidth: args.stroke_width,
          endStrokeCap: args.end_stroke_cap,
        });

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    if (error.response?.data) {
      throw new McpError(
        ErrorCode.InternalError,
        `Miro API error: ${JSON.stringify(error.response.data)}`
      );
    }
    throw new McpError(ErrorCode.InternalError, error.message || 'Unknown error occurred');
  }
}
