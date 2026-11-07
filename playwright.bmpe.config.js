import { defineConfig, devices } from '@playwright/test';

// Standalone CSS cascade QA: it does not require a production server or credentials.
// These tests must not be used as a substitute for the full browser/site E2E suite.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'bmpe-css-computed.spec.js',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright-bmpe', open: 'never' }]],
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'bmpe-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'bmpe-webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'bmpe-firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'bmpe-edge', use: { ...devices['Desktop Chrome'], channel: 'msedge' } },
  ],
});
