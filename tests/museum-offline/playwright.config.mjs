import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'offline.spec.mjs',timeout:60000,workers:1,retries:0,
 reporter:[['list'],['html',{outputFolder:'artifacts/museum-offline/report',open:'never'}]],
 outputDir:'artifacts/museum-offline/results',use:{viewport:{width:1440,height:1000},offline:true,screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}}});
