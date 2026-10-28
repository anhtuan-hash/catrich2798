import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const PORT=5206,BASE='http://127.0.0.1:'+PORT,ART='artifacts/halloween-v8';
mkdirSync(ART,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'pipe'});
let err='',browser;server.stderr.on('data',x=>err+=String(x));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const state=async page=>page.evaluate(()=>{
 const e=s=>document.querySelector(s), css=(s,p)=>getComputedStyle(e(s),p);
 const g=e('#v4-slideshow'),h=e('#v4-slideshow .bhs-home__header');
 return {
  master:e('.app-shell')?.dataset.halloweenHomeV4,
  body:css('body').backgroundColor, shell:css('.app-shell').backgroundImage,
  hero:css('#v4-hero').backgroundImage,
  heroRadius:css('#v4-hero').borderRadius,
  nav:css('.brian-nav').backgroundImage,
  activeNav:css('.brian-nav__primary button.is-active').backgroundImage,
  gallery:css('#v4-slideshow').backgroundImage,
  galleryGap:Math.round(h.getBoundingClientRect().top-g.getBoundingClientRect().top),
  practice:css('#v4-weekly').backgroundImage,
  footer:css('footer').backgroundImage,
  imageNaturalWidth:e('#v4-slideshow .bss-motion__image')?.naturalWidth,
  imageFit: e('#v4-slideshow .bss-motion__image') ? css('#v4-slideshow .bss-motion__image').objectFit : null,
  dateLine:css('.bha-editorial-dateline').display,
  counts: e('#v4-clicks')?.textContent,
  overflow: document.documentElement.scrollWidth>innerWidth+2
 };
});
const results=[];
try{
 let ok=false;
 for(let i=0;i<100;i++){
  if(server.exitCode!==null)throw Error(err);
  try{const r=await fetch(BASE+'/tests/fixtures/halloween-home-v8.html');if(r.ok){ok=true;break}}catch{}
  await sleep(250);
 }
 assert.ok(ok,'V8 fixture should start');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [label,width,height] of [['desktop',1440,900],['laptop',1280,800],['reference',1024,768],['tablet',768,1024],['mobile',390,844],['small-mobile',360,800]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(BASE+'/tests/fixtures/halloween-home-v8.html',{waitUntil:'networkidle'});
  await page.locator('#v4-hero').waitFor();
  const off=await state(page);
  await page.screenshot({path:ART+'/'+label+'-original.png',fullPage:true,animations:'disabled'});
  await page.locator('#v4-toggle').click();
  await sleep(400);
  const on=await state(page);
  await page.screenshot({path:ART+'/'+label+'-halloween.png',fullPage:true,animations:'disabled'});
  assert.equal(on.master,'on',label+' master enabled');
  assert.ok(on.hero.includes('halloween-v8-castle-art.avif'),label+' real art in Hero');
  assert.ok(on.hero.includes('linear-gradient'),label+' separate real text backdrop');
  assert.ok(on.shell!==off.shell,label+' entire world recolored');
  assert.ok(on.nav!==off.nav,label+' navbar themed');
  assert.ok(on.galleryGap<100,label+' no enormous gallery spacer: '+on.galleryGap);
  assert.ok(on.imageNaturalWidth>0,label+' actual slide image is loaded');
  assert.equal(on.imageFit,'contain',label+' preserve original artwork proportions');
  assert.ok(on.practice!==off.practice,label+' practice themed');
  assert.ok(on.footer!==off.footer,label+' footer themed');
  assert.equal(on.dateLine,'none',label+' remove extraneous dateline');
  assert.ok(!on.overflow,label+' no horizontal overflow');
  await page.locator('#v4-weekly .bha-grade-lesson button').first().click();
  const clicks=await page.locator('#v4-clicks').textContent();
  assert.ok(Number(clicks)>=1,label+' real lesson controls still clickable');
  await page.locator('#v4-toggle').click();await sleep(200);
  const restored=await state(page);
  for(const prop of ['body','shell','hero','heroRadius','nav','activeNav','gallery','practice','footer','dateLine']){
    assert.equal(restored[prop],off[prop],label+' original restored: '+prop);
  }
  assert.equal(restored.master,'off',label+' master disabled');
  assert.deepEqual(errors,[],label+' JS errors');
  results.push({viewport:label,size:width+'x'+height,artwork:'AVIF loaded',galleryGap:on.galleryGap,sourcePhotoLoaded:on.imageNaturalWidth>0,fullRestoration:true,noOverflow:true});
  console.log('PASS HALLOWEEN V8 '+JSON.stringify(results.at(-1)));
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1024,height:768},reducedMotion:'reduce'});
 await page.goto(BASE+'/tests/fixtures/halloween-home-v8.html',{waitUntil:'networkidle'});
 await page.locator('#v4-toggle').click();
 const animation=await page.locator('#v4-hero').evaluate(el=>getComputedStyle(el,'::after').animationName);
 assert.equal(animation,'none','reduced-motion stops ambient animation');
 await page.close();
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
 writeFileSync(ART+'/results.json',JSON.stringify(results,null,2));
}
