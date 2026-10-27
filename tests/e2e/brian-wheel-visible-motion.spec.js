import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/tests/fixtures/brian-instant-tools-qa.html');
 const launcher=page.getByRole('button',{name:'Mở bộ công cụ tức thì'});
 try{await expect(launcher).toBeVisible({timeout:12000});}catch{
  const state=await page.evaluate(()=>({url:location.href,root:document.querySelector('#root')?.innerText?.slice(0,300)}));
  throw Error('Toolbox fixture failed to mount: '+JSON.stringify({state,errors}));
 }
 await launcher.click();
 await page.locator('.bit-app-card').nth(1).click();
});
test('Lucky Wheel visibly moves across consecutive frames; result aligns with pointer',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const wheel=page.getByTestId('animated-lucky-wheel');
 await page.locator('#bit-wheel-list').fill('Alpha\nBeta\nGamma\nDelta');
 await page.getByRole('button',{name:'Áp dụng tên'}).click();
 const before=await wheel.evaluate(el=>getComputedStyle(el).transform);
 await page.getByRole('button',{name:'QUAY NGAY'}).click();
 await expect(wheel).toHaveClass(/is-spinning/);
 // Check ACTUAL painted computed transform across time; a spinning badge or
 // an animation class alone is not evidence the browser rendered rotation.
 await page.waitForTimeout(140);
 const at140=await wheel.evaluate(el=>getComputedStyle(el).transform);
 await page.waitForTimeout(350);
 const at490=await wheel.evaluate(el=>getComputedStyle(el).transform);
 expect(at140).not.toBe(before);
 expect(at490).not.toBe(at140);
 expect(at490).not.toBe(before);
 await expect(page.getByRole('button',{name:'Đang quay…'})).toBeDisabled();
 await expect(page.locator('.bit-winner')).toBeVisible({timeout:9500});
 const winner=(await page.locator('.bit-winner strong').textContent())?.trim();
 expect(['Alpha','Beta','Gamma','Delta']).toContain(winner);
 const matched=await wheel.evaluate((el,winner)=>{
  const matrix=new DOMMatrix(getComputedStyle(el).transform);
  const angle=((Math.atan2(matrix.b,matrix.a)*180/Math.PI)%360+360)%360;
  const idx=['Alpha','Beta','Gamma','Delta'].indexOf(winner);
  const expected=((360-(idx+.5)*90)%360+360)%360;
  const error=Math.min(Math.abs(angle-expected),360-Math.abs(angle-expected));
  return {angle,expected,error};
 },winner);
 expect(matched.error).toBeLessThan(.5);
 const fireworks=page.locator('.bit-wheel-fireworks');
 await expect(fireworks).toBeVisible();
 await expect(fireworks.locator('span')).toHaveCount(28);
 const canvases=await page.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>({
  z:Number(getComputedStyle(c).zIndex),pointer:getComputedStyle(c).pointerEvents
 })));
 expect(canvases.some(c=>c.z>2147481000&&c.pointer==='none')).toBe(true);
 await expect(wheel).not.toHaveClass(/is-spinning/);
 await page.getByRole('button',{name:'QUAY NGAY'}).click();
 await expect(wheel).toHaveClass(/is-spinning/);
 await page.waitForTimeout(170);
 const second=await wheel.evaluate(el=>getComputedStyle(el).transform);
 expect(second).not.toBe(at490);
});
test('Reduced-motion respects preference while still choosing a valid winner',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'QUAY NGAY'}).click();
 await expect(page.locator('.bit-winner')).toBeVisible({timeout:6500});
 await expect(page.getByRole('button',{name:'QUAY NGAY'})).toBeEnabled();
 await expect(page.getByTestId('animated-lucky-wheel')).not.toHaveClass(/is-spinning/);
});
