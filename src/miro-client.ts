import axios, { AxiosInstance, AxiosError } from 'axios';
import { OAuth2Manager } from './oauth.js';
import { OAUTH_CONFIG, CACHE_CONFIG, MIRO_DEFAULTS, TOKEN_CONFIG } from './config.js';
import { classifyAxiosError, formatDiagnosticError } from './errors.js';

// Color mapping: named colors to hex (shapes require hex, sticky notes accept names)
const COLOR_MAP: Record<string, string> = {
  'light_yellow': '#fff9b1',
  'yellow': '#fef445',
  'orange': '#ffc670',
  'light_green': '#d0f0c0',
  'green': '#67c56c',
  'dark_green': '#519c45',
  'cyan': '#01d5d6',
  'light_pink': '#f5b4ca',
  'pink': '#f082ac',
  'violet': '#dc86e0',
  'red': '#ff6a68',
  'light_blue': '#c8e6ff',
  'blue': '#2d9bf0',
  'dark_blue': '#1566c0',
  'gray': '#8a8a8a',
  'light_gray': '#e6e6e6',
  'dark_gray': '#4d4d4d',
  'black': '#1a1a1a',
  'white': '#ffffff',
};

export interface MiroBoard {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  modifiedAt: string;
  viewLink: string;
}

export interface MiroItem {
  id: string;
  type: string;
  data?: any;
  style?: any;
  position?: {
    x: number;
    y: number;
    origin?: 'center' | string;
    relativeTo?: 'canvas_center' | string;
  };
  geometry?: {
    width?: number;
    height?: number;
    rotation?: number;
  };
  createdAt?: string;
  modifiedAt?: string;
  createdBy?: {
    id: string;
    type: string;
  };
  modifiedBy?: {
    id: string;
    type: string;
  };
  parent?: {
    id: string;
    links?: any;
  };
  links?: any;
}

export class MiroClient {
  private client: AxiosInstance;
  private oauth: OAuth2Manager;
  private rateLimitRemaining: number = 100;
  private rateLimitReset: number = Date.now();

  // Performance optimizations: Caching
  private boardListCache: { data: MiroBoard[]; expiresAt: number } | null = null;
  private boardCache = new Map<string, { data: MiroBoard; expiresAt: number }>();
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Helper method to resolve color names to hex codes
   * @param colorInput Named color or hex code (optional)
   * @param defaultColor Default color name to use if colorInput is not provided
   * @returns Hex color code
   */
  private resolveColor(colorInput?: string, defaultColor: string = 'light_blue'): string {
    if (!colorInput) {
      return COLOR_MAP[defaultColor] || COLOR_MAP['light_blue'];
    }
    return COLOR_MAP[colorInput] || colorInput;
  }

  constructor(oauth: OAuth2Manager) {
    this.oauth = oauth;
    this.client = axios.create({
      baseURL: OAUTH_CONFIG.API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to inject auth token (with caching)
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      // Use cached token if valid (5-minute buffer before expiry)
      if (!this.cachedToken || this.tokenExpiresAt <= now + TOKEN_CONFIG.REFRESH_BUFFER_MS) {
        this.cachedToken = await this.oauth.getValidAccessToken();
        // Assume 1-hour token validity (conservative estimate)
        this.tokenExpiresAt = now + TOKEN_CONFIG.ASSUMED_VALIDITY_MS;
      }
      config.headers.Authorization = `Bearer ${this.cachedToken}`;
      return config;
    });

    // Add response interceptor to handle rate limiting
    this.client.interceptors.response.use(
      (response) => {
        // Track rate limit headers
        if (response.headers['x-ratelimit-remaining']) {
          this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining']);
        }
        if (response.headers['x-ratelimit-reset']) {
          this.rateLimitReset = parseInt(response.headers['x-ratelimit-reset']) * 1000;
        }
        return response;
      },
      async (error: AxiosError) => {
        // Classify all errors with rich diagnostics
        const diagnostic = classifyAxiosError(error);
        const formattedError = new Error(formatDiagnosticError(diagnostic));
        // Preserve original error info for upstream handling
        (formattedError as any).diagnostic = diagnostic;
        (formattedError as any).response = error.response;
        throw formattedError;
      }
    );
  }

