import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source=path=>readFileSync(new URL('../..'+path,import.meta.url),'utf8');
const bundle=await build({
  entryPoints:[fileURLToPath(new URL('../fixtures/eventPopupMotionHarness.jsx',import.meta.url))],
  bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',
  loader:{'.css':'empty'},
  define:{'process.env.NODE_ENV':'"production"'},
});
const script=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text;
const css=[
  source('/src/features/events/dashboard/EventPopup.css'),
  source('/src/features/events/dashboard/EventPopupMotion.css'),
  source('/src/components/admin/EventPopupMotionAdmin.css'),
].join('\n');

async function renderRealPreview(page){
 await page.setContent('<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body style="margin:0;background:#f7f9fd"><div id="react-root"></div></body></html>');
 await page.addStyleTag({content:css});
 await page.addScriptTag({content:script});
 await expect(page.getByRole('heading',{name:'Hiệu ứng popup sự kiện'})).toBeVisible();
}

for(const viewport of [{width:1280,height:850},{width:390,height:844}]) {
 test(`real React Admin preview replays both phases on ${viewport.width}px`,async ({page})=>{
   await page.setViewportSize(viewport);
   await renderRealPreview(page);
   await page.getByRole('button',{name:/Phát mở → đóng/}).click();
   const stage=page.locator('.be-pop-preview-stage');
   await expect(stage).toHaveAttribute('data-preview-phase','opening');
   const active=await page.locator('.be-pop-preview-card').evaluate(node=>
     node.getAnimations().some(animation=>animation.playState==='running'));
   expect(active).toBe(true);
   await expect(stage).toHaveAttribute('data-preview-phase','holding',{timeout:4000});
   await expect(stage).toHaveAttribute('data-preview-phase','closing',{timeout:4000});
   await expect(stage).toHaveAttribute('data-preview-phase','ready',{timeout:4000});
   await page.getByRole('button',{name:/Chỉ đóng/}).click();
   await expect(stage).toHaveAttribute('data-preview-phase','closing');
   await expect(stage).toHaveAttribute('data-preview-phase','ready',{timeout:4000});
 });
 test(`real popup live preview opens and closes with native Web Animations on ${viewport.width}px`,async ({page})=>{
   await page.setViewportSize(viewport);
   await renderRealPreview(page);
   await page.getByRole('button',{name:/Xem thử popup thật toàn màn hình/}).click();
   const modal=page.getByRole('dialog',{name:'Xem thử hiệu ứng popup sự kiện'});
   await expect(modal).toBeVisible();
   const liveAnimation=await modal.evaluate(node=>
     node.getAnimations().some(a=>a.playState==='running'));
   expect(liveAnimation).toBe(true);
   await modal.getByRole('button',{name:'Đóng với hiệu ứng đã chọn'}).click();
   await expect(modal).toHaveCount(0,{timeout:3000});
   await expect(page.getByRole('heading',{name:'Hiệu ứng popup sự kiện'})).toBeVisible();
 });
}
test('native controller honors Reduce Motion in the real React preview',async ({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await renderRealPreview(page);
 await page.getByRole('button',{name:/Chỉ mở/}).click();
 expect(await page.locator('.be-pop-preview-card').evaluate(n=>n.getAnimations().length)).toBe(0);
 await page.getByRole('button',{name:/Xem thử popup thật toàn màn hình/}).click();
 const modal=page.getByRole('dialog',{name:'Xem thử hiệu ứng popup sự kiện'});
 await expect(modal).toBeVisible();
 expect(await modal.evaluate(n=>n.getAnimations().length)).toBe(0);
 await modal.getByRole('button',{name:'Đóng với hiệu ứng đã chọn'}).click();
 await expect(modal).toHaveCount(0);
});
