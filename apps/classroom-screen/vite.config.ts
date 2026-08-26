import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({ build: { write: false, lib: { entry: fileURLToPath(new URL('./empty.js', import.meta.url)), formats: ['es'], fileName: 'retired' } } });
