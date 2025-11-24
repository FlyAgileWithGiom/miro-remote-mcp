import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use vitest globals (describe, it, expect) without imports
    globals: true,
    // ESM-native environment
    environment: 'node',
    // Test file patterns
    include: ['tests/**/*.test.ts'],
    // Coverage configuration (optional, for later)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/'],
    },
    // Timeout for async operations
    testTimeout: 10000,
    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,
  },
});
