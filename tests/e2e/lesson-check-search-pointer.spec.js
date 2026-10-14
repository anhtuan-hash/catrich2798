import { test, expect } from '@playwright/test';

const KEY='bes-offline-demo-user-v943';
const admin={
 id:'search-mouse-qa',authId:'search-mouse-qa',role:'admin',
 name:'Search Mouse QA',approved:true,school:'BRIAN',email:'search.mouse@brianenglish.local',
 createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z',
 permissions:{mode:'all',allowed:[]},provider:'offline-demo',demo:true,
};

test.describe('Lesson Check search actually accepts a mouse click',()=>{
 test.beforeEach(async({page})=>{
  await page.addInitScript(({key,user})=>{
   localStorage.setItem(key,JSON.stringify(user));
   localStorage.setItem('bet-language','vi');
  },{key:KEY,user:admin});
 });
 for(const width of [1536,1024,390]){
  test('click directly into the placeholder and type at '+width+' px',async({page})=>{
   await page.setViewportSize({width,height:900});
   await page.goto('/#/tool/lesson-check-studio');
   const search=page.locator('#lcs5-activity-library .lcs-search-always-visible');
   const input=search.locator('input[type="search"]');
   await expect(input).toBeVisible({timeout:20000});
   await input.scrollIntoViewIfNeeded();
   await expect(input).toBeInViewport();
   const hit=await input.evaluate(element=>{
    const r=element.getBoundingClientRect();
    const target=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    const style=getComputedStyle(element);
    return {hit:target?.tagName||null,targetClass:target?.className?.toString()?.slice(0,90)||'',
      inputPointerEvents:style.pointerEvents,inputRectWidth:r.width};
   });
   expect(hit.inputPointerEvents).toBe('auto');
   expect(hit.inputRectWidth).toBeGreaterThan(75);
   expect(hit.hit).toBe('INPUT');
   // Playwright's fill() can focus programmatically even if the mouse is blocked.
   // Use real pointer targeting and keyboard input instead.
   await input.click({timeout:7000});
   await expect(input).toBeFocused();
   await page.keyboard.type('Neural');
   await expect(input).toHaveValue('Neural');
   await expect(page.locator('.lcs-arcade-results-head')).toContainText('Neural');
   await input.press('Escape');
   await expect(input).toHaveValue('');
   const labelBox=await search.locator('.lcs-search-visible-label').boundingBox();
   expect(labelBox).not.toBeNull();
   await page.mouse.click(labelBox.x+labelBox.width/2,labelBox.y+labelBox.height/2);
   await expect(input).toBeFocused();
  });
 }
});
