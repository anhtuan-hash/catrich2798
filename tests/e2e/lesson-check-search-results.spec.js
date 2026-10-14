import { test, expect } from '@playwright/test';

// Regression for the issue where the textbox accepted keystrokes without
// demonstrating that the game cards and result counter actually filtered.
const SESSION_KEY='bes-offline-demo-user-v943';
const user={id:'search-functional-demo',authId:'search-functional-demo',role:'admin',approved:true,
  name:'Search QA',email:'search.qa@brianenglish.local',school:'BRIAN',
  createdAt:'2026-10-14T00:00:00Z',updatedAt:'2026-10-14T00:00:00Z',
  permissions:{mode:'all',allowed:[]},provider:'offline-demo',demo:true};
const fixtures=[
 {id:'00000000-0000-4000-8000-000000000101',title:'Artificial Intelligence: Neural Nexus Tower',grade:12,unit_no:4,focus_area:'vocabulary',has_access:true,activity_type:'game',updated_at:'2026-10-14T00:00:00Z'},
 {id:'00000000-0000-4000-8000-000000000102',title:'Cyber Hacker: Grammar Breach',grade:10,unit_no:5,focus_area:'grammar',has_access:true,activity_type:'game',updated_at:'2026-10-13T00:00:00Z'},
 {id:'00000000-0000-4000-8000-000000000103',title:'Space Inventors: The Galaxy Mission',grade:11,unit_no:5,focus_area:'mixed',has_access:true,activity_type:'game',updated_at:'2026-10-12T00:00:00Z'},
];
test.describe('Real-time activity title filtering',()=>{
 test.beforeEach(async({page})=>{
  await page.addInitScript(({key,user})=>{
    localStorage.setItem(key,JSON.stringify(user));
    localStorage.setItem('bet-language','vi');
  },{key:SESSION_KEY,user});
  // Intercept every request to the test-only invalid domain. No live Supabase
  // endpoint is contacted and no real account/library data enters this test.
  await page.route('https://search-fixture.invalid/**',async route=>{
    await route.fulfill({status:200,contentType:'application/json',
      headers:{'access-control-allow-origin':'*'},body:'[]'});
  });
  await page.route('**/rest/v1/rpc/lesson_check_list_activities*',async route=>{
    await route.fulfill({status:200,contentType:'application/json',
      headers:{'access-control-allow-origin':'*'},body:JSON.stringify(fixtures)});
  });
 });
 for(const width of [1536,390]){
  test('name search updates cards immediately at '+width+' px',async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/#/tool/lesson-check-studio');
    const cards=page.locator('#lcs5-activity-library article.lcs-arcade-card');
    await expect(cards).toHaveCount(3,{timeout:20000});
    const bar=page.locator('.lcs-search-always-visible');
    const textbox=bar.locator('input[type="search"]');
    await expect(textbox).toBeVisible();
    // Even clicking the label/icon part must focus the actual input.
    await bar.locator('.lcs-search-visible-label').click();
    await expect(textbox).toBeFocused();
    await textbox.fill('neural tower');
    await expect(textbox).toHaveValue('neural tower');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Artificial Intelligence: Neural Nexus Tower');
    await expect(page.locator('.lcs-arcade-results-head')).toContainText('1 kết quả');
    await page.waitForTimeout(800); // persists through async Workspace/UI refresh
    await expect(cards).toHaveCount(1);
    await textbox.fill('grammar breach');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Cyber Hacker: Grammar Breach');
    await textbox.fill('this activity does not exist');
    await expect(cards).toHaveCount(0);
    await expect(page.locator('.lcs-arcade-results-head')).toContainText('0 kết quả');
    await expect(page.getByRole('button',{name:'Xóa từ khóa tìm kiếm'}).last()).toBeVisible();
    await page.getByRole('button',{name:'Xóa từ khóa tìm kiếm'}).last().click();
    await expect(textbox).toHaveValue('');
    await expect(cards).toHaveCount(3);
    await textbox.fill('inventors');
    await expect(cards).toHaveCount(1);
    await textbox.press('Escape');
    await expect(textbox).toHaveValue('');
    await expect(cards).toHaveCount(3);
  });
 }
});
