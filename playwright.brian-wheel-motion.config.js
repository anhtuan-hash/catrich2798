import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',testMatch:['brian-wheel-visible-motion.spec.js','brian-dice-visible-motion.spec.js'],
 timeout:45000,expect:{timeout:10000},retries:process.env.CI?1:0,reporter:'list',
 use:{baseURL:'http://127.0.0.1:4179',trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4179 --strictPort',
  url:'http://127.0.0.1:4179/tests/fixtures/brian-instant-tools-qa.html',timeout:120000,reuseExistingServer:!process.env.CI},
 projects:[
  {name:'desktop-chromium',use:{...devices['Desktop Chrome'],launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}}},
  {name:'iphone-webkit',use:{...devices['iPhone 13']}}
 ]
});