  // Board Operations
  async listBoards(): Promise<MiroBoard[]> {
    const now = Date.now();

    // Return cached data if still valid
    if (this.boardListCache && this.boardListCache.expiresAt > now) {
      return this.boardListCache.data;
    }

    // Fetch fresh data
    const response = await this.client.get('/boards');
    const data = response.data.data || [];

    // Cache for configured TTL (boards don't change frequently)
    this.boardListCache = {
      data,
      expiresAt: now + CACHE_CONFIG.BOARD_TTL_MS,
    };

    return data;
  }

  async getBoard(boardId: string): Promise<MiroBoard> {
    const now = Date.now();

    // Return cached data if still valid
    const cached = this.boardCache.get(boardId);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // Fetch fresh data
    const response = await this.client.get(`/boards/${boardId}`);
    const data = response.data;

    // Cache for configured TTL
    this.boardCache.set(boardId, {
      data,
      expiresAt: now + CACHE_CONFIG.BOARD_TTL_MS,
    });

    return data;
  }

  async createBoard(name: string, description?: string): Promise<MiroBoard> {
    const response = await this.client.post('/boards', {
      name,
      description,
      policy: {
        permissionsPolicy: {
          collaborationToolsStartAccess: 'all_editors',
          copyAccess: 'anyone',
          sharingAccess: 'team_members_with_editing_rights',
        },
        sharingPolicy: {
          access: 'private',
          inviteToAccountAndBoardLinkAccess: 'no_access',
          organizationAccess: 'private',
          teamAccess: 'private',
        },
      },
    });

    // Invalidate board list cache (new board added)
    this.boardListCache = null;

    return response.data;
  }

  // Item Operations
  async listItems(boardId: string, type?: string): Promise<MiroItem[]> {
    const items: MiroItem[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { limit: '50' };
      if (type) params.type = type;
      if (cursor) params.cursor = cursor;

      const response = await this.client.get(`/boards/${boardId}/items`, { params });
      items.push(...(response.data.data || []));
      cursor = response.data.cursor;
    } while (cursor);

    return items;
  }

  async searchItems(boardId: string, query: string, type?: string): Promise<MiroItem[]> {
    const items = await this.listItems(boardId, type);
    const lowerQuery = query.toLowerCase();

    return items.filter((item) => {
      const content = item.data?.content?.toLowerCase() || '';
      const title = item.data?.title?.toLowerCase() || '';
      return content.includes(lowerQuery) || title.includes(lowerQuery);
    });
  }

  async getItem(boardId: string, itemId: string): Promise<MiroItem> {
    const response = await this.client.get(`/boards/${boardId}/items/${itemId}`);
    return response.data;
  }

  async updateItem(boardId: string, itemId: string, updates: Partial<MiroItem>): Promise<MiroItem> {
    const response = await this.client.patch(`/boards/${boardId}/items/${itemId}`, updates);
    return response.data;
  }

  async deleteItem(boardId: string, itemId: string): Promise<void> {
    await this.client.delete(`/boards/${boardId}/items/${itemId}`);
  }

