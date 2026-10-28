import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {chromium} from '@playwright/test';

const PORT=5199,BASE='http://127.0.0.1:'+PORT;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'pipe'});
let stderr='',browser;
vite.stderr.on('data',c=>{stderr+=String(c)});
const folder='artifacts/halloween-home-v4';
mkdirSync(folder,{recursive:true});
const gate=(id,cond,note)=>{assert.ok(cond,id+' — '+note);console.log('PASS '+id+' mockup? '+note);};
try{
 let ready=false;
 for(let i=0;i<80;i++){
   if(vite.exitCode!==null)throw Error('Vite failed: '+stderr);
   try{const r=await fetch(BASE+'/tests/fixtures/halloween-home-v4.html');if(r.ok){ready=true;break;}}
   catch{}
   await pause(250);
 }
 gate('BOOT',ready,'Vite preview ready');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [label,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(BASE+'/tests/fixtures/halloween-home-v4.html',{waitUntil:'networkidle'});
   await page.locator('#v4-hero').waitFor();
   const baseline=await page.evaluate(()=>{
     const style=s=>getComputedStyle(document.querySelector(s));
     return {
       heroSrc:document.querySelector('#v4-hero img')?.getAttribute('src'),
       hero:style('#v4-hero').backgroundImage,
       nav:style('.brian-nav').backgroundImage,
       navColor:style('[data-nav-key=apps]').backgroundColor,
       footer:style('footer').backgroundImage,
       brand:style('.signature-footer-v50-brand').backgroundImage,
       practice:style('#v4-weekly').backgroundImage,
       slideshow:style('#v4-slideshow').backgroundImage,
       count:document.querySelector('#v4-clicks')?.textContent,
     };
   });
   await page.screenshot({path:folder+'/'+label+'-OFF.png',fullPage:true,animations:'disabled'});
   await page.locator('#v4-toggle').click();
   await page.waitForTimeout(320);
   const on=await page.evaluate(()=>{
     const style=s=>getComputedStyle(document.querySelector(s));
     return {
       shell:document.querySelector('.app-shell')?.dataset.halloweenHomeV4,
       html:document.documentElement.dataset.halloweenHomeV4,
       heroSrc:document.querySelector('#v4-hero img')?.getAttribute('src'),
       hero:style('#v4-hero').backgroundImage,
       heroOpacity:style('#v4-hero img').opacity,
       nav:style('.brian-nav').backgroundImage,
       navColor:style('[data-nav-key=apps]').backgroundColor,
       navActive:style('[data-nav-key=home]').backgroundColor,
       footer:style('footer').backgroundImage,
       brand:style('.signature-footer-v50-brand').backgroundImage,
       profile:style('.signature-footer-v50-profile').backgroundImage,
       credentials:style('.signature-footer-v50-credentials').backgroundImage,
       practice:style('#v4-weekly').backgroundImage,
       slideshow:style('#v4-slideshow').backgroundImage,
       slideshowFit:style('#v4-slideshow img').objectFit,
       globalStickerVisibility:style('#global-sticker-simulation').visibility,
       overflow:document.documentElement.scrollWidth>window.innerWidth+1,
       footerContent:document.querySelector('.signature-footer-v50-main')?.textContent,
     };
   });
   await page.screenshot({path:folder+'/'+label+'-ON.png',fullPage:true,animations:'disabled'});
   gate('G01',on.nav.includes('halloween-navbar.svg') && on.navColor==='rgb(255, 248, 240)' &&
     on.navActive==='rgb(244, 173, 105)' && on.navColor!==on.navActive,
     label+' navbar has one ivory inactive tone and pumpkin selection');
   gate('G02',on.heroSrc===baseline.heroSrc && on.heroOpacity==='1' &&
     !on.hero.includes('halloween-night'),label+' original CMS Hero preserved, not covered by new veil');
   gate('G03',on.slideshowFit==='contain' &&
     on.slideshow.includes('halloween-night.svg'),
     label+' Photo Story poster remains contained and seasonal section framed');
   gate('G04',on.practice.includes('linear-gradient') &&
     on.practice!==baseline.practice,
     label+' weekly practice transitions from original to coordinated parchment');
   gate('G05',on.brand.includes('halloween-brand-card.svg') &&
     on.profile.includes('halloween-profile-card.svg') &&
     on.credentials.includes('halloween-credentials-card.svg') &&
     on.footer!==baseline.footer,
     label+' footer three card illustrations and frame coordinated');
   gate('G06',on.globalStickerVisibility==='hidden' &&
     on.shell==='on' && on.html==='on',label+' floating motifs hidden, full-home state on');
   gate('G07',!on.overflow,label+' no horizontal overflow');
   await page.locator('[data-nav-key=apps]').click();
   await page.locator('#v4-weekly .bha-grade-lesson button').first().click();
   await page.locator('.bes-portfolio-footer-trigger').click();
   gate('INTERACTION',(await page.locator('#v4-clicks').textContent())==='2'&&
       (await page.locator('.bes-portfolio-dialog').count())===1,
       label+' real nav, weekly and Portfolio buttons respond');
   await page.locator('.bes-portfolio-dialog-close').click();
   await page.locator('#v4-toggle').click();
   await page.waitForTimeout(330);
   const restored=await page.evaluate(()=>{
     const css=s=>getComputedStyle(document.querySelector(s));
     return {
       nav:css('.brian-nav').backgroundImage,navColor:css('[data-nav-key=apps]').backgroundColor,
       footer:css('footer').backgroundImage,brand:css('.signature-footer-v50-brand').backgroundImage,
       practice:css('#v4-weekly').backgroundImage,slideshow:css('#v4-slideshow').backgroundImage,
       shell:document.querySelector('.app-shell').dataset.halloweenHomeV4,
       overflow:document.documentElement.scrollWidth>window.innerWidth+1
     };
   });
   gate('RESTORE',restored.nav===baseline.nav&&restored.navColor===baseline.navColor&&
     restored.footer===baseline.footer&&restored.brand===baseline.brand&&
     restored.practice===baseline.practice&&restored.slideshow===baseline.slideshow&&
     restored.shell==='off'&&!restored.overflow,
     label+' Halloween OFF restores exact original background CSS');
   gate('NO-ERROR',errors.length===0,label+' console has no uncaught JS exception: '+errors.join('; '));
   await page.close();
 }
 console.log('ALL SEVEN HALLOWEEN V4 BROWSER GATES PASS. Screenshots are evidence for visual comparison, not proof of an identical live site.');
}finally{if(browser)await browser.close();vite.kill('SIGTERM');}
