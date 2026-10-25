import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'sync-doctor-responsive-qa.spec.js',
  timeout:35000,
  expect:{timeout:8000},
  retries:0,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:4174',trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{
    command:'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
    url:'http://127.0.0.1:4174/tests/fixtures/sync-doctor-qa.html',
    reuseExistingServer:false,
    timeout:120000,
  },
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}}},
    {name:'android-chromium',use:{...devices['Pixel 7'],launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}}},
    {name:'desktop-webkit',use:{...devices['Desktop Safari']}},
    {name:'iphone-webkit',use:{...devices['iPhone 13']}},
  ],
});
