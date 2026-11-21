import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('./', import.meta.url));
const publicRoot = fileURLToPath(new URL('../../public/', import.meta.url));
const museumAssets = [
  'museum',
  'assets/museum-paper',
  'assets/dashboard-scrapbook/paper-grain.svg',
  'assets/attendance-scrapbook/books.svg',
];

export default defineConfig({
  root,
  publicDir: false,
  define: { 'import.meta.env.MUSEUM_LAB_STANDALONE': 'true' },
  plugins: [{
    name: 'museum-public-assets',
    async closeBundle() {
      for (const asset of museumAssets) {
        const output = join(root, 'dist', asset);
        await mkdir(dirname(output), { recursive: true });
        await cp(join(publicRoot, asset), output, { recursive: true });
      }
    },
  }],
});
