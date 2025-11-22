import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@miya-dairy/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5174,
  },
});
