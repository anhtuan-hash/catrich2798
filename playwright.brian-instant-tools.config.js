import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'tests/e2e',testMatch:'brian-instant-tools-qa.spec.js',
  timeout:65000,expect:{timeout:8000},retries:0,reporter:'list',
  use:{baseURL:'http://127.0.0.1:4188',screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4188 --strictPort',
    url:'http://127.0.0.1:4188/tests/fixtures/brian-instant-tools-qa.html',
    reuseExistingServer:false,timeout:120000},
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}}},
    {name:'android-chromium',use:{...devices['Pixel 7'],launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}}},
    {name:'iphone-webkit',use:{...devices['iPhone 13']}},
  ]
});