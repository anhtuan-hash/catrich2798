import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist-ui-smoke',
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: resolve(process.cwd(), 'src/components/ui/index.js'),
      formats: ['es'],
      fileName: 'brian-ui',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client'],
    },
  },
});
