import { MiroClient } from './miro-client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { BatchCreator } from './layouts/batch-creator.js';
import { LayoutOptions } from './layouts/types.js';

// Common schema definitions to eliminate duplication
const SCHEMAS = {
  BOARD_ID: {
    type: 'string' as const,
    description: 'The ID of the board',
  },
  ITEM_ID: {
    type: 'string' as const,
    description: 'The ID of the item',
  },
  CONTENT: {
    type: 'string' as const,
    description: 'HTML content',
  },
  X: {
    type: 'number' as const,
    description: 'X coordinate (default: 0)',
  },
  Y: {
    type: 'number' as const,
    description: 'Y coordinate (default: 0)',
  },
  WIDTH: {
    type: 'number' as const,
    description: 'Width in pixels',
  },
  HEIGHT: {
    type: 'number' as const,
    description: 'Height in pixels',
  },
  PARENT_ID: {
    type: 'string' as const,
    description: 'Optional ID of parent frame to place this item inside',
  },
  FILL_COLOR: {
    type: 'string' as const,
    description: 'Fill color',
  },
  BORDER_COLOR: {
    type: 'string' as const,
    description: 'Border color',
  },
  BORDER_WIDTH: {
    type: 'string' as const,
    description: 'Border width',
  },
  STROKE_COLOR: {
    type: 'string' as const,
    description: 'Line color',
  },
  STROKE_WIDTH: {
    type: 'string' as const,
    description: 'Line width',
  },
  FONT_FAMILY: {
    type: 'string' as const,
    description: 'Font family (e.g., "open_sans", "arial", "noto_sans")',
  },
  FONT_SIZE: {
    type: 'string' as const,
    description: 'Font size as string (e.g., "14", "24", "36")',
  },
  TEXT_COLOR: {
    type: 'string' as const,
    description: 'Text color in hex format (e.g., "#1a1a1a")',
  },
  SHAPE_TYPE: {
    type: 'string' as const,
    description: 'Type of shape to create',
    enum: ['rectangle', 'circle', 'triangle', 'rhombus', 'parallelogram', 'trapezoid', 'pentagon', 'hexagon', 'octagon', 'wedge_round_rectangle_callout', 'star', 'flow_chart_predefined_process', 'cloud', 'cross', 'can', 'right_arrow', 'left_arrow', 'left_right_arrow', 'left_brace', 'right_brace'] as const,
  },
  END_STROKE_CAP: {
    type: 'string' as const,
    description: 'End cap style',
    enum: ['none', 'stealth', 'rounded_stealth', 'diamond', 'filled_diamond', 'oval', 'filled_oval', 'arrow', 'triangle', 'filled_triangle', 'erd_one', 'erd_many', 'erd_only_one', 'erd_zero_or_one', 'erd_one_or_many', 'erd_zero_or_many'] as const,
  },
} as const;