  /**
   * Batch update multiple items in parallel
   * @param boardId Board ID
   * @param updates Array of updates with item_id and update data
   * @returns Results for each item with success/error status
   */
  async batchUpdateItems(
    boardId: string,
    updates: Array<{ id: string; position?: any; style?: any; data?: any; geometry?: any }>
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{
      id: string;
      status: 'success' | 'error';
      item?: MiroItem;
      error?: string;
    }>;
  }> {
    // Validate batch size
    const MAX_BATCH_SIZE = 50;
    if (updates.length > MAX_BATCH_SIZE) {
      throw new Error(`Batch size exceeds maximum of ${MAX_BATCH_SIZE} items`);
    }

    // Execute all updates in parallel using Promise.allSettled
    const updatePromises = updates.map(async (update) => {
      const { id, ...updateData } = update;
      return {
        id,
        result: await this.updateItem(boardId, id, updateData),
      };
    });

    const results = await Promise.allSettled(updatePromises);

    // Process results
    let succeeded = 0;
    let failed = 0;
    const processedResults = results.map((result, index) => {
      const updateId = updates[index].id;

      if (result.status === 'fulfilled') {
        succeeded++;
        return {
          id: updateId,
          status: 'success' as const,
          item: result.value.result,
        };
      } else {
        failed++;
        return {
          id: updateId,
          status: 'error' as const,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    return {
      total: updates.length,
      succeeded,
      failed,
      results: processedResults,
    };
  }

  // Sticky Notes
  async createStickyNote(
    boardId: string,
    content: string,
    options: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      color?: string;
      shape?: 'square' | 'rectangle';
      parentId?: string;
    } = {}
  ): Promise<MiroItem> {
    const payload: any = {
      data: {
        content,
        shape: options.shape || 'square',
      },
      style: {
        fillColor: options.color || 'light_yellow',
      },
      position: {
        x: options.x || 0,
        y: options.y || 0,
      },
    };

    // Only add geometry if width or height is specified
    if (options.width !== undefined || options.height !== undefined) {
      payload.geometry = {};
      if (options.width !== undefined) payload.geometry.width = options.width;
      if (options.height !== undefined) payload.geometry.height = options.height;
    }

    // Add parent reference if specified
    if (options.parentId) {
      payload.parent = { id: options.parentId };
    }

    const response = await this.client.post(`/boards/${boardId}/sticky_notes`, payload);
    return response.data;
  }

  // Shapes
  async createShape(
    boardId: string,
    content: string,
    shapeType: 'rectangle' | 'circle' | 'triangle' | 'rhombus' | 'parallelogram' | 'trapezoid' | 'pentagon' | 'hexagon' | 'octagon' | 'wedge_round_rectangle_callout' | 'star' | 'flow_chart_predefined_process' | 'cloud' | 'cross' | 'can' | 'right_arrow' | 'left_arrow' | 'left_right_arrow' | 'left_brace' | 'right_brace',
    options: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fillColor?: string;
      borderColor?: string;
      borderWidth?: string;
      fontFamily?: string;
      fontSize?: string;
      textColor?: string;
      parentId?: string;
    } = {}
  ): Promise<MiroItem> {
    // Convert named colors to hex for shapes (shapes require hex colors)
    const fillColor = this.resolveColor(options.fillColor, 'light_blue');
    const borderColor = this.resolveColor(options.borderColor, 'blue');

    const style: any = {
      fillColor,
      borderColor,
      borderWidth: options.borderWidth || '2.0',
    };

    // Add font styling if provided
    if (options.fontFamily) style.fontFamily = options.fontFamily;
    if (options.fontSize) style.fontSize = options.fontSize;
    if (options.textColor) style.color = options.textColor;

    const payload: any = {
      data: {
        content,
        shape: shapeType,
      },
      style,
      position: {
        x: options.x || 0,
        y: options.y || 0,
        origin: 'center',
      },
      geometry: {
        width: options.width || 300,
        height: options.height || 150,
      },
    };

    // Add parent reference if specified
    if (options.parentId) {
      payload.parent = { id: options.parentId };
    }

    const response = await this.client.post(`/boards/${boardId}/shapes`, payload);
    return response.data;
  }

  // Text
  async createText(
    boardId: string,
    content: string,
    options: {
      x?: number;
      y?: number;
      width?: number;
      fontFamily?: string;
      fontSize?: string;
      textColor?: string;
      textAlign?: 'left' | 'center' | 'right';
      parentId?: string;
    } = {}
  ): Promise<MiroItem> {
    const payload: any = {
      data: {
        content,
      },
      position: {
        x: options.x || 0,
        y: options.y || 0,
        origin: 'center',
      },
      geometry: {
        width: options.width || 300,
      },
    };

    // Add style if any font options provided
    const style: any = {};
    if (options.fontFamily) style.fontFamily = options.fontFamily;
    if (options.fontSize) style.fontSize = options.fontSize;
    if (options.textColor) style.color = options.textColor;
    if (options.textAlign) style.textAlign = options.textAlign;
    if (Object.keys(style).length > 0) {
      payload.style = style;
    }

    // Add parent reference if specified
    if (options.parentId) {
      payload.parent = { id: options.parentId };
    }

    const response = await this.client.post(`/boards/${boardId}/texts`, payload);
    return response.data;
  }

  // Frames
  async createFrame(
    boardId: string,
    title: string,
    options: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fillColor?: string;
    } = {}
  ): Promise<MiroItem> {
    // Convert named colors to hex for frames (frames require hex colors like shapes)
    const fillColor = this.resolveColor(options.fillColor, 'light_gray');

    const response = await this.client.post(`/boards/${boardId}/frames`, {
      data: {
        title,
        // Note: No 'type' field - API rejects it
      },
      style: {
        fillColor,
      },
      position: {
        x: options.x || 0,
        y: options.y || 0,
        origin: 'center',
      },
      geometry: {
        width: options.width || 1000,
        height: options.height || 800,
      },
    });
    return response.data;
  }

  // Connectors
  async createConnector(
    boardId: string,
    startItemId: string,
    endItemId: string,
    options: {
      strokeColor?: string;
      strokeWidth?: string;
      endStrokeCap?: 'none' | 'stealth' | 'rounded_stealth' | 'diamond' | 'filled_diamond' | 'oval' | 'filled_oval' | 'arrow' | 'triangle' | 'filled_triangle' | 'erd_one' | 'erd_many' | 'erd_only_one' | 'erd_zero_or_one' | 'erd_one_or_many' | 'erd_zero_or_many';
      caption?: string;
    } = {}
  ): Promise<MiroItem> {
    // Convert named colors to hex for connectors (connectors require hex colors)
    const strokeColor = this.resolveColor(options.strokeColor, 'blue');

    const body: any = {
      startItem: {
        id: startItemId,
      },
      endItem: {
        id: endItemId,
      },
      style: {
        strokeColor,
        strokeWidth: options.strokeWidth || '2',
        endStrokeCap: options.endStrokeCap || 'arrow',
      },
    };

    if (options.caption) {
      body.captions = [
        {
          content: options.caption,
          position: '50%',  // Position must be percentage string, not number
        },
      ];
    }

    const response = await this.client.post(`/boards/${boardId}/connectors`, body);
    return response.data;
  }

  async updateConnector(
    boardId: string,
    connectorId: string,
    options: {
      strokeColor?: string;
      strokeWidth?: string;
      endStrokeCap?: 'none' | 'stealth' | 'rounded_stealth' | 'diamond' | 'filled_diamond' | 'oval' | 'filled_oval' | 'arrow' | 'triangle' | 'filled_triangle' | 'erd_one' | 'erd_many' | 'erd_only_one' | 'erd_zero_or_one' | 'erd_one_or_many' | 'erd_zero_or_many';
    }
  ): Promise<MiroItem> {
    // Convert named colors to hex if provided
    const style: any = { ...options };
    if (style.strokeColor) {
      style.strokeColor = COLOR_MAP[style.strokeColor] || style.strokeColor;
    }

    const response = await this.client.patch(`/boards/${boardId}/connectors/${connectorId}`, {
      style,
    });
    return response.data;
  }

  // List connectors - uses dedicated /connectors endpoint (not /items)
  async listConnectors(boardId: string): Promise<MiroItem[]> {
    const connectors: MiroItem[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { limit: '50' };
      if (cursor) params.cursor = cursor;

      const response = await this.client.get(`/boards/${boardId}/connectors`, { params });
      connectors.push(...(response.data.data || []));
      cursor = response.data.cursor;
    } while (cursor);

    return connectors;
  }

  // Board Sync - Retrieve complete board snapshot in single request
  async syncBoard(boardId: string): Promise<{
    metadata: {
      board_id: string;
      board_name: string;
      modifiedAt: string;
      itemCount: number;
    };
    items: {
      frames: MiroItem[];
      shapes: MiroItem[];
      sticky_notes: MiroItem[];
      text: MiroItem[];
      connectors: MiroItem[];
    };
  }> {
    // Fetch board metadata and all item types in parallel
    // Note: connectors use dedicated endpoint, not /items
    const [board, frames, shapes, stickyNotes, textItems, connectors] = await Promise.all([
      this.getBoard(boardId),
      this.listItems(boardId, 'frame'),
      this.listItems(boardId, 'shape'),
      this.listItems(boardId, 'sticky_note'),
      this.listItems(boardId, 'text'),
      this.listConnectors(boardId),
    ]);

    const itemCount = frames.length + shapes.length + stickyNotes.length + textItems.length + connectors.length;

    return {
      metadata: {
        board_id: board.id,
        board_name: board.name,
        modifiedAt: board.modifiedAt,
        itemCount,
      },
      items: {
        frames,
        shapes,
        sticky_notes: stickyNotes,
        text: textItems,
        connectors,
      },
    };
  }

  // Verify authentication by listing boards
  async verifyAuth(): Promise<boolean> {
    try {
      await this.client.get('/boards');
      return true;
    } catch (error) {
      return false;
    }
  }
}
