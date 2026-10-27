import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/tests/fixtures/brian-instant-tools-qa.html');
 const launcher=page.getByRole('button',{name:'Mở bộ công cụ tức thì'});
 try{await expect(launcher).toBeVisible({timeout:12000});}catch{
  const state=await page.evaluate(()=>({url:location.href,root:document.querySelector('#root')?.innerText?.slice(0,300),scripts:[...document.scripts].map(s=>s.src)}));
  throw Error('Toolbox fixture failed to mount: '+JSON.stringify({state,errors}));
 }
 await launcher.click();
 await page.locator('.bit-app-card').first().click();
});
test('3D dice visibly tumble and settle with the correct total',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const cubes=page.getByTestId('animated-die');
 await expect(cubes).toHaveCount(2);
 const first=cubes.first().locator('.bit-cube');
 const before=await first.evaluate(el=>getComputedStyle(el).transform);
 await page.getByRole('button',{name:'Tung xúc xắc'}).click();
 await expect(cubes.first()).toHaveClass(/is-rolling/);
 const animations=await first.evaluate(el=>el.getAnimations().map(a=>({name:a.animationName||'',state:a.playState})));
 expect(animations.some(a=>a.name==='bit-die-tumble-real'&&a.state==='running')).toBe(true);
 await expect(page.locator('.bit-stat strong')).toHaveText('…');
 await page.waitForTimeout(410);
 const during=await first.evaluate(el=>getComputedStyle(el).transform);
 expect(during).not.toBe(before);
 await expect(page.getByRole('button',{name:'Tung xúc xắc'})).toBeDisabled();
 await expect(cubes.first()).not.toHaveClass(/is-rolling/,{timeout:3800});
 const values=await cubes.evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('aria-label'))));
 expect(values.every(n=>n>=1&&n<=6)).toBe(true);
 const sum=values.reduce((a,b)=>a+b,0);
 await expect(page.locator('.bit-stat strong')).toHaveText(String(sum));
 await expect(page.locator('.bit-roll-history span').first()).toHaveText(String(sum));
 const after=await first.evaluate(el=>getComputedStyle(el).transform);
 expect(after).not.toBe('none');
});
test('Reduced-motion does not suppress a fair dice result',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Tung xúc xắc'}).click();
 const animation=await page.getByTestId('animated-die').first().locator('.bit-cube')
  .evaluate(el=>getComputedStyle(el).animationName);
 expect(animation).toBe('none');
 await expect(page.locator('.bit-stat strong')).not.toHaveText('…',{timeout:4000});
});
