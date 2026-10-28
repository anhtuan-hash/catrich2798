import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const PORT=5202, BASE='http://127.0.0.1:'+PORT, ART='artifacts/halloween-v6';
mkdirSync(ART,{recursive:true});
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'pipe'});
let stderr='',browser;vite.stderr.on('data',d=>stderr+=String(d));
const pause=n=>new Promise(resolve=>setTimeout(resolve,n));
const capture=async page=>page.evaluate(()=>{
 const q=s=>document.querySelector(s),style=(s,p)=>getComputedStyle(q(s),p);
 const hero=q('#v4-hero'),gallery=q('#v4-slideshow'),header=q('#v4-slideshow .bhs-home__header');
 return {
  theme:q('.app-shell')?.dataset.halloweenHomeV4,
  bodyBg:style('body').backgroundColor,
  heroBg:style('#v4-hero').backgroundImage,
  heroImg:q('#v4-hero img')?.getAttribute('src'),
  galleryBg:style('#v4-slideshow').backgroundImage,
  galleryPseudoHeight:style('#v4-slideshow','::before').height,
  galleryPseudoPosition:style('#v4-slideshow','::before').position,
  galleryHeaderGap:Math.round(header.getBoundingClientRect().top-gallery.getBoundingClientRect().top),
  footerBg:style('footer').backgroundImage,
  practiceBg:style('#v4-weekly').backgroundImage,
  lessonCount:q('#v4-weekly')?.querySelectorAll('.bha-grade-lesson button').length,
  overflow:document.documentElement.scrollWidth>window.innerWidth+2
 };
});
const evidence=[];
try {
 let ready=false;
 for(let i=0;i<90;i++){if(vite.exitCode!==null)throw Error(stderr);try{let r=await fetch(BASE+'/tests/fixtures/halloween-home-v6.html');if(r.ok){ready=true;break}}catch{}await pause(250)}
 assert.ok(ready,'V6 fixture must boot');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [device,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(BASE+'/tests/fixtures/halloween-home-v6.html',{waitUntil:'networkidle'});
  await page.locator('#v4-hero').waitFor();
  const off=await capture(page);
  await page.screenshot({path:ART+'/'+device+'-original.png',fullPage:true,animations:'disabled'});
  await page.locator('#v4-toggle').click();await pause(200);
  const on=await capture(page);
  await page.screenshot({path:ART+'/'+device+'-repaired.png',fullPage:true,animations:'disabled'});
  assert.equal(on.theme,'on',device+' theme on');
  assert.match(on.heroBg,/hero-1793195941901-36cea510456f\.webp/,device+' hero must use real illustrated source rather than flat vector');
  assert.equal(on.galleryPseudoPosition,'static',device+' seasonal pseudo decoration must not use absolute legacy positioning');
  assert.ok(on.galleryHeaderGap<105,device+' Photo Story must have no dead 390px spacer; actual gap='+on.galleryHeaderGap);
  assert.match(on.galleryBg,/halloween-night\.svg/,device+' gallery art continues');
  assert.ok(on.lessonCount>=5,device+' lesson buttons work');
  assert.ok(!on.overflow,device+' no horizontal overflow');
  await page.locator('#v4-weekly .bha-grade-lesson button').first().click();
  await page.locator('#v4-toggle').click();await pause(200);
  const restored=await capture(page);
  for(const key of ['bodyBg','heroBg','heroImg','galleryBg','footerBg','practiceBg','galleryHeaderGap']){
    assert.equal(restored[key],off[key],device+' OFF restores '+key);
  }
  assert.equal(restored.theme,'off');
  assert.deepEqual(errors,[],device+' browser errors');
  const value={device,themeReset:true,heroSource:on.heroImg,galleryHeaderGap:on.galleryHeaderGap,pseudoHeight:on.galleryPseudoHeight,errors:errors.length,overflow:on.overflow};
  evidence.push(value);console.log('PASS HALLOWEEN V6 '+JSON.stringify(value));await page.close();
 }
}finally{if(browser)await browser.close();vite.kill('SIGTERM');writeFileSync(ART+'/results.json',JSON.stringify(evidence,null,2))}
