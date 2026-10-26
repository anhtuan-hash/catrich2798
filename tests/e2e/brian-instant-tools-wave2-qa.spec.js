import {test,expect} from '@playwright/test';
const url='/tests/fixtures/brian-instant-tools-qa.html';
test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort('blockedbyclient'));
 await page.goto(url);
 await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
 await expect(page.locator('.bit-app-card')).toHaveCount(15);
});
async function select(page,id){
 const position={spotlight:5,bigText:6,teleprompter:7,reveal:8,soundFX:9}[id];
 await page.locator('.bit-app-card').nth(position).click();
}
test('Wave 2 five utilities appear and remain bilingual',async({page})=>{
 const cards=page.locator('.bit-app-card');
 await expect(cards.nth(5)).toContainText('Đèn Spotlight');
 await expect(cards.nth(6)).toContainText('Chữ khổng lồ');
 await expect(cards.nth(7)).toContainText('Máy nhắc chữ');
 await expect(cards.nth(8)).toContainText('Thẻ lật bí mật');
 await expect(cards.nth(9)).toContainText('Bàn âm thanh');
 await page.getByRole('button',{name:'Thu nhỏ về bong bóng'}).click();
 await page.getByTestId('lang').click();
 await page.getByRole('button',{name:'Open instant classroom tools'}).click();
 await expect(page.locator('.bit-app-card').nth(7)).toContainText('Teleprompter');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(3);
});
test('Spotlight projects over the page, moves with pointer and exits with Escape',async({page})=>{
 await select(page,'spotlight');
 await page.locator('#bit-spot-size').fill('200');
 await page.getByRole('button',{name:'Bật Spotlight trên trang hiện tại'}).click();
 await expect(page.locator('.bit-spot-overlay')).toBeVisible();
 await expect(page.locator('.bit-portal')).toHaveCount(0);
 await page.mouse.move(130,230);
 await expect(page.locator('.bit-spot-overlay')).toHaveAttribute('style',/200px at 130px 230px/);
 await page.keyboard.press('Escape');
 await expect(page.locator('.bit-spot-overlay')).toHaveCount(0);
 await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
 await expect(page.locator('#bit-spot-size')).toHaveValue('200');
});
test('Big Text presents in a high-visibility screen and retains previous phrase',async({page})=>{
 await select(page,'bigText');
 await page.locator('#bit-w2-bigtext').fill('WELCOME TO GLOBAL WARMING');
 await expect(page.locator('.bit-w2-bigtext').first()).toContainText('WELCOME TO GLOBAL WARMING');
 await page.getByRole('button',{name:'Trình chiếu'}).click();
 await expect(page.locator('.bit-w2-stage-overlay')).toBeVisible();
 await expect(page.locator('.bit-w2-stage-overlay')).toContainText('WELCOME TO GLOBAL WARMING');
 await page.keyboard.press('Escape');
 await expect(page.locator('.bit-w2-stage-overlay')).toHaveCount(0);
 await page.reload();
 await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
 await select(page,'bigText');
 await expect(page.locator('#bit-w2-bigtext')).toHaveValue('WELCOME TO GLOBAL WARMING');
});
test('Teleprompter can start, pause, reset and keep script after reload',async({page})=>{
 await select(page,'teleprompter');
 await page.locator('#bit-w2-script').fill('Lesson plan paragraph one\nLesson plan paragraph two');
 await page.locator('#bit-w2-speed').fill('90');
 await page.getByRole('button',{name:'Bắt đầu'}).click();
 await expect(page.getByRole('button',{name:'Tạm dừng'})).toBeVisible();
 await page.waitForTimeout(500);
 await page.getByRole('button',{name:'Tạm dừng'}).click();
 await expect(page.getByRole('button',{name:'Bắt đầu'})).toBeVisible();
 await page.getByRole('button',{name:'Về đầu'}).click();
 await page.reload();
 await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
 await select(page,'teleprompter');
 await expect(page.locator('#bit-w2-script')).toContainText('Lesson plan paragraph one');
 await expect(page.locator('#bit-w2-speed')).toHaveValue('90');
});
test('Reveal Cards flip, apply new cards, and restore per-user progress',async({page})=>{
 await select(page,'reveal');
 await expect(page.locator('.bit-w2-reveal-card')).toHaveCount(6);
 await page.locator('.bit-w2-reveal-card').first().click();
 await expect(page.locator('.bit-w2-reveal-card').first()).toHaveAttribute('aria-pressed','true');
 await page.locator('#bit-w2-reveal-input').fill('Question 1\nQuestion 2\nQuestion 3');
 await page.getByRole('button',{name:'Áp dụng thẻ'}).click();
 await expect(page.locator('.bit-w2-reveal-card')).toHaveCount(3);
 await page.locator('.bit-w2-reveal-card').nth(1).click();
 await expect(page.locator('.bit-w2-reveal-card').nth(1)).toContainText('Question 2');
 await page.reload();
 await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
 await select(page,'reveal');
 await expect(page.locator('.bit-w2-reveal-card')).toHaveCount(3);
 await expect(page.locator('.bit-w2-reveal-card').nth(1)).toHaveAttribute('aria-pressed','true');
});
test('Sound FX has twelve local cues and respects master mute',async({page})=>{
 await select(page,'soundFX');
 await expect(page.locator('.bit-w2-sound-card')).toHaveCount(12);
 await page.locator('#bit-w2-volume').fill('35');
 await page.locator('.bit-w2-sound-card').first().click();
 await page.getByRole('button',{name:'Bật/tắt âm thanh'}).click();
 await expect(page.getByRole('status')).toContainText('Âm thanh toàn cục đang tắt');
 await page.locator('.bit-w2-sound-card').nth(11).click();
 await expect(page.locator('.bit-w2-sound-card')).toHaveCount(12);
 await page.reload();
 await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
 await select(page,'soundFX');
 await expect(page.locator('#bit-w2-volume')).toHaveValue('35');
});
