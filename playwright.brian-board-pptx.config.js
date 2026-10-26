import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',
 testMatch:'brian-board-pptx.spec.js',
 timeout:45000,expect:{timeout:10000},retries:process.env.CI?1:0,
 reporter:'list',
 use:{baseURL:'http://127.0.0.1:4178',trace:'retain-on-failure'},
 webServer:{command:'npx vite --host 127.0.0.1 --port 4178',
  url:'http://127.0.0.1:4178/tests/fixtures/brian-board-pptx-qa.html',reuseExistingServer:!process.env.CI,timeout:120000},
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome'],launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}}},
  {name:'iphone-webkit',use:{...devices['iPhone 13']}}
 ]
});
