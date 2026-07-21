import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Frontend tests only. The api/ package has its own tests + CI job; without
  // this, vitest discovers api/**/*.test.ts and fails on api-only deps (hono,
  // cheerio) that the frontend job never installs.
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
