import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('https://**/*',r=>r.abort('blockedbyclient'));
 await page.goto('/tests/fixtures/brian-instant-tools-qa.html');
 await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
 await page.locator('.bit-app-card').nth(1).click();
});
test('Lucky Wheel visibly rotates while spinning, then displays foreground fireworks',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const wheel=page.getByTestId('animated-lucky-wheel');
 await page.locator('#bit-wheel-list').fill('Alpha\nBeta\nGamma\nDelta');
 await page.getByRole('button',{name:'Áp dụng tên'}).click();
 const before=await wheel.evaluate(el=>getComputedStyle(el).transform);
 await page.getByRole('button',{name:'QUAY NGAY'}).click();
 await expect(wheel).toHaveClass(/is-spinning/);
 const running=await wheel.evaluate(el=>el.getAnimations().some(a=>a.playState==='running'));
 expect(running).toBe(true);
 await page.waitForTimeout(330);
 const during=await wheel.evaluate(el=>getComputedStyle(el).transform);
 expect(during).not.toBe(before);
 await expect(page.getByRole('button',{name:'Đang quay…'})).toBeDisabled();
 await expect(page.locator('.bit-winner')).toBeVisible({timeout:8500});
 const fireworks=page.locator('.bit-wheel-fireworks');
 await expect(fireworks).toBeVisible();
 await expect(fireworks.locator('span')).toHaveCount(28);
 const canvas=page.locator('canvas').filter({hasNot:page.locator('*')}).first();
 const canvases=await page.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>({
  z:Number(getComputedStyle(c).zIndex),pointer:getComputedStyle(c).pointerEvents
 })));
 expect(canvases.some(c=>c.z>2147481000&&c.pointer==='none')).toBe(true);
 await expect(wheel).not.toHaveClass(/is-spinning/);
 await expect(page.getByRole('button',{name:'QUAY NGAY'})).toBeEnabled();
 await page.getByRole('button',{name:'QUAY NGAY'}).click();
 await expect(wheel).toHaveClass(/is-spinning/);
});
test('Reduced-motion preference still produces a real winner without forced spinning',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'QUAY NGAY'}).click();
 await expect(page.locator('.bit-winner')).toBeVisible({timeout:8500});
 const duration=await page.getByTestId('animated-lucky-wheel').evaluate(el=>getComputedStyle(el).animationDuration);
 expect(duration==='0s'||duration==='').toBe(true);
});
