import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/to-chuyen-mon/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: '/to-chuyen-mon/',
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    open: '/to-chuyen-mon/',
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
