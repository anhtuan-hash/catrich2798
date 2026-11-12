import {defineConfig,devices} from '@playwright/test';
const args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
export default defineConfig({
 testDir:'.',testMatch:'gallery-render.spec.js',timeout:60000,fullyParallel:false,retries:0,workers:1,
 reporter:[['list'],['html',{outputFolder:'artifacts/gallery/report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4173',screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173/tests/gallery/harness.html',timeout:120000,reuseExistingServer:!process.env.CI},
 projects:[
  {name:'gallery-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900},launchOptions:{args}}},
  {name:'gallery-mobile',use:{...devices['Pixel 7'],viewport:{width:390,height:844},launchOptions:{args}}},
  {name:'gallery-tablet',use:{...devices['Desktop Chrome'],viewport:{width:768,height:1024},hasTouch:true,launchOptions:{args}}}
 ]
});
