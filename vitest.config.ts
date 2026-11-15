import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@dhamrai/shared-contracts': path.resolve(__dirname, 'packages/shared-contracts/src'),
      '@dhamrai/game-core': path.resolve(__dirname, 'packages/game-core/src'),
      '@dhamrai/save-core': path.resolve(__dirname, 'packages/save-core/src'),
    },
  },
});
