import {test,expect} from '@playwright/test';

const DEMO_SESSION_KEY='bes-offline-demo-user-v943';
const admin={
  id:'inline-title-search-demo-admin',authId:'inline-title-search-demo-admin',
  role:'admin',name:'Lesson Check Search Tester',school:'BRIAN',
  email:'lesson-check-search@brianenglish.local',
  approved:true,createdAt:'2026-10-14T00:00:00.000Z',
  updatedAt:'2026-10-14T00:00:00.000Z',
  permissions:{mode:'all',allowed:[]},provider:'offline-demo',demo:true,
};

test.describe('Lesson Check quick activity title search visibility',()=>{
  test.beforeEach(async({page})=>{
    await page.addInitScript(({key,user})=>{
      localStorage.setItem(key,JSON.stringify(user));
      localStorage.setItem('bet-language','vi');
    },{key:DEMO_SESSION_KEY,user:admin});
  });

  for(const width of [1536,1024,390]){
    test('search is visible, accessible and editable at width '+width,async({page})=>{
      await page.setViewportSize({width,height:900});
      await page.goto('/#/tool/lesson-check-studio');
      const filterbar=page.locator('.lcs-arcade-filterbar');
      await expect(filterbar).toBeVisible({timeout:20000});
      const search=filterbar.locator('.lcs-search-always-visible');
      await expect(search).toBeVisible();
      await expect(search.locator('.lcs-search-visible-label')).toHaveText('Tìm tên');
      const textbox=search.locator('input[type="text"]');
      await expect(textbox).toHaveAttribute('aria-label','Tìm nhanh theo tên hoạt động');
      await expect(textbox).toBeVisible();
      const geometry=await search.evaluate(el=>{
        const rect=el.getBoundingClientRect();
        const css=getComputedStyle(el);
        return {width:rect.width,left:rect.left,right:rect.right,display:css.display,visibility:css.visibility};
      });
      expect(geometry.width).toBeGreaterThan(180);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width+1);
      expect(geometry.display).not.toBe('none');
      expect(geometry.visibility).toBe('visible');
      await textbox.fill('Invention');
      await expect(textbox).toHaveValue('Invention');
      // Live visibility regression: input remains interactable without relying on
      // the demo-session permission RPC or its asynchronous empty-state updates.

    });
  }
});
