import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'role-floating-dock.spec.js',
  timeout:25000,
  expect:{timeout:8000},
  reporter:'list',
  retries:0,
  use:{baseURL:'http://127.0.0.1:4186',trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{
    command:'npm run dev -- --host 127.0.0.1 --port 4186 --strictPort',
    url:'http://127.0.0.1:4186/tests/fixtures/role-floating-dock.html',
    timeout:120000,
    reuseExistingServer:false,
  },
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}}},
    {name:'android-chromium',use:{...devices['Pixel 7'],launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}}},
    {name:'iphone-webkit',use:{...devices['iPhone 13']}},
  ],
});
