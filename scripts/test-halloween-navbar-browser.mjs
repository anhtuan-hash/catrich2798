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
 // Regression for the user-visible issue: grey glossy route pills with
 // dark-blue illegible labels in a dark Halloween navigation bar.
 await page.setViewportSize({width:1680,height:920});
 const pills = await page.locator('.brian-nav__primary > button').evaluateAll(nodes=>{
   const rgb=value=>(value.match(/[0-9]+(?:[.][0-9]+)?/g)||[]).slice(0,3).map(Number);
   const luminance=colors=>{
     const [r,g,b]=colors.map(v=>{
       const s=v/255; return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);
     });return .2126*r+.7152*g+.0722*b;
   };
   return nodes.map(node=>{
     const style=getComputedStyle(node),label=node.querySelector('.brian-nav__reports-label') || node;
     const ink=getComputedStyle(label).color;
     const contrast=((a,b)=>{const hi=Math.max(a,b),lo=Math.min(a,b);return (hi+.05)/(lo+.05)})
       (luminance(rgb(style.backgroundColor)),luminance(rgb(ink)));
     return {text:node.textContent.trim(),ink,background:style.backgroundColor,
       image:style.backgroundImage,contrast:Number(contrast.toFixed(2)),
       bounds:{width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}};
   });
 });
 assert.ok(pills.length>=9,'all major navigation tabs included in readability audit');
 for(const item of pills){
   assert.ok(item.contrast>=7,JSON.stringify(item)+' must meet WCAG AAA normal-text contrast');
   assert.equal(item.image,'none',item.text+' must not use grey glossy overlay');
   assert.equal(item.bounds.height,40,item.text+' original pill height remains 40px');
 }
 console.log('✓ All '+pills.length+' Halloween navigation pills have flat opaque high contrast labels (min '+Math.min(...pills.map(p=>p.contrast))+':1)');
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
