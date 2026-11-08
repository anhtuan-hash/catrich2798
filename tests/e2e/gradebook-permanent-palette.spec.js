import { test, expect } from '@playwright/test';
import {readFileSync} from 'node:fs';
// CSS-only fixture for the currently active Mac score tabs, not the removed
// .hr-grade-navigation-dock. Functional onClick is separately source-tested.
const css=readFileSync(new URL('../../src/components/gradebook/GradebookMacEngine.css',import.meta.url),'utf8');
const tabs=['TX · Đợt 1','TX · Đợt 2','TX · Đợt 3','TX · Đợt 4','Giữa kỳ','Cuối kỳ','Tổng hợp'];
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;font:14px Arial;background:#f5f8fc}#root{padding:8px;box-sizing:border-box;max-width:100%}
${css}</style></head><body><div id="root"><div class="gbmac">
<nav class="gbmac-tabs" role="group" aria-label="Thành phần điểm">
${tabs.map((s,i)=>'<button type="button" data-tone="blue" class="'+(i===0?'is-selected':'')+'" aria-pressed="'+(i===0?'true':'false')+'">'+s+'</button>').join('')}
</nav><section class="gbmac-workspace"><header class="gbmac-workspace-heading">
<h2>TX · Đợt 1</h2><div class="gbmac-save-state" role="status"><span class="is-saved"></span>Đã lưu</div></header>
<div class="gbmac-toolbar"><div class="gbmac-primary-actions"><button type="button" class="gbmac-save">Lưu điểm</button></div></div>
</section></div></div></body></html>`;
for(const width of [390,620,980,1440]){
 test('Current grading tabs and Save remain accessible at '+width+'px',async({page})=>{
   await page.setViewportSize({width,height:900});
   await page.setContent(html);
   const nav=page.locator('.gbmac-tabs');
   await expect(nav.getByRole('button')).toHaveCount(7);
   await expect(nav.getByRole('button',{name:tabs[0]})).toHaveAttribute('aria-pressed','true');
   await expect(page.getByRole('button',{name:'Lưu điểm'})).toBeVisible();
   await expect(page.getByRole('status')).toContainText('Đã lưu');
   const measured=await nav.evaluate(el=>({
     scroll:el.scrollWidth, client:el.clientWidth, mode:getComputedStyle(el).display,
   }));
   if(width<=760){expect(measured.mode).toBe('flex');expect(measured.scroll).toBeGreaterThan(measured.client)}
   else expect(measured.mode).toBe('grid');
   const outer=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(outer).toBeLessThanOrEqual(4);
   if(width<=760){
     await nav.evaluate(el=>{el.scrollLeft=el.scrollWidth});
     expect(await nav.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
   }
 });
}
