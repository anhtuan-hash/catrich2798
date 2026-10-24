import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const baseCss=readFileSync(new URL('../../src/features/events/dashboard/EventPopup.css',import.meta.url),'utf8');
const motionCss=readFileSync(new URL('../../src/features/events/dashboard/EventPopupMotion.css',import.meta.url),'utf8');
const setup=async (page,motion='rise',exit='shrink')=>{
  await page.setContent(`
    <main id="root"><button id="underlying">Dashboard remains mounted</button></main>
    <div class="be-pop-overlay" data-event-motion="true" data-event-enter="${motion}" data-event-exit="${exit}"
      style="--be-event-enter-ms:400ms;--be-event-exit-ms:290ms">
      <div class="be-pop-scrim"></div>
      <section class="be-pop-dialog" role="dialog" aria-modal="true" aria-label="Thông báo sự kiện">
        <header class="be-pop-header"><h2>Thông báo sự kiện</h2>
          <button type="button" id="dismiss">Đóng</button></header>
        <div style="padding:24px">Lễ sinh hoạt chuyên đề Halloween</div>
      </section>
    </div>
  `);
  await page.addStyleTag({content:baseCss+'\n'+motionCss});
};
for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
 for(const [enter,exit] of [['rise','shrink'],['flip','slide'],['scale','fade']]) {
   test(`event popup animates open (${enter}) and close (${exit}) at ${viewport.width}px`,async ({page})=>{
     await page.setViewportSize(viewport);
     await setup(page,enter,exit);
     const info=await page.evaluate(()=>{
       const d=document.querySelector('.be-pop-dialog');
       const r=d.getBoundingClientRect();
       return {a:getComputedStyle(d).animationName,width:r.width,left:r.left,right:r.right};
     });
     expect(info.a).toBe('beEventEnter'+enter[0].toUpperCase()+enter.slice(1));
     expect(info.left).toBeGreaterThanOrEqual(-1);
     expect(info.right).toBeLessThanOrEqual(viewport.width+1);
     await page.locator('.be-pop-overlay').evaluate(node=>node.classList.add('is-leaving'));
     const exitStyle=await page.locator('.be-pop-dialog').evaluate(node=>getComputedStyle(node).animationName);
     expect(exitStyle).toBe('beEventExit'+exit[0].toUpperCase()+exit.slice(1));
     await page.waitForTimeout(320);
     const opacity=await page.locator('.be-pop-dialog').evaluate(node=>Number(getComputedStyle(node).opacity));
     expect(opacity).toBeLessThan(.15);
   });
 }
}
test('reduced-motion has no animation for both entry and exit',async ({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await setup(page);
 let animation=await page.locator('.be-pop-dialog').evaluate(node=>getComputedStyle(node).animationName);
 expect(animation).toBe('none');
 await page.locator('.be-pop-overlay').evaluate(node=>node.classList.add('is-leaving'));
 animation=await page.locator('.be-pop-dialog').evaluate(node=>getComputedStyle(node).animationName);
 expect(animation).toBe('none');
});
