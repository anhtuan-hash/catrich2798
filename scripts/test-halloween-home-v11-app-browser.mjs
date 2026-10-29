// Exercise the actual production build as a guest without a Supabase backend.
// The separate fixture suite covers gallery data and more viewports; this test
// catches shell/runtime collisions that a simplified fixture cannot reveal.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
const PORT=5216, BASE=`http://127.0.0.1:${PORT}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'pipe'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let stderr='',browser;server.stderr.on('data',x=>stderr+=String(x));
const snapshot=page=>page.evaluate(()=>{
 const shell=document.querySelector('.app-shell');
 const home=document.querySelector('.brian-nav__primary [data-nav-key="home"]');
 const hero=document.querySelector('.bha-hero.hero-cms');
 const spacer=document.querySelector('[data-bes-pinned-hub-spacer="true"]');
 const rect=el=>el ? ({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.getBoundingClientRect().height}) : null;
 const sign=hero?.querySelector('.hero-cms__halloween-sign');
 return {master:shell?.dataset.halloweenHomeV4,homeBackground:home&&getComputedStyle(home).backgroundImage,
  signDisplay:sign&&getComputedStyle(sign).display,signText:sign?.textContent,
  heroSeason:hero?.dataset.halloweenHeroSeason,heroBlur:hero&&getComputedStyle(hero.querySelector('.hero-cms__content')).backdropFilter,
  spacer:rect(spacer),nav:rect(document.querySelector('.bes-top-chrome')),hero:rect(hero),
  title:[...hero?.querySelectorAll('h1 > span')||[]].map(el=>el.textContent),
  buttons:[...hero?.querySelectorAll('.hero-cms__button')||[]].map(rect),
  overflow:document.documentElement.scrollWidth>innerWidth+2};
});
try {
 let ready=false;for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error(stderr);try{if((await fetch(BASE)).ok){ready=true;break}}catch{}await sleep(200)}
 assert.ok(ready,'built application should start');
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 for(const [width,height] of [[1024,768],[768,1024],[390,844],[360,800]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('bes-halloween-home-master-v4',JSON.stringify({enabled:true,updatedAt:'2026-10-29T00:00:00Z'})));
  await page.goto(`${BASE}/#/home`,{waitUntil:'networkidle'});
  await page.locator('.bha-hero.hero-cms').waitFor();await page.waitForTimeout(500);
  const on=await snapshot(page);
  assert.equal(on.master,'on');assert.equal(on.heroSeason,'true');
  assert.deepEqual(on.title,['Happy','Halloween!']);assert.equal(on.heroBlur,'none');
  assert.equal(on.buttons.length,2,'both live hero buttons exist');
  assert.ok(on.buttons.every(button=>button.height>=38&&button.height<=64&&button.top>=on.hero.top&&button.bottom<=on.hero.bottom+1),'hero buttons are usable and not clipped');
  assert.equal(on.signText,'Same ClassroomBrighterFutures');
  assert.equal(on.signDisplay,width>900?'flex':'none');
  assert.equal(on.spacer?.height,0,'seasonal navigation does not leave an extra spacer');
  assert.ok(on.hero.top-on.nav.bottom<20,'hero follows nav without a large empty gap');
  assert.ok(/255, (2[01][0-9]|1[0-9][0-9]), (1[0-9][0-9]|[0-9]{1,2})/.test(on.homeBackground),`active navigation should be orange: ${on.homeBackground}`);
  assert.ok(!on.overflow,'no horizontal overflow on actual app');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('bes-halloween-home-master-updated',{detail:{enabled:false,verified:false,updatedAt:'2026-10-29T00:01:00Z'}})));
  await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset.halloweenHomeV4==='off');await page.waitForTimeout(100);
  const off=await snapshot(page);assert.equal(off.heroSeason,'false');assert.equal(off.signDisplay,null);assert.notEqual(off.homeBackground,on.homeBackground);
  assert.ok(off.spacer?.height>0,'original fixed-nav spacer returns when OFF');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('bes-halloween-home-master-updated',{detail:{enabled:true,verified:false,updatedAt:'2026-10-29T00:02:00Z'}})));
  await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset.halloweenHomeV4==='on');await page.waitForTimeout(100);
  const onAgain=await snapshot(page);assert.equal(onAgain.homeBackground,on.homeBackground);assert.equal(onAgain.spacer?.height,0);
  assert.deepEqual(errors,[],'no unhandled startup errors in the production build');
  console.log(`PASS actual built app ${width}x${height}: theme ON/OFF, nav, spacer, hero and overflow (backend unavailable)`);
  await page.close();
 }
} finally {if(browser)await browser.close();server.kill('SIGTERM')}
