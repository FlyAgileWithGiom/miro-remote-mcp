import axios, { AxiosInstance, AxiosError } from 'axios';
import { OAuth2Manager } from './oauth.js';

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
  position?: { x: number; y: number };
  geometry?: { width?: number; height?: number };
}

export class MiroClient {
  private client: AxiosInstance;
  private oauth: OAuth2Manager;
  private rateLimitRemaining: number = 100;
  private rateLimitReset: number = Date.now();

  constructor(oauth: OAuth2Manager) {
    this.oauth = oauth;
    this.client = axios.create({
      baseURL: 'https://api.miro.com/v2',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to inject auth token
    this.client.interceptors.request.use(async (config) => {
      const token = await this.oauth.getValidAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
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
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 60;
          throw new Error(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
        }
        throw error;
      }
    );
  }

  // Board Operations
  async listBoards(): Promise<MiroBoard[]> {
    const response = await this.client.get('/boards');
    return response.data.data || [];
  }

  async getBoard(boardId: string): Promise<MiroBoard> {
    const response = await this.client.get(`/boards/${boardId}`);
    return response.data;
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
    return response.data;
  }

  // Item Operations
  async listItems(boardId: string, type?: string): Promise<MiroItem[]> {
    const params: any = {};
    if (type) {
      params.type = type;
    }
    const response = await this.client.get(`/boards/${boardId}/items`, { params });
    return response.data.data || [];
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
    } = {}
  ): Promise<MiroItem> {
    // Convert named colors to hex for shapes (shapes require hex colors)
    const fillColor = options.fillColor
      ? (COLOR_MAP[options.fillColor] || options.fillColor)
      : COLOR_MAP['light_blue'];
    const borderColor = options.borderColor
      ? (COLOR_MAP[options.borderColor] || options.borderColor)
      : COLOR_MAP['blue'];

    const response = await this.client.post(`/boards/${boardId}/shapes`, {
      data: {
        content,
        shape: shapeType,
      },
      style: {
        fillColor,
        borderColor,
        borderWidth: options.borderWidth || '2.0',
      },
      position: {
        x: options.x || 0,
        y: options.y || 0,
        origin: 'center',
      },
      geometry: {
        width: options.width || 300,
        height: options.height || 150,
      },
    });
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
    } = {}
  ): Promise<MiroItem> {
    const response = await this.client.post(`/boards/${boardId}/texts`, {
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
    });
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
    const fillColor = options.fillColor
      ? (COLOR_MAP[options.fillColor] || options.fillColor)
      : COLOR_MAP['light_gray'];

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
    const strokeColor = options.strokeColor
      ? (COLOR_MAP[options.strokeColor] || options.strokeColor)
      : COLOR_MAP['blue'];

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
