import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const departmentCloudEnabled = process.env.VITE_DEPARTMENT_CLOUD_ENABLED || 'true';
const departmentId = process.env.VITE_DEPARTMENT_ID || '00000000-0000-0000-0000-000000000001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^read-excel-file$/, replacement: 'read-excel-file/browser' }],
  },
  define: {
    'import.meta.env.VITE_DEPARTMENT_CLOUD_ENABLED': JSON.stringify(departmentCloudEnabled),
    'import.meta.env.VITE_DEPARTMENT_ID': JSON.stringify(departmentId),
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    emptyOutDir: false,
    rollupOptions: {
      input: {
        v2Preview: resolve(process.cwd(), 'preview-ui-v2.html'),
        v2Rehearsal: resolve(process.cwd(), 'preview-ui-v2-rehearsal.html'),
        v2Behavior: resolve(process.cwd(), 'preview-ui-v2-behavior.html'),
      },
    },
    chunkSizeWarningLimit: 650,
  },
});
