import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const PORT=5205, BASE='http://127.0.0.1:'+PORT, ART='artifacts/halloween-v7';
mkdirSync(ART,{recursive:true});
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'pipe'});
let errorLog='',browser;
vite.stderr.on('data',chunk=>errorLog+=String(chunk));
const sleep=n=>new Promise(r=>setTimeout(r,n));
const redactFooter=page=>page.evaluate(()=>{
 document.querySelectorAll('.signature-footer-v50-profile h2').forEach(node=>{node.textContent='HỒ SƠ GIÁO VIÊN';});
 document.querySelectorAll('.signature-footer-v50-detail,.signature-footer-v50-credentials li').forEach(node=>{const value=node.querySelector('span:last-child');if(value)value.textContent='Nội dung đã ẩn';else node.textContent='Nội dung đã ẩn';});
 document.querySelectorAll('.bes-portfolio-footer-trigger strong').forEach(node=>{node.textContent='Người phát triển';});
});
const snap=async page=>page.evaluate(()=>{
 const e=s=>document.querySelector(s),css=(s,p)=>getComputedStyle(e(s),p);
 const shell=e('.app-shell'),gallery=e('#v4-slideshow'),header=e('#v4-slideshow .bhs-home__header');
 return {
   active:shell?.dataset.halloweenHomeV4,html:document.documentElement.dataset.halloweenHomeV4,
   body:css('body').backgroundColor,shellBackground:css('.app-shell').backgroundImage,
   heroBackground:css('#v4-hero').backgroundImage,
   nav:css('.brian-nav').backgroundImage,
   navInactive:css('.brian-nav__primary button:not(.is-active)').backgroundColor,
   navActive:css('.brian-nav__primary button.is-active').backgroundColor,
   dateLine:css('.bha-editorial-dateline').display,
   galleryBackground:css('#v4-slideshow').backgroundImage,
   galleryGap:Math.round(header.getBoundingClientRect().top-gallery.getBoundingClientRect().top),
   galleryStageHeight:Math.round(e('.bhs-home__stage').getBoundingClientRect().height),
   practiceBackground:css('#v4-weekly').backgroundImage,
   footerBackground:css('footer').backgroundImage,
   lessonCount:e('#v4-weekly')?.querySelectorAll('.bha-grade-lesson button').length,
   overflow:document.documentElement.scrollWidth > window.innerWidth+2
 };
});
const report=[];
try{
 let ok=false;
 for(let i=0;i<100;i++){
   if(vite.exitCode!==null)throw Error('Vite quit: '+errorLog);
   try{const r=await fetch(BASE+'/tests/fixtures/halloween-home-v7.html');if(r.ok){ok=true;break;}}catch{}
   await sleep(250);
 }
 assert.ok(ok,'V7 fixture must boot');
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 for(const [device,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.goto(BASE+'/tests/fixtures/halloween-home-v7.html',{waitUntil:'networkidle'});
  await page.locator('#v4-hero').waitFor();
  const off=await snap(page);
  await redactFooter(page);
  await page.screenshot({path:ART+'/'+device+'-ORIGINAL.png',fullPage:true,animations:'disabled'});
  await page.locator('#v4-toggle').click();await sleep(230);
  const on=await snap(page);
  await redactFooter(page);
  await page.screenshot({path:ART+'/'+device+'-V7.png',fullPage:true,animations:'disabled'});
  assert.equal(on.active,'on',device+': ON');
  assert.equal(on.dateLine,'none',device+': hide alien original dateline');
  const channels=on.body.match(/\d+/g)?.slice(0,3).map(Number)||[];
  assert.ok(channels.length===3&&channels.every(channel=>channel<80),device+': no white site gutters; body '+on.body);
  assert.ok(on.galleryGap<85,device+': artwork section begins near heading: '+on.galleryGap);
  assert.ok(on.galleryStageHeight>=215,device+': real artwork still has space');
  assert.ok(on.lessonCount>=5,device+': real lesson buttons remain');
  assert.ok(!on.overflow,device+': no horizontal overflow');
  assert.ok(on.heroBackground!==off.heroBackground,device+': seasonal hero');
  assert.ok(on.practiceBackground!==off.practiceBackground,device+': practice design');
  assert.notEqual(on.nav,off.nav,device+': navigation themed');
  await page.locator('#v4-weekly .bha-grade-lesson button').first().click();
  await page.locator('#v4-toggle').click();await sleep(230);
  const back=await snap(page);
  for(const field of ['body','shellBackground','heroBackground','nav','navActive','dateLine','galleryBackground','galleryGap','practiceBackground','footerBackground']){
    assert.equal(back[field],off[field],device+': OFF exact original '+field);
  }
  assert.equal(back.active,'off');
  assert.deepEqual(errs,[],device+': JS console');
  report.push({device,headerGap:on.galleryGap,stageHeight:on.galleryStageHeight,originalRestored:true,themeOn:true});
  console.log('PASS HALLOWEEN V7 '+JSON.stringify(report.at(-1)));
  await page.close();
 }
}finally{if(browser)await browser.close();vite.kill('SIGTERM');writeFileSync(ART+'/report.json',JSON.stringify(report,null,2))}
