import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const PORT=5201,BASE='http://127.0.0.1:'+PORT;
const folder='artifacts/halloween-home-v5';
mkdirSync(folder,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'pipe'});
let stderr='',browser;
server.stderr.on('data',bytes=>{stderr+=String(bytes)});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const snapshot=async page=>page.evaluate(()=>{
 const q=s=>document.querySelector(s),s=s=>q(s)?getComputedStyle(q(s)):null;
 return {
  theme:q('.app-shell')?.dataset.halloweenHomeV4,
  heroBg:s('#v4-hero')?.backgroundImage,heroSource:q('#v4-hero img')?.getAttribute('src'),
  mediaVisibility:s('#v4-hero .hero-cms__background')?.visibility,
  pageBg:s('.app-shell')?.backgroundImage,
  practiceBg:s('#v4-weekly')?.backgroundImage,
  navBg:s('.brian-nav')?.backgroundImage,
  footerBg:s('footer')?.backgroundImage,
  galleryBg:s('#v4-slideshow')?.backgroundImage,
  galleryFit:s('#v4-slideshow .bss-motion__image')?.objectFit,
  grade10Border:s('.bha-folio-grade--10')?.borderColor,
  grade11Border:s('.bha-folio-grade--11')?.borderColor,
  grade12Border:s('.bha-folio-grade--12')?.borderColor,
  outOfBounds:document.documentElement.scrollWidth>window.innerWidth+2,
  lessons:q('[data-v4-simulated-injected-lesson-list]')?.querySelectorAll('button')?.length||0
 };
});
const results=[];
try {
 let ready=false;
 for(let i=0;i<90;i++){
  if(server.exitCode!==null)throw Error('Vite server quit '+stderr);
  try{const res=await fetch(BASE+'/tests/fixtures/halloween-home-v5.html');if(res.ok){ready=true;break;}}catch{}
  await pause(250);
 }
 assert.ok(ready,'Vite V5 test fixture must start');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [label,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(BASE+'/tests/fixtures/halloween-home-v5.html',{waitUntil:'networkidle'});
  await page.locator('#v4-hero').waitFor();
  const baseline=await snapshot(page);
  await page.screenshot({path:folder+'/'+label+'-original.png',fullPage:true,animations:'disabled'});
  await page.locator('#v4-toggle').click();
  await pause(400);
  const on=await snapshot(page);
  await page.screenshot({path:folder+'/'+label+'-halloween.png',fullPage:true,animations:'disabled'});
  assert.equal(on.theme,'on',label+': master ON');
  assert.ok(on.heroBg?.includes('halloween-v5-hero.svg'),label+': illustrated hero');
  assert.ok(on.pageBg?.includes('halloween-v5-environment.svg'),label+': entire home dark environmental background');
  assert.equal(on.mediaVisibility,'hidden',label+': original CMS art is temporarily replaced, not deleted');
  assert.equal(on.heroSource,baseline.heroSource,label+': original CMS source retained');
  assert.ok(on.practiceBg?.includes('halloween-v5-environment.svg'),label+': practice redesigned');
  assert.ok(on.footerBg?.includes('halloween-v5-environment.svg'),label+': footer redesigned');
  assert.ok(on.galleryBg?.includes('halloween-night.svg'),label+': gallery designed');
  assert.equal(on.galleryFit,'contain',label+': artwork never cropped');
  assert.notEqual(on.grade10Border,on.grade11Border,label+': semantic grade colors distinct');
  assert.notEqual(on.grade11Border,on.grade12Border,label+': grade 11 and 12 distinct');
  assert.ok(on.lessons>=5,label+': real lesson controls remain');
  assert.ok(!on.outOfBounds,label+': no horizontal overflow');
  await page.locator('#v4-weekly .bha-grade-lesson button').first().click();
  await page.locator('#v4-toggle').click();
  await pause(400);
  const off=await snapshot(page);
  for(const prop of ['heroBg','pageBg','practiceBg','navBg','footerBg','galleryBg','grade10Border','grade11Border','grade12Border']){
    assert.equal(off[prop],baseline[prop],label+': OFF restores original '+prop);
  }
  assert.equal(off.mediaVisibility,baseline.mediaVisibility,label+': CMS media rendered again');
  assert.equal(off.heroSource,baseline.heroSource,label+': CMS file unchanged after ON/OFF');
  assert.equal(off.theme,'off',label+': master OFF');
  assert.ok(!off.outOfBounds,label+': no OFF overflow');
  assert.deepEqual(errors,[],label+': no uncaught JS exceptions');
  results.push({label,master:'ON/OFF verified',artwork:true,restore:true,lessons:on.lessons,pageErrors:errors.length,overflow:false});
  console.log('PASS HALLOWEEN V5 '+label,JSON.stringify(results.at(-1)));
  await page.close();
 }
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
 writeFileSync(folder+'/results.json',JSON.stringify(results,null,2));
}
