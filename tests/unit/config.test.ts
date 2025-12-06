import { describe, it, expect } from 'vitest';
import { PAGINATION_CONFIG } from '../../src/config.js';

describe('config', () => {
  describe('PAGINATION_CONFIG', () => {
    it('ITEMS_PER_PAGE does not exceed Miro API limit of 50', () => {
      // Miro API /boards/{board_id}/items endpoint returns HTTP 400
      // when limit exceeds 50
      expect(PAGINATION_CONFIG.ITEMS_PER_PAGE).toBeLessThanOrEqual(50);
    });
  });
});
