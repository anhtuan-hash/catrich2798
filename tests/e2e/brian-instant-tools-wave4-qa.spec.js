import {test,expect} from '@playwright/test';
const fixture='/tests/fixtures/brian-instant-tools-qa.html';
test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort('blockedbyclient'));
 await page.goto(fixture);
 await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
 await expect(page.locator('.bit-app-card')).toHaveCount(20);
});
const select=(page,index)=>page.locator('.bit-app-card').nth(index).click();
test('all five Wave 4 tools exist with localized cards and without horizontal overflow',async({page})=>{
 for(const [index,name] of [[15,'Chia nhóm ngẫu nhiên'],[16,'Đo độ ồn lớp học'],[17,'Chuông giành quyền'],[18,'Kiểm tra phản xạ'],[19,'Chuông tiết học']])
  await expect(page.locator('.bit-app-card').nth(index)).toContainText(name);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(3);
 await page.getByRole('button',{name:'Thu nhỏ về bong bóng'}).click();
 await page.getByTestId('lang').click();
 await page.getByRole('button',{name:'Open instant classroom tools'}).click();
 await expect(page.locator('.bit-app-card').nth(15)).toContainText('Group Maker');
 await expect(page.locator('.bit-app-card').nth(19)).toContainText('Class Bell');
});
test('Group Maker balances students, persists and reshuffles without duplicates',async({page})=>{
 await select(page,15);
 await page.locator('#bit-w4-roster').fill('Anna\nBen\nChau\nDung\nEmily\nFranco\nGia');
 await page.locator('#bit-w4-group-count').selectOption('3');
 await page.getByRole('button',{name:'Chia nhóm'}).click();
 await expect(page.locator('.bit-w4-group')).toHaveCount(3);
 const groups=await page.locator('.bit-w4-group li').allTextContents();
 expect(groups.length).toBe(7);expect(new Set(groups).size).toBe(7);
 await expect(page.locator('.bit-w4-group').first().locator('li')).toHaveCount(3);
 await page.reload();await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();await select(page,15);
 await expect(page.locator('.bit-w4-group li')).toHaveCount(7);
 await page.getByRole('button',{name:'Xáo lại'}).click();
 await expect(page.locator('.bit-w4-group li')).toHaveCount(7);
});
test('Buzzer locks first team and resets via button and number keyboard',async({page})=>{
 await select(page,17);
 await expect(page.locator('.bit-w4-buzz-team')).toHaveCount(4);
 await page.locator('.bit-w4-buzz-team').nth(1).click();
 await expect(page.locator('.bit-w4-buzz-winner')).toContainText('Team 2');
 await expect(page.locator('.bit-w4-buzz-team').nth(0)).toBeDisabled();
 await page.getByRole('button',{name:'Lượt mới'}).click();
 await page.keyboard.press('3');
 await expect(page.locator('.bit-w4-buzz-winner')).toContainText('Team 3');
 await page.reload();await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();await select(page,17);
 await expect(page.locator('.bit-w4-buzz-winner')).toContainText('Team 3');
});
test('Reaction Timer penalizes early taps and records real completed result',async({page})=>{
 await select(page,18);
 const pad=page.locator('.bit-w4-reaction-pad');
 await pad.click();await pad.click();
 await expect(pad).toHaveClass(/stage-early/);
 await pad.click();
 await expect(pad).toHaveClass(/stage-ready/,{timeout:7000});
 await pad.click();
 await expect(pad).toHaveClass(/stage-result/);
 await expect(page.locator('.bit-w4-reaction-stats strong').first()).toContainText('ms');
 await page.reload();await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();await select(page,18);
 await expect(page.locator('.bit-w4-reaction-stats strong').first()).toContainText('ms');
});
test('Class Bell supports phase edits, start, pause, next and persisted controls',async({page})=>{
 await select(page,19);
 await expect(page.locator('.bit-w4-bell-row')).toHaveCount(2);
 await page.locator('.bit-w4-bell-row').first().locator('input').first().fill('Warm-up');
 await page.getByRole('button',{name:'Bắt đầu'}).click();
 await expect(page.getByRole('button',{name:'Tạm dừng'})).toBeVisible();
 await page.getByRole('button',{name:'Tạm dừng'}).click();
 await page.getByRole('button',{name:'Chặng tiếp'}).click();
 await expect(page.locator('.bit-w4-bell-display')).toContainText('2/2');
 await page.reload();await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();await select(page,19);
 await expect(page.locator('.bit-w4-bell-row').first().locator('input').first()).toHaveValue('Warm-up');
 await expect(page.locator('.bit-w4-bell-display')).toContainText('2/2');
});
test('Noise Meter handles denied permission and always discloses uncalibrated dBFS',async({page})=>{
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw Error('denied');}}});
 });
 await select(page,16);
 await expect(page.locator('.bit-w4-warning')).toContainText('dBFS');
 await page.getByRole('button',{name:'Bật micro'}).click();
 await expect(page.getByRole('alert')).toContainText('Không thể truy cập micro');
 await expect(page.getByRole('button',{name:'Bật micro'})).toBeEnabled();
});
