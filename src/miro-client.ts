import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import { OAuth2Manager } from './oauth.js';
import { OAUTH_CONFIG, CACHE_CONFIG, MIRO_DEFAULTS, TOKEN_CONFIG, PAGINATION_CONFIG } from './config.js';
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

export type ItemFormat = 'minimal' | 'standard' | 'full';
export type OutputFormat = 'json' | 'toon';

/**
 * Filter item fields based on format level
 * - minimal: Only essential fields (id, type, data, position x/y, geometry width/height)
 * - standard: Minimal + style and parent.id
 * - full: Complete API response (no filtering)
 */
function filterItem(item: MiroItem, format: ItemFormat): Partial<MiroItem> {
  if (format === 'full') {
    return item;
  }

  const filtered: Partial<MiroItem> = {
    id: item.id,
    type: item.type,
    data: item.data,
  };

  // Add minimal position fields (x, y only)
  if (item.position) {
    filtered.position = {
      x: item.position.x,
      y: item.position.y,
    };
  }

  // Add minimal geometry fields (width, height only)
  if (item.geometry) {
    filtered.geometry = {
      width: item.geometry.width,
      height: item.geometry.height,
    };
  }

  // Standard format adds style and parent.id
  if (format === 'standard') {
    filtered.style = item.style;
    if (item.parent?.id) {
      filtered.parent = { id: item.parent.id };
    }
  }

  return filtered;
}

/**
 * Serialize item to TOON format (compact text-based representation)
 * Format: type|id|position|dimensions|type-specific fields
 */
function itemToToon(item: MiroItem): string {
  const parts: string[] = [];

  // Always include type and id
  parts.push(item.type, item.id);

  // Position (x,y)
  if (item.position) {
    parts.push(`${item.position.x},${item.position.y}`);
  } else {
    parts.push('');
  }

  // Dimensions (width x height)
  if (item.geometry?.width || item.geometry?.height) {
    const w = item.geometry.width ?? 0;
    const h = item.geometry.height ?? 0;
    parts.push(`${w}x${h}`);
  } else {
    parts.push('');
  }

  // Type-specific fields
  switch (item.type) {
    case 'sticky_note':
      // Color from style
      const color = item.style?.fillColor ?? '';
      parts.push(color);
      // Content from data
      const content = item.data?.content ? item.data.content.replace(/\n/g, '\\n').replace(/\|/g, '\\|') : '';
      parts.push(content);
      break;

    case 'shape':
      // Shape type and content
      const shapeType = item.data?.shape ?? '';
      parts.push(shapeType);
      const shapeContent = item.data?.content ? item.data.content.replace(/\n/g, '\\n').replace(/\|/g, '\\|') : '';
      parts.push(shapeContent);
      break;

    case 'text':
      // Just content for text items
      const textContent = item.data?.content ? item.data.content.replace(/\n/g, '\\n').replace(/\|/g, '\\|') : '';
      parts.push(textContent);
      break;

    case 'frame':
      // Frame title
      const title = item.data?.title ? item.data.title.replace(/\n/g, '\\n').replace(/\|/g, '\\|') : '';
      parts.push(title);
      break;

    case 'connector':
      // Start and end item IDs
      const startId = item.data?.startItem?.id ?? '';
      const endId = item.data?.endItem?.id ?? '';
      const connection = `${startId}->${endId}`;
      parts.push(connection);
      // End cap style
      const endCap = item.data?.endStrokeCap ?? '';
      parts.push(endCap);
      break;
  }

  return parts.join('|');
}


/**
 * Convert sync_board result to TOON format
 */
