import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.mjs',
  timeout: 50_000,
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: 'artifacts/design-to-code/playwright-report', open: 'never' }]],
  outputDir: 'artifacts/design-to-code/playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    reducedMotion: 'reduce',
    colorScheme: 'light',
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/tools/design-to-code/fixtures/settings-paper.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: 'paper-chromium', use: { ...devices['Desktop Chrome'],
      viewport: { width: 1145, height: 1374 }, deviceScaleFactor: 1,
      launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] },
    } },
  ],
});
