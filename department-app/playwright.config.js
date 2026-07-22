import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', timeout: 30000, use: { baseURL: 'http://127.0.0.1:4173/to-chuyen-mon/', viewport: { width: 1536, height: 900 } }, webServer: { command: 'npm run dev -- --port 4173', url: 'http://127.0.0.1:4173/to-chuyen-mon/', reuseExistingServer: true } });
