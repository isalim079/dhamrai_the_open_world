import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3050',
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['..', '../../packages', '../../data'],
    },
  },
  resolve: {
    alias: {
      '@dhamrai/shared-contracts': path.resolve(__dirname, '../../packages/shared-contracts/src'),
      '@dhamrai/game-core': path.resolve(__dirname, '../../packages/game-core/src'),
      '@dhamrai/save-core': path.resolve(__dirname, '../../packages/save-core/src'),
    },
  },
});