function syncResultToToon(result: {
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
}): string {
  const lines: string[] = [];

  // Header line with board metadata
  const { board_id, board_name, modifiedAt, itemCount } = result.metadata;
  lines.push(`# board:${board_id} "${board_name}" mod:${modifiedAt} count:${itemCount}`);
  lines.push('');

  // Frames section
  if (result.items.frames.length > 0) {
    lines.push(`## frames (${result.items.frames.length})`);
    result.items.frames.forEach(item => lines.push(itemToToon(item)));
    lines.push('');
  }

  // Sticky notes section
  if (result.items.sticky_notes.length > 0) {
    lines.push(`## sticky_notes (${result.items.sticky_notes.length})`);
    result.items.sticky_notes.forEach(item => lines.push(itemToToon(item)));
    lines.push('');
  }

  // Shapes section
  if (result.items.shapes.length > 0) {
    lines.push(`## shapes (${result.items.shapes.length})`);
    result.items.shapes.forEach(item => lines.push(itemToToon(item)));
    lines.push('');
  }

  // Text section
  if (result.items.text.length > 0) {
    lines.push(`## text (${result.items.text.length})`);
    result.items.text.forEach(item => lines.push(itemToToon(item)));
    lines.push('');
  }

  // Connectors section
  if (result.items.connectors.length > 0) {
    lines.push(`## connectors (${result.items.connectors.length})`);
    result.items.connectors.forEach(item => lines.push(itemToToon(item)));
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Miro API Client with automatic rate limit management
 *
 * Rate Limiting Strategy:
 * - Tracks remaining API quota from response headers (x-ratelimit-remaining, x-ratelimit-reset)
 * - When quota approaches threshold (< 10 remaining), automatically waits until reset time
 * - Prevents 429 (Too Many Requests) errors on batch operations
 * - Gracefully handles queueing: waits silently without failing requests
 */
export class MiroClient {
  private client: AxiosInstance;
  private oauth: OAuth2Manager;
  private rateLimitRemaining: number = 100;
  private rateLimitReset: number = Date.now();
  private readonly RATE_LIMIT_THRESHOLD = 10;

  // Performance optimizations: Caching
  private boardListCache: { data: MiroBoard[]; expiresAt: number } | null = null;
  private boardCache = new Map<string, { data: MiroBoard; expiresAt: number }>();
  private itemCache = new Map<string, { data: MiroItem[]; expiresAt: number }>();
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
    // Create HTTPS agent with connection pooling for 50-70% faster API responses via keepAlive
    const httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
    });

    this.client = axios.create({
      baseURL: OAUTH_CONFIG.API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      httpAgent: httpsAgent,
      httpsAgent: httpsAgent,
    });

    // Add request interceptor to inject auth token (with caching) and enforce rate limiting
    this.client.interceptors.request.use(async (config) => {
      // Check rate limit before making request
      if (this.rateLimitRemaining < this.RATE_LIMIT_THRESHOLD) {
        const now = Date.now();
        const waitTime = this.rateLimitReset - now;
        if (waitTime > 0) {
          console.log(`Rate limit approaching (${this.rateLimitRemaining} remaining), waiting ${waitTime}ms until reset`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

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
  async listItems(boardId: string, type?: string, format: ItemFormat = 'minimal', outputFormat: OutputFormat = 'json'): Promise<MiroItem[] | string> {
    const now = Date.now();
    const cacheKey = `${boardId}:${type || 'all'}`;

    // Return cached data if still valid
    const cached = this.itemCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      // For TOON format, use full data (itemToToon needs all fields)
      if (outputFormat === 'toon') {
        return this.itemsToToon(cached.data);
      }

      // Apply format filter for JSON output
      return cached.data.map(item => filterItem(item, format) as MiroItem);
    }

    // Fetch fresh data
    const items: MiroItem[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { limit: PAGINATION_CONFIG.ITEMS_PER_PAGE.toString() };
      if (type) params.type = type;
      if (cursor) params.cursor = cursor;

      const response = await this.client.get(`/boards/${boardId}/items`, { params });
      items.push(...(response.data.data || []));
      cursor = response.data.cursor;
    } while (cursor);

    // Cache for configured TTL (cache full data, filter on retrieval)
    this.itemCache.set(cacheKey, {
      data: items,
      expiresAt: now + CACHE_CONFIG.ITEM_TTL_MS,
    });

    // For TOON format, use full data (itemToToon needs all fields)
    if (outputFormat === 'toon') {
      return this.itemsToToon(items);
    }

    // Apply format filter for JSON output
    return items.map(item => filterItem(item, format) as MiroItem);
  }

  /**
   * Convert item array to TOON format
   */
  private itemsToToon(items: MiroItem[]): string {
    if (items.length === 0) {
      return '# items count:0';
    }

    const lines: string[] = [];
    lines.push(`# items count:${items.length}`);
    items.forEach(item => lines.push(itemToToon(item)));
    return lines.join('\n');
  }

  /**
   * Find item type from cache (avoids API call if item was recently listed)
   */
  private findItemTypeInCache(boardId: string, itemId: string): string | null {
    const now = Date.now();
    for (const [key, cached] of this.itemCache.entries()) {
      if (key.startsWith(`${boardId}:`) && cached.expiresAt > now) {
        const item = cached.data.find((i) => i.id === itemId);
        if (item) return item.type;
      }
    }
    return null;
  }

  private invalidateItemCache(boardId: string): void {
    // Remove all cache entries for this board (all type filters)
    for (const key of this.itemCache.keys()) {
      if (key.startsWith(`${boardId}:`)) {
        this.itemCache.delete(key);
      }
    }
  }

  async searchItems(boardId: string, query: string, type?: string, outputFormat: OutputFormat = 'json'): Promise<MiroItem[] | string> {
    // Always get items in JSON format first for filtering
    const items = await this.listItems(boardId, type) as MiroItem[];
    const lowerQuery = query.toLowerCase();

    const filteredItems = items.filter((item) => {
      const content = item.data?.content?.toLowerCase() || '';
      const title = item.data?.title?.toLowerCase() || '';
      return content.includes(lowerQuery) || title.includes(lowerQuery);
    });

    // Return TOON format if requested
    if (outputFormat === 'toon') {
      return this.itemsToToon(filteredItems);
    }
    return filteredItems;
  }

  async getItem(boardId: string, itemId: string): Promise<MiroItem> {
    const response = await this.client.get(`/boards/${boardId}/items/${itemId}`);
    return response.data;
  }

  /**
   * Update item properties (position, content, style, geometry)
   *
   * Note: Geometry changes (width, height, rotation) require type-specific endpoints.
   * If geometry is being updated, this method automatically fetches the item type
   * and uses the appropriate endpoint (shapes, sticky_notes, texts, frames).
   */
  async updateItem(boardId: string, itemId: string, updates: Partial<MiroItem>): Promise<MiroItem> {
    // Check if geometry is being updated
    const hasGeometryUpdate = updates.geometry !== undefined;

    if (hasGeometryUpdate) {
      // Geometry updates require type-specific endpoints
      // Try cache first, fall back to API call
      let itemType = this.findItemTypeInCache(boardId, itemId);
      if (!itemType) {
        const item = await this.getItem(boardId, itemId);
        itemType = item.type;
      }

      // Map item type to endpoint path
      const typeToEndpoint: Record<string, string> = {
        'shape': 'shapes',
        'sticky_note': 'sticky_notes',
        'text': 'texts',
        'frame': 'frames',
      };

      const endpoint = typeToEndpoint[itemType];
      if (!endpoint) {
        throw new Error(`Cannot update geometry for item type: ${itemType}`);
      }

      // Use type-specific endpoint for geometry updates
      const response = await this.client.patch(`/boards/${boardId}/${endpoint}/${itemId}`, updates);
      this.invalidateItemCache(boardId);
      return response.data;
    }

    // For non-geometry updates, use generic endpoint
    const response = await this.client.patch(`/boards/${boardId}/items/${itemId}`, updates);
    this.invalidateItemCache(boardId);
    return response.data;
  }

  async deleteItem(boardId: string, itemId: string): Promise<void> {
    await this.client.delete(`/boards/${boardId}/items/${itemId}`);
    this.invalidateItemCache(boardId);
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

    // Invalidate cache after batch updates
    this.invalidateItemCache(boardId);

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
    this.invalidateItemCache(boardId);
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
    this.invalidateItemCache(boardId);
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
    this.invalidateItemCache(boardId);
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
    this.invalidateItemCache(boardId);
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
    this.invalidateItemCache(boardId);
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
    this.invalidateItemCache(boardId);
    return response.data;
  }

  // List connectors - uses dedicated /connectors endpoint (not /items)
  async listConnectors(boardId: string): Promise<MiroItem[]> {
    const connectors: MiroItem[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { limit: PAGINATION_CONFIG.ITEMS_PER_PAGE.toString() };
      if (cursor) params.cursor = cursor;

      const response = await this.client.get(`/boards/${boardId}/connectors`, { params });
      connectors.push(...(response.data.data || []));
      cursor = response.data.cursor;
    } while (cursor);

    return connectors;
  }

  // Board Sync - Retrieve complete board snapshot in single request
  async syncBoard(
    boardId: string,
    format: ItemFormat = 'minimal',
    outputFormat: OutputFormat = 'json'
  ): Promise<string | {
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
      this.listItems(boardId, 'frame', format, 'json'),
      this.listItems(boardId, 'shape', format, 'json'),
      this.listItems(boardId, 'sticky_note', format, 'json'),
      this.listItems(boardId, 'text', format, 'json'),
      this.listConnectors(boardId),
    ]) as [MiroBoard, MiroItem[], MiroItem[], MiroItem[], MiroItem[], MiroItem[]];

    // Apply format filtering to connectors (they don't use listItems)
    const filteredConnectors = connectors.map(item => filterItem(item, format) as MiroItem);

    const itemCount = frames.length + shapes.length + stickyNotes.length + textItems.length + filteredConnectors.length;

    const result = {
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
        connectors: filteredConnectors,
      },
    };

    // Return in requested output format
    if (outputFormat === 'toon') {
      return syncResultToToon(result);
    }

    return result;
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

  // Get current rate limit status for observability
  getRateLimitStatus(): { remaining: number; resetAt: number; threshold: number } {
    return {
      remaining: this.rateLimitRemaining,
      resetAt: this.rateLimitReset,
      threshold: this.RATE_LIMIT_THRESHOLD,
    };
  }
}
