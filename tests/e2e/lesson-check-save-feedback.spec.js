import {test,expect} from '@playwright/test';

const KEY='bes-offline-demo-user-v943';
const admin={id:'lesson-check-save-qa',authId:'lesson-check-save-qa',role:'admin',name:'Lesson Check Save QA',
 school:'BRIAN',email:'save-qa@brianenglish.local',approved:true,
 createdAt:'2026-10-14T00:00:00.000Z',updatedAt:'2026-10-14T00:00:00.000Z',
 permissions:{mode:'all',allowed:[]},provider:'offline-demo',demo:true};
test.describe('Lesson Check activity-save feedback',()=>{
 test.beforeEach(async({page})=>{
  await page.addInitScript(({key,user})=>{localStorage.setItem(key,JSON.stringify(user));localStorage.setItem('bet-language','vi');},{key:KEY,user:admin});
 });
 for(const mode of ['single','batch']){
  test(mode+' warns about an unselected focus, then lets teacher correct it',async({page})=>{
   await page.setViewportSize({width:1536,height:960});
   await page.goto('/#/tool/lesson-check-studio');
   await page.locator('.lcs-arcade-create').click({timeout:20000});
   const editor=page.locator('.lcs-builder-shell .lcs-editor');
   await expect(editor).toBeVisible();
   if(mode==='batch')await editor.locator('.lcs-bulk-mode-buttons button').nth(1).click();
   await editor.getByPlaceholder(/Ví dụ: Unit/).fill('Cosmic Destiny Save QA');
   await editor.locator('textarea').fill('https://example.org/lesson-check-test');
   const focus=editor.locator('select[aria-invalid]');
   await expect(focus).toHaveValue('unclassified');
   await editor.locator('.lcs-form-actions .lcs-btn-primary').click();
   const error=editor.locator('.lcs-save-feedback.is-error');
   await expect(error).toBeVisible();
   await expect(error).toContainText('Chuyên đề');
   await expect(focus).toHaveAttribute('aria-invalid','true');
   await expect(focus).toBeFocused();
   await page.waitForTimeout(3200);
   await expect(error).toBeVisible();
   await focus.selectOption('grammar');
   await expect(error).toHaveCount(0);
   await expect(editor.locator('.lcs-form-actions .lcs-btn-primary')).toBeEnabled();
  });
 }
});
