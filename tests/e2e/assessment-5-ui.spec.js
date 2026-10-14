import {test,expect} from '@playwright/test';

const KEY='bes-offline-demo-user-v943';
const admin={
  id:'a5-design-admin',authId:'a5-design-admin',role:'admin',name:'Assessment QA',
  school:'BRIAN',email:'assessment-qa@brianenglish.local',approved:true,
  createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z',
  permissions:{mode:'all',allowed:[]},provider:'offline-demo',demo:true,
};

test.describe('Assessment 5.0 accessible layout and navigation',()=>{
 test.beforeEach(async({page})=>{
  await page.addInitScript(({key,user})=>localStorage.setItem(key,JSON.stringify(user)),{key:KEY,user:admin});
 });
 for(const width of [1536,1024,390]){
  test('Bento and activity library remain visible at '+width+'px',async({page})=>{
   await page.setViewportSize({width,height:900});
   await page.goto('/#/tool/lesson-check-studio');
   await expect(page.locator('.lcs5-command')).toBeVisible({timeout:20000});
   await expect(page.locator('.lcs5-bento-grid button')).toHaveCount(4);
   const library=page.locator('#lcs5-activity-library');
   await expect(library).toBeVisible();
   await expect(library.locator('.lcs5-command-tools')).toBeVisible();
   const list=library.getByRole('button',{name:'List',exact:true});
   await list.click();
   await expect(list).toHaveAttribute('aria-pressed','true');
   const grid=library.getByRole('button',{name:'Grid',exact:true});
   await grid.click();
   await expect(grid).toHaveAttribute('aria-pressed','true');
   await library.getByRole('button',{name:/Lọc nâng cao|More filters/}).click();
   await expect(library.locator('.lcs5-advanced-filters')).toBeVisible();
   const rect=await page.locator('.lcs5-bento-grid').boundingBox();
   expect(rect?.width).toBeGreaterThan(150);
  });
 }
});
