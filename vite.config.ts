/*
 * PERFORMANCE AUDIT (EPIC E005) - Core Web Vitals
 *
 * Bundle Size Audit (Production Build):
 * - Total JS (excluding worker): ~704 KB uncompressed
 * - Main app chunk (index): ~260 KB uncompressed (81 KB gzipped)
 * - pdfjs-dist chunk (pdf): ~365 KB uncompressed (107 KB gzipped)
 * - CSS size: ~82 KB uncompressed (24 KB gzipped)
 * 
 * Notes:
 * - pdfjs-dist is successfully code-split via dynamic import in useDocumentUpload.ts.
 * - TaxView and InsuranceView are lazy-loaded via React.lazy, saving ~46 KB from the initial bundle.
 * - No chunks exceed 200 KB gzipped. Main bundle is well within budget.
 * - Loom preconnects remain in index.html to eliminate DNS/TLS latency for video embeds across the site.
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