export const TOOL_DEFINITIONS = [
  // Authentication
  {
    name: 'get_auth_status',
    description: 'Get authorization status for Miro. Returns whether authenticated and provides authorization URL when not authenticated.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

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
        board_id: SCHEMAS.BOARD_ID,
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
  {
    name: 'sync_board',
    description: 'Retrieve complete board snapshot in single request. Returns all items organized by type with board metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        format: {
          type: 'string',
          description: 'Output detail level (default: minimal)',
          enum: ['minimal', 'standard', 'full'],
        },
        output_format: {
          type: 'string',
          description: 'Output format (default: json). Use toon for compact text representation (~40% additional reduction)',
          enum: ['json', 'toon'],
        },
      },
      required: ['board_id'],
    },
  },

  // Item Operations
  {
    name: 'list_items',
    description: 'List all items on a board with optional type filtering',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        type: {
          type: 'string',
          description: 'Optional item type filter (frame, sticky_note, shape, text)',
          enum: ['frame', 'sticky_note', 'shape', 'text'],
        },
        format: {
          type: 'string',
          description: 'Output detail level (default: minimal)',
          enum: ['minimal', 'standard', 'full'],
        },
      },
      required: ['board_id'],
    },
  },
  {
    name: 'search_items',
    description: 'Search items by content text (case-insensitive). Searches in sticky note/shape content and frame titles.',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        query: {
          type: 'string',
          description: 'Text to search for in item content/titles',
        },
        type: {
          type: 'string',
          description: 'Optional item type filter',
          enum: ['frame', 'sticky_note', 'shape', 'text'],
        },
      },
      required: ['board_id', 'query'],
    },
  },
  {
    name: 'get_item',
    description: 'Get details of a specific item on a board',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        item_id: SCHEMAS.ITEM_ID,
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
        board_id: SCHEMAS.BOARD_ID,
        item_id: SCHEMAS.ITEM_ID,
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
        board_id: SCHEMAS.BOARD_ID,
        item_id: SCHEMAS.ITEM_ID,
      },
      required: ['board_id', 'item_id'],
    },
  },
  {
    name: 'batch_update_items',
    description: 'Update multiple items atomically in parallel. Reduces latency for bulk position/style updates. Individual failures do not block other updates.',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        updates: {
          type: 'array',
          description: 'Array of item updates (max 50 items)',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Item ID to update',
              },
              position: {
                type: 'object',
                description: 'Position update (x, y coordinates)',
                properties: {
                  x: SCHEMAS.X,
                  y: SCHEMAS.Y,
                },
              },
              style: {
                type: 'object',
                description: 'Style update (fillColor, borderColor, etc.)',
              },
              data: {
                type: 'object',
                description: 'Data update (content, etc.)',
              },
              geometry: {
                type: 'object',
                description: 'Geometry update (width, height, rotation)',
                properties: {
                  width: SCHEMAS.WIDTH,
                  height: SCHEMAS.HEIGHT,
                  rotation: { type: 'number' },
                },
              },
            },
            required: ['id'],
          },
        },
      },
      required: ['board_id', 'updates'],
    },
  },

  // Item Creation
  {
    name: 'create_sticky_note',
    description: 'Create a sticky note with custom content, position, and color',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        content: SCHEMAS.CONTENT,
        x: SCHEMAS.X,
        y: SCHEMAS.Y,
        width: SCHEMAS.WIDTH,
        height: SCHEMAS.HEIGHT,
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
        parent_id: SCHEMAS.PARENT_ID,
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
        board_id: SCHEMAS.BOARD_ID,
        content: SCHEMAS.CONTENT,
        shape_type: SCHEMAS.SHAPE_TYPE,
        x: SCHEMAS.X,
        y: SCHEMAS.Y,
        width: SCHEMAS.WIDTH,
        height: SCHEMAS.HEIGHT,
        fill_color: SCHEMAS.FILL_COLOR,
        border_color: SCHEMAS.BORDER_COLOR,
        border_width: SCHEMAS.BORDER_WIDTH,
        font_family: SCHEMAS.FONT_FAMILY,
        font_size: SCHEMAS.FONT_SIZE,
        text_color: SCHEMAS.TEXT_COLOR,
        parent_id: SCHEMAS.PARENT_ID,
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
        board_id: SCHEMAS.BOARD_ID,
        content: SCHEMAS.CONTENT,
        x: SCHEMAS.X,
        y: SCHEMAS.Y,
        width: SCHEMAS.WIDTH,
        font_family: SCHEMAS.FONT_FAMILY,
        font_size: SCHEMAS.FONT_SIZE,
        text_color: SCHEMAS.TEXT_COLOR,
        text_align: {
          type: 'string',
          description: 'Text alignment (left, center, right)',
          enum: ['left', 'center', 'right'],
        },
        parent_id: SCHEMAS.PARENT_ID,
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
        board_id: SCHEMAS.BOARD_ID,
        title: {
          type: 'string',
          description: 'Title of the frame',
        },
        x: SCHEMAS.X,
        y: SCHEMAS.Y,
        width: SCHEMAS.WIDTH,
        height: SCHEMAS.HEIGHT,
        fill_color: SCHEMAS.FILL_COLOR,
      },
      required: ['board_id', 'title'],
    },
  },

  // Batch Creation with Layouts
  {
    name: 'batch_create_sticky_notes',
    description: 'Create multiple sticky notes with automatic layout (grid, row, column, tree, radial). Reduces conversation verbosity 10x for creating similar items.',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        items: {
          type: 'array',
          description: 'Array of sticky notes to create',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'HTML content' },
              width: { type: 'number', description: 'Width (optional)' },
              height: { type: 'number', description: 'Height (optional)' },
              color: { type: 'string', description: 'Color name (optional)' },
            },
            required: ['content'],
          },
        },
        layout: {
          type: 'string',
          description: 'Layout algorithm: grid (NxM), row (horizontal), column (vertical), tree (hierarchy), radial (circle)',
          enum: ['grid', 'row', 'column', 'tree', 'radial'],
        },
        spacing: { type: 'number', description: 'Space between items (default: 50)' },
        start_x: { type: 'number', description: 'Starting X coordinate (default: 0)' },
        start_y: { type: 'number', description: 'Starting Y coordinate (default: 0)' },
        rows: { type: 'number', description: 'Grid rows (auto-calculated if omitted)' },
        cols: { type: 'number', description: 'Grid columns (auto-calculated if omitted)' },
        radius: { type: 'number', description: 'Radial layout radius (default: 300)' },
        orientation: { type: 'string', enum: ['vertical', 'horizontal'], description: 'Tree orientation (default: vertical)' },
        parent_id: SCHEMAS.PARENT_ID,
      },
      required: ['board_id', 'items', 'layout'],
    },
  },
  {
    name: 'batch_create_shapes',
    description: 'Create multiple shapes with automatic layout (grid, row, column, tree, radial).',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        items: {
          type: 'array',
          description: 'Array of shapes to create',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'HTML content' },
              width: { type: 'number', description: 'Width (optional)' },
              height: { type: 'number', description: 'Height (optional)' },
            },
            required: ['content'],
          },
        },
        shape_type: {
          type: 'string',
          description: 'Shape type for all items',
          enum: ['rectangle', 'circle', 'triangle', 'rhombus'],
        },
        layout: {
          type: 'string',
          description: 'Layout algorithm',
          enum: ['grid', 'row', 'column', 'tree', 'radial'],
        },
        spacing: { type: 'number', description: 'Space between items (default: 50)' },
        start_x: { type: 'number', description: 'Starting X coordinate (default: 0)' },
        start_y: { type: 'number', description: 'Starting Y coordinate (default: 0)' },
        rows: { type: 'number', description: 'Grid rows (auto-calculated if omitted)' },
        cols: { type: 'number', description: 'Grid columns (auto-calculated if omitted)' },
        radius: { type: 'number', description: 'Radial layout radius (default: 300)' },
        orientation: { type: 'string', enum: ['vertical', 'horizontal'], description: 'Tree orientation' },
        parent_id: SCHEMAS.PARENT_ID,
      },
      required: ['board_id', 'items', 'shape_type', 'layout'],
    },
  },
  {
    name: 'batch_create_text',
    description: 'Create multiple text items with automatic layout (grid, row, column, tree, radial).',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        items: {
          type: 'array',
          description: 'Array of text items to create',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'HTML content' },
              width: { type: 'number', description: 'Width (optional)' },
            },
            required: ['content'],
          },
        },
        layout: {
          type: 'string',
          description: 'Layout algorithm',
          enum: ['grid', 'row', 'column', 'tree', 'radial'],
        },
        spacing: { type: 'number', description: 'Space between items (default: 50)' },
        start_x: { type: 'number', description: 'Starting X coordinate (default: 0)' },
        start_y: { type: 'number', description: 'Starting Y coordinate (default: 0)' },
        rows: { type: 'number', description: 'Grid rows (auto-calculated if omitted)' },
        cols: { type: 'number', description: 'Grid columns (auto-calculated if omitted)' },
        radius: { type: 'number', description: 'Radial layout radius (default: 300)' },
        orientation: { type: 'string', enum: ['vertical', 'horizontal'], description: 'Tree orientation' },
        parent_id: SCHEMAS.PARENT_ID,
      },
      required: ['board_id', 'items', 'layout'],
    },
  },

  // Connectors
  {
    name: 'create_connector',
    description: 'Create a line or arrow connecting two items',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: SCHEMAS.BOARD_ID,
        start_item_id: {
          type: 'string',
          description: 'ID of the starting item',
        },
        end_item_id: {
          type: 'string',
          description: 'ID of the ending item',
        },
        stroke_color: SCHEMAS.STROKE_COLOR,
        stroke_width: SCHEMAS.STROKE_WIDTH,
        end_stroke_cap: SCHEMAS.END_STROKE_CAP,
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
        board_id: SCHEMAS.BOARD_ID,
        connector_id: {
          type: 'string',
          description: 'ID of the connector to update',
        },
        stroke_color: SCHEMAS.STROKE_COLOR,
        stroke_width: SCHEMAS.STROKE_WIDTH,
        end_stroke_cap: SCHEMAS.END_STROKE_CAP,
      },
      required: ['board_id', 'connector_id'],
    },
  },
];

