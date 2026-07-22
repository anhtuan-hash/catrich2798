import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4173/to-chuyen-mon/',
    viewport: { width: 1536, height: 900 },
  },
  webServer: {
    // Always rebuild before testing so Playwright never serves a stale dist folder.
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173/to-chuyen-mon/',
    reuseExistingServer: false,
    env: {
      ...process.env,
      // The local regression suite must remain independent from Brian's shared
      // Supabase variables until the Department migration is explicitly enabled.
      VITE_DEPARTMENT_CLOUD_ENABLED: 'false',
    },
  },
});
