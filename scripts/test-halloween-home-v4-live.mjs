import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const HOME='https://esl-brian.vercel.app/#/home';
const folder='artifacts/halloween-v4-live';
mkdirSync(folder,{recursive:true});
const all=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [name,width,height] of [['desktop',1440,900],['wide',1536,960],['mobile',390,844]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,locale:'vi-VN'});
   const problems=[];
   page.on('pageerror',e=>problems.push(String(e)));
   await page.goto(HOME,{waitUntil:'domcontentloaded',timeout:40000});
   await page.locator('.bha-home, .bes-mobile-home').first().waitFor({state:'visible',timeout:40000});
   await page.waitForFunction(() => document.querySelector('.app-shell[data-route="home"]')?.dataset.halloweenHomeV4==='on',{timeout:30000}).catch(()=>{});
   await page.waitForTimeout(2300);
   const metrics=await page.evaluate(()=>{
     const q=s=>document.querySelector(s),css=s=>q(s)?getComputedStyle(q(s)):null;
     const elementRect=s=>{const n=q(s);if(!n)return null;const r=n.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};};
     const heroImg=q('.hero-cms__background img,.hero-cms__media');
     const art=q('.bhs-home .bss-motion__image');
     const foot=q('footer[data-app-shell-footer]');
     const logos=[...document.querySelectorAll('footer .signature-footer-v50-main img')].map(n=>({alt:n.alt,loaded:n.complete&&n.naturalWidth>0}));
     return {
       url:location.href,route:q('.app-shell')?.dataset.route,master:q('.app-shell')?.dataset.halloweenHomeV4,
       nav:q('.brian-nav')?.dataset.halloweenNav,mobileNav:q('.bes-mobile-shell')?.dataset.halloweenNav,
       footer:foot?.dataset.halloweenFooter,
       heroImage:heroImg?{src:heroImg.currentSrc||heroImg.src,loaded:heroImg.complete&&heroImg.naturalWidth>0,filter:getComputedStyle(heroImg).filter,opacity:getComputedStyle(heroImg).opacity}:null,
       hero:elementRect('.bha-hero.hero-cms, .bes-mobile-home__premium-hero'),
       slideshow:elementRect('.bhs-home'),
       slideshowImage:art?{loaded:art.complete&&art.naturalWidth>0,fit:getComputedStyle(art).objectFit}:null,
       story:elementRect('.bhs-home__story-panel'),stage:elementRect('.bhs-home__stage'),
       practice:elementRect('.bha-practice, .bes-mobile-home__practice'),
       grades:document.querySelectorAll('.bha-folio-grade').length,
       footerRect:elementRect('footer[data-app-shell-footer]'),
       cards:[...document.querySelectorAll('footer .signature-footer-v50-main > section')].map(el=>({name:el.className,bg:getComputedStyle(el).backgroundImage,rect:{w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)}})),
       logos,
       overlayVisible:!!q('.bes-halloween-atmosphere') && getComputedStyle(q('.bes-halloween-atmosphere')).visibility!=='hidden' && getComputedStyle(q('.bes-halloween-atmosphere')).display!=='none',
       pageOverflow:document.documentElement.scrollWidth>window.innerWidth+2,
       loginVisible:!!q('.brian-nav__login'),
     };
   });
   await page.screenshot({path:folder+'/'+name+'-production-ON.png',fullPage:true,animations:'disabled',timeout:40000});
   all.push({name,metrics,problems});
   const zone=metrics;
   assert.equal(zone.master,'on',name+': confirmed real production master flag ON');
   assert.equal(zone.footer,'true',name+': canonical footer themed ON');
   assert.ok(zone.hero && zone.hero.w>100,name+': real Hero is visible');
   assert.ok(zone.practice && zone.practice.w>100,name+': real weekly-practice section visible');
   assert.ok(zone.footerRect && zone.cards.length===3,name+': three institutional footer cards visible');
   assert.ok(!zone.pageOverflow,name+': no horizontal overflow');
   assert.equal(zone.overlayVisible,false,name+': floating global stickers not covering content');
   if(zone.slideshow)assert.ok(zone.slideshowImage?.loaded && zone.slideshowImage?.fit==='contain',
       name+': public Photo Story image loaded and not cropped');
   if(name!=='mobile')assert.equal(zone.nav,'true',name+': desktop Halloween navigation ON');
   if(name==='mobile')assert.equal(zone.mobileNav,'true',name+': mobile Halloween navigation ON');
   assert.ok(zone.logos.every(x=>x.loaded),name+': all original school/footer logos loaded');
   console.log('LIVE HALLOWEEN V4 '+name.toUpperCase()+' VERIFIED',JSON.stringify({master:zone.master,photos:zone.slideshowImage,footerCards:zone.cards.length,overflow:zone.pageOverflow,pageErrors:problems.length}));
   await page.close();
 }
}finally{
 await browser.close();
 writeFileSync(folder+'/diagnostics.json',JSON.stringify(all,null,2));
}
console.log('Real public Production Home screenshots captured: desktop, wide, mobile.');