export async function handleToolCall(name: string, args: any, miroClient: MiroClient): Promise<any> {
  try {
    switch (name) {
      // Authentication
      case 'get_auth_status': {
        // Access private oauth property using type assertion
        const oauth = (miroClient as any).oauth;
        const hasTokens = oauth?.hasTokens() ?? false;

        if (hasTokens) {
          return { status: 'authorized' };
        }

        const baseUri = process.env.BASE_URI || 'http://localhost:3000';
        return {
          status: 'not_authorized',
          authorize_url: `${baseUri}/oauth/authorize`,
        };
      }

      // Board Operations
      case 'list_boards':
        return await miroClient.listBoards();

      case 'get_board':
        return await miroClient.getBoard(args.board_id);

      case 'create_board':
        return await miroClient.createBoard(args.name, args.description);

      case 'sync_board':
        return await miroClient.syncBoard(args.board_id, args.format, args.output_format);

      // Item Operations
      case 'list_items':
        return await miroClient.listItems(args.board_id, args.type, args.format);

      case 'search_items':
        return await miroClient.searchItems(args.board_id, args.query, args.type);

      case 'get_item':
        return await miroClient.getItem(args.board_id, args.item_id);

      case 'update_item':
        return await miroClient.updateItem(args.board_id, args.item_id, args.updates);

      case 'delete_item':
        await miroClient.deleteItem(args.board_id, args.item_id);
        return { success: true, message: 'Item deleted successfully' };

      case 'batch_update_items':
        return await miroClient.batchUpdateItems(args.board_id, args.updates);

      // Item Creation
      case 'create_sticky_note':
        return await miroClient.createStickyNote(args.board_id, args.content, {
          x: args.x,
          y: args.y,
          width: args.width,
          height: args.height,
          color: args.color,
          shape: args.shape,
          parentId: args.parent_id,
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
          fontFamily: args.font_family,
          fontSize: args.font_size,
          textColor: args.text_color,
          parentId: args.parent_id,
        });

      case 'create_text':
        return await miroClient.createText(args.board_id, args.content, {
          x: args.x,
          y: args.y,
          width: args.width,
          fontFamily: args.font_family,
          fontSize: args.font_size,
          textColor: args.text_color,
          textAlign: args.text_align,
          parentId: args.parent_id,
        });

      case 'create_frame':
        return await miroClient.createFrame(args.board_id, args.title, {
          x: args.x,
          y: args.y,
          width: args.width,
          height: args.height,
          fillColor: args.fill_color,
        });

      // Batch Creation with Layouts
      case 'batch_create_sticky_notes': {
        const batchCreator = new BatchCreator(miroClient);
        const layoutOptions: LayoutOptions = {
          layout: args.layout,
          spacing: args.spacing,
          startX: args.start_x,
          startY: args.start_y,
          rows: args.rows,
          cols: args.cols,
          radius: args.radius,
          orientation: args.orientation,
        };
        return await batchCreator.createWithLayout(
          args.board_id,
          args.items,
          'sticky_note',
          layoutOptions,
          { parentId: args.parent_id }
        );
      }

      case 'batch_create_shapes': {
        const batchCreator = new BatchCreator(miroClient);
        const layoutOptions: LayoutOptions = {
          layout: args.layout,
          spacing: args.spacing,
          startX: args.start_x,
          startY: args.start_y,
          rows: args.rows,
          cols: args.cols,
          radius: args.radius,
          orientation: args.orientation,
        };
        return await batchCreator.createWithLayout(
          args.board_id,
          args.items,
          'shape',
          layoutOptions,
          { parentId: args.parent_id, shapeType: args.shape_type }
        );
      }

      case 'batch_create_text': {
        const batchCreator = new BatchCreator(miroClient);
        const layoutOptions: LayoutOptions = {
          layout: args.layout,
          spacing: args.spacing,
          startX: args.start_x,
          startY: args.start_y,
          rows: args.rows,
          cols: args.cols,
          radius: args.radius,
          orientation: args.orientation,
        };
        return await batchCreator.createWithLayout(
          args.board_id,
          args.items,
          'text',
          layoutOptions,
          { parentId: args.parent_id }
        );
      }

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
    // Errors from MiroClient are pre-formatted with rich diagnostics
    throw new McpError(ErrorCode.InternalError, error.message || 'Unknown error occurred');
  }
}
