import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'.',testMatch:'museum-ui.spec.js',timeout:60000,fullyParallel:false,workers:1,retries:0,
 reporter:[['list'],['html',{outputFolder:'artifacts/museum-lab/report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4175',screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
  url:'http://127.0.0.1:4175/tests/museum-lab/v3.html',timeout:120000,reuseExistingServer:!process.env.CI},
 projects:[{name:'material-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
 {name:'material-mobile',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}}]
});
