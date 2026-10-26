import {test,expect} from '@playwright/test';
const url='/tests/fixtures/brian-instant-tools-qa.html';
test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort('blockedbyclient'));
  await page.goto(url);
  await expect(page.getByRole('button',{name:'Mở bộ công cụ tức thì'})).toBeVisible();
});
async function openLibrary(page){
  await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
  await expect(page.getByRole('dialog',{name:'Brian Instant Tools'})).toBeVisible();
}
test('Portal navigation, bilingual, minimize, keyboard and narrow-screen clipping',async({page})=>{
  await openLibrary(page);
  const tiles=page.locator('.bit-app-card');
  await expect(tiles).toHaveCount(10);
  await expect(page.locator('.bit-header')).toContainText('Brian Instant Tools');
  await page.getByRole('button',{name:'Thu nhỏ về bong bóng'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('lang').click();
  await page.getByRole('button',{name:'Open instant classroom tools'}).click();
  await expect(page.locator('.bit-library')).toContainText('Lucky Wheel');
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(horizontal).toBeLessThanOrEqual(3);
  await page.keyboard.press('Escape');
  await expect(page.locator('.bit-overlay')).toHaveCount(0);
});
test('Dice rolls and Scoreboard undo retain local session without modifying scores elsewhere',async({page})=>{
  await openLibrary(page);
  await page.locator('.bit-app-card').nth(0).click();
  await expect(page.locator('.bit-die')).toHaveCount(2);
  await page.getByRole('button',{name:'Tung xúc xắc'}).click();
  await expect(page.locator('.bit-roll-history span')).toHaveCount(1);
  await page.getByRole('button',{name:'Trở về bộ công cụ'}).click();
  await page.locator('.bit-app-card').nth(2).click();
  await page.locator('.bit-team').first().getByRole('button',{name:'+5'}).click();
  await expect(page.locator('.bit-team-score').first()).toHaveText('5');
  // Allow pointer animation/confetti to settle on iPhone WebKit before the next touch.
  await page.waitForTimeout(1200);
  const undo=page.getByRole('button',{name:'Hoàn tác'});
  await undo.scrollIntoViewIfNeeded();
  await undo.click({timeout:16000});
  await expect(page.locator('.bit-team-score').first()).toHaveText('0');
  await page.locator('.bit-team').first().getByRole('button',{name:'+1'}).click();
  await page.reload();
  await openLibrary(page);
  await page.locator('.bit-app-card').nth(2).click();
  await expect(page.locator('.bit-team-score').first()).toHaveText('1');
});
test('Timer pause and QR are usable fully offline',async({page})=>{
  await openLibrary(page);
  await page.locator('.bit-app-card').nth(3).click();
  await expect(page.locator('.bit-timer-card')).toHaveCount(4);
  await page.locator('.bit-timer-card').first().getByRole('button',{name:'Bắt đầu'}).click();
  await expect(page.locator('.bit-timer-card').first()).toHaveClass(/is-running/);
  await page.locator('.bit-timer-card').first().getByRole('button',{name:'Tạm dừng'}).click();
  await expect(page.locator('.bit-timer-card').first()).toHaveClass(/is-paused/);
  await page.getByRole('button',{name:'Trở về bộ công cụ'}).click();
  await page.locator('.bit-app-card').nth(4).click();
  await expect(page.locator('.bit-qr-expand img')).toBeVisible();
  await expect(page.locator('.bit-qr-expand img')).toHaveAttribute('src',/^data:image\/png;base64,/);
  await page.getByRole('button',{name:'Tải PNG'}).click();
  await page.locator('#bit-qr-input').fill('javascript:alert(1)');
  await expect(page.getByRole('alert')).toContainText('không hợp lệ');
  await expect(page.locator('.bit-qr-expand')).toHaveCount(0);
});
test('Wheel animation, deterministic result and per-user local storage isolation',async({page})=>{
  await openLibrary(page);
  await page.locator('.bit-app-card').nth(1).click();
  await page.locator('#bit-wheel-list').fill('Alpha\nBeta\nGamma');
  await page.getByRole('button',{name:'Áp dụng tên'}).click();
  await page.getByRole('button',{name:'QUAY NGAY'}).click();
  await expect(page.locator('.bit-winner')).toBeVisible({timeout:8500});
  await expect(page.locator('.bit-wheel-label')).toHaveCount(3);
  await page.getByRole('button',{name:'Thu nhỏ về bong bóng'}).click();
  await page.getByTestId('user').click();
  await openLibrary(page);
  await page.locator('.bit-app-card').nth(1).click();
  await expect(page.locator('.bit-wheel-label')).toHaveCount(4);
});
