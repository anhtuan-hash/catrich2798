import { defineConfig, devices } from '@playwright/test';

const remoteBaseUrl = process.env.BES_E2E_BASE_URL || '';
const chromiumExecutable = process.env.BES_CHROMIUM_EXECUTABLE || '/usr/bin/chromium';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'reports/playwright', open: 'never' }]],
  use: {
    baseURL: remoteBaseUrl || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: remoteBaseUrl ? undefined : {
    command: 'npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: chromiumExecutable, args: ['--no-sandbox','--disable-dev-shm-usage','--proxy-server=direct://','--proxy-bypass-list=*'] } } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], launchOptions: { executablePath: chromiumExecutable, args: ['--no-sandbox','--disable-dev-shm-usage','--proxy-server=direct://','--proxy-bypass-list=*'] } } },
  ],
});
