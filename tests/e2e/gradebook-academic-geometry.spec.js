import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
// Offline CSS geometry regression for the ACTUAL GradebookMacEngine styles.
// This is not authenticated application UAT or visual-baseline approval.
const css=readFileSync(new URL('../../src/components/gradebook/GradebookMacEngine.css',import.meta.url),'utf8');
const fixture=(n=42)=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;background:#f5f8fc;font:14px Arial}#root{width:100%;max-width:100%;padding:8px;box-sizing:border-box}
${css}</style></head><body><div id="root"><main class="gbmac">
<div class="gbmac-workspace"><div class="gbmac-table-viewport">
<table class="gbmac-table" style="min-width:5900px"><thead><tr><th class="gbmac-pin-index">STT</th><th class="gbmac-pin-name">Học sinh</th>
${Array.from({length:n},(_,i)=>'<th class="gbmac-attempt">Lần '+(i+1)+'</th>').join('')}</tr></thead>
<tbody>${Array.from({length:4},(_,i)=>'<tr><td class="gbmac-pin-index">'+(i+1)+'</td><td class="gbmac-pin-name"><b>Nguyễn Trần Lâm Anh</b><small>CP-000123</small></td>'+Array.from({length:n},()=>'<td data-gbmac-score><input class="hr-grade-input" aria-label="Điểm"></td>').join('')+'</tr>').join('')}</tbody></table></div></div></main></div></body></html>`;

for(const width of [390,620,980,1440]){
 test('Live Mac score table with 42 columns remains scrollable at '+width+'px',async({page})=>{
   await page.setViewportSize({width,height:900});
   await page.setContent(fixture());
   const measured=await page.evaluate(()=>{
     const wrap=document.querySelector('.gbmac-table-viewport');
     const table=document.querySelector('.gbmac-table');
     const input=wrap.querySelector('input');
     return {
       wrap:wrap.clientWidth, inner:wrap.scrollWidth, table:table.getBoundingClientRect().width,
       input:input.getBoundingClientRect().width,
       row:wrap.querySelector('tbody tr').getBoundingClientRect().height,
       index:getComputedStyle(wrap.querySelector('.gbmac-pin-index')).position,
       name:getComputedStyle(wrap.querySelector('.gbmac-pin-name')).position,
       overflow:getComputedStyle(wrap).overflowX,
       outer:document.documentElement.scrollWidth-document.documentElement.clientWidth,
     };
   });
   expect(measured.inner).toBeGreaterThan(measured.wrap+500);
   expect(measured.table).toBeGreaterThan(5500);
   expect(measured.input).toBeGreaterThanOrEqual(64);
   expect(measured.row).toBeLessThan(90);
   expect(measured.index).toBe('sticky');
   expect(measured.name).toBe('sticky');
   expect(measured.overflow).toBe('auto');
   expect(measured.outer).toBeLessThanOrEqual(4);
   const scroller=page.locator('.gbmac-table-viewport');
   await scroller.evaluate(el=>{el.scrollLeft=600});
   expect(await scroller.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
 });
}
