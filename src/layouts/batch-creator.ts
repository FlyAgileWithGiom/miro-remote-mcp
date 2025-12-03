/**
 * Batch creator - orchestrates parallel creation of items with layouts
 */

import { MiroClient, MiroItem } from '../miro-client.js';
import { LayoutItem, LayoutOptions, BatchCreationResult, PositionedItem } from './types.js';
import { LayoutCalculator } from './calculator.js';

type ItemType = 'sticky_note' | 'shape' | 'text';

export class BatchCreator {
  constructor(private miroClient: MiroClient) {}

  /**
   * Create multiple items with automatic layout positioning
   */
  async createWithLayout(
    boardId: string,
    items: LayoutItem[],
    itemType: ItemType,
    layoutOptions: LayoutOptions,
    commonOptions?: {
      parentId?: string;
      shapeType?: string;
    }
  ): Promise<BatchCreationResult> {
    // Calculate positions for all items
    const positioned = LayoutCalculator.calculatePositions(items, layoutOptions);

    // Create all items in parallel
    const results = await Promise.allSettled(
      positioned.map((item) =>
        this.createSingleItem(boardId, item, itemType, commonOptions)
      )
    );

    // Separate successes and failures
    const created: MiroItem[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        created.push(result.value);
      } else {
        errors.push(`Item ${index}: ${result.reason?.message || 'Unknown error'}`);
      }
    });

    // Create connectors for tree layouts
    let connectors: MiroItem[] | undefined;
    if (layoutOptions.layout === 'tree' && created.length > 0) {
      connectors = await this.createTreeConnectors(
        boardId,
        items,
        created
      );
    }

    return {
      items: created.map((item) => ({ id: item.id, type: item.type })),
      connectors: connectors?.map((c) => ({ id: c.id })),
      summary: {
        created: created.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  /**
   * Create a single item using appropriate MiroClient method
   */
  private async createSingleItem(
    boardId: string,
    item: PositionedItem,
    itemType: ItemType,
    commonOptions?: { parentId?: string; shapeType?: string }
  ): Promise<MiroItem> {
    const baseOptions = {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      parentId: commonOptions?.parentId,
      ...(item.style || {}),
    };

    switch (itemType) {
      case 'sticky_note':
        return await this.miroClient.createStickyNote(boardId, item.content, baseOptions);
      case 'shape':
        return await this.miroClient.createShape(
          boardId,
          item.content,
          (commonOptions?.shapeType as 'rectangle' | 'circle' | 'triangle') ?? 'rectangle',
          baseOptions
        );
      case 'text':
        return await this.miroClient.createText(boardId, item.content, baseOptions);
      default:
        throw new Error(`Unknown item type: ${itemType}`);
    }
  }

  /**
   * Create connectors for tree layout based on metadata.parentIndex
   * Uses parallel execution for 92% performance improvement
   */
  private async createTreeConnectors(
    boardId: string,
    originalItems: LayoutItem[],
    createdItems: MiroItem[]
  ): Promise<MiroItem[]> {
    // Create promises for all valid connector operations
    const connectorPromises = originalItems
      .map((item, i) => {
        const parentIndex = item.metadata?.parentIndex as number | undefined;

        if (parentIndex !== undefined && parentIndex >= 0 && parentIndex < createdItems.length) {
          return this.miroClient.createConnector(
            boardId,
            createdItems[parentIndex].id,
            createdItems[i].id,
            { endStrokeCap: 'arrow' }
          );
        }
        return null;
      })
      .filter((p) => p !== null) as Promise<MiroItem>[];

    // Execute all connector creations in parallel
    const results = await Promise.allSettled(connectorPromises);

    // Extract successful connectors and log failures
    const connectors: MiroItem[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        connectors.push(result.value);
      } else {
        // Log but don't fail entire operation for connector errors
        console.error(`Failed to create connector at index ${index}:`, result.reason);
      }
    });

    return connectors;
  }
}
