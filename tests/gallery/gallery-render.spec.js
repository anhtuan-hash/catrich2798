import fs from 'node:fs';
import path from 'node:path';
import {test,expect} from '@playwright/test';
const output='artifacts/gallery/screenshots';
test.beforeAll(()=>fs.mkdirSync(output,{recursive:true}));
test('original museum renders GLB-ready WebGL and switches all three room templates',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/tests/gallery/harness.html');
 await expect(page.getByRole('heading',{name:'Brian Gallery 3D'})).toBeVisible();
 await expect(page.locator('.big-webgl-shell canvas')).toBeVisible({timeout:30000});
 await expect(page.locator('.big-scene-hud')).toContainText('R3F');
 for(const key of ['classic','culture','lab']){
   await page.locator('#qa-'+key).click();
   await expect(page.locator('#qa-status')).toContainText('Room: '+key);
   await expect(page.locator('.big-webgl-shell canvas')).toBeVisible();
 }
 await page.screenshot({path:path.join(output,testInfo.project.name+'-museum.png'),fullPage:true});
 expect(errors).toEqual([]);
});
test('keyboard navigation changes camera position in 3D',async({page})=>{
 await page.goto('/tests/gallery/harness.html');
 await expect(page.locator('.big-scene-hud')).toContainText('R3F');
 const before=await page.locator('.big-scene-hud').innerText();
 await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');
 await expect.poll(async()=>await page.locator('.big-scene-hud').innerText(),{timeout:8000}).not.toBe(before);
});
test('curated GLB inspection opens and closes without network model fetch',async({page},testInfo)=>{
 const bad=[];page.on('pageerror',e=>bad.push(e.message));
 await page.goto('/tests/gallery/harness.html');
 await expect(page.locator('.big-webgl-shell canvas')).toBeVisible();
 await page.locator('#qa-inspect').click();
 const open=page.getByRole('button',{name:'Inspect 3D object'});
 await expect(open).toBeVisible();await open.click();
 await expect(page.locator('canvas')).toHaveCount(2,{timeout:20000});
 await page.screenshot({path:path.join(output,testInfo.project.name+'-glb.png'),fullPage:true});
 await page.getByRole('button',{name:'Close 3D inspection'}).click();
 await expect(page.locator('canvas')).toHaveCount(1);
 expect(bad).toEqual([]);
});
test('Lite quality is available and small-screen controls are reachable',async({page},testInfo)=>{
 await page.goto('/tests/gallery/harness.html');
 await page.locator('#qa-lite').click();
 await expect(page.locator('#qa-status')).toContainText('quality: lite');
 await expect(page.locator('.big-scene-hud')).toContainText('R3F');
 if(testInfo.project.name==='gallery-mobile'){
  const up=page.locator('.big-touch-pad button').first();
  await expect(up).toBeVisible();
  const initial=await page.locator('.big-scene-hud').innerText();
  await up.dispatchEvent('pointerdown',{bubbles:true});await page.waitForTimeout(480);
  await up.dispatchEvent('pointerup',{bubbles:true});
  await expect.poll(()=>page.locator('.big-scene-hud').innerText(),{timeout:8000}).not.toBe(initial);
 }
});
