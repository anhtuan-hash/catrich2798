import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
const PORT=5197, BASE='http://127.0.0.1:'+PORT;
const sleep=(ms)=>new Promise((r)=>setTimeout(r,ms));
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'pipe'});
let log='',browser;
vite.stderr.on('data',chunk=>{log+=String(chunk);});
try {
 let ready=false;
 for(let i=0;i<70;i++) {
   if(vite.exitCode!==null)throw new Error('Vite failed to start: '+log);
   try{if((await fetch(BASE+'/tests/fixtures/halloween-navbar-test.html')).ok){ready=true;break;}}
   catch{}
   await sleep(250);
 }
 assert.ok(ready,'Vite fixture server ready');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto(BASE+'/tests/fixtures/halloween-navbar-test.html',{waitUntil:'networkidle'});
 const css=async(selector)=>page.locator(selector).evaluate(el=>{
   const s=getComputedStyle(el),rect=el.getBoundingClientRect();
   return {background:s.backgroundImage,color:s.color,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}};
 });
 const nav='.brian-nav';
 const originalHero=await css('#outside-hero');
 const active=await css(nav);
 assert.ok(active.background.includes('halloween-navbar.svg'),'seasonal asset applies to actual desktop nav');
 assert.ok(!originalHero.background.includes('halloween-navbar.svg'),'Hero is never Halloween themed');
 await page.locator('.brian-nav__primary [data-nav-key="home"]').click();
 assert.equal(await page.locator('#nav-click-count').textContent(),'1','nav button click still works with skin');
 await page.locator('#theme-toggle').click();
 const off=await css(nav);
 assert.ok(!off.background.includes('halloween-navbar.svg'),'turning OFF restores original background');
 assert.deepEqual({width:off.rect.width,height:off.rect.height},{width:active.rect.width,height:active.rect.height},
  'desktop nav geometry stays unchanged on toggle');
 await page.locator('.brian-nav__primary [data-nav-key="apps"]').click();
 assert.equal(await page.locator('#nav-click-count').textContent(),'2','nav remains interactive after OFF');
 await page.locator('#theme-toggle').click();
 assert.ok((await css(nav)).background.includes('halloween-navbar.svg'),'turn ON returns seasonal appearance');
 console.log('✓ Desktop navbar ON/OFF restores original without moving navbar or breaking click');
 await page.locator('#mobile-toggle').click();
 await page.setViewportSize({width:390,height:844});
 const mobile='.bes-mobile-topbar';
 const onMobile=await css(mobile);
 assert.ok(onMobile.background.includes('halloween-navbar.svg'),'mobile navbar receives scoped Halloween background');
 await page.locator('#mobile-menu').click();
 assert.equal(await page.locator('#nav-click-count').textContent(),'3','mobile touch navigation remains interactive');
 await page.locator('#theme-toggle').click();
 const offMobile=await css(mobile);
 assert.ok(!offMobile.background.includes('halloween-navbar.svg'),'mobile OFF restores the original theme');
 assert.deepEqual({width:offMobile.rect.width,height:offMobile.rect.height},
  {width:onMobile.rect.width,height:onMobile.rect.height},'mobile navbar geometry unchanged');
 const finalHero=await css('#outside-hero');
 assert.equal(finalHero.color,originalHero.color,'Hero text unaffected by both themes');
 console.log('✓ Mobile navbar ON/OFF and unaffected Hero');
 console.log('BRIAN Halloween Navbar browser QA PASS');
} finally {if(browser)await browser.close();vite.kill('SIGTERM');}
