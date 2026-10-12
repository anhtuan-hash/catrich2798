import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const css=readFileSync(new URL('../../src/styles/GradebookAcademicWorkspace.css',import.meta.url),'utf8');

const fixture=(n=42)=>`
<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  html,body{margin:0;background:#f5f8fc;font:12px Arial}
  ${css}
</style></head><body><div id="root"><main class="gradebook-studio">
  <div class="hr-tab-stack hr-gradebook">
    <section class="hr-panel hr-grade-panel"><div class="hr-grade-table-wrap">
    <table class="hr-grade-table" style="min-width:5900px">
      <thead><tr><th class="hr-grade-index">STT</th><th class="hr-grade-student">Học sinh</th>${Array.from({length:n},(_,i)=>`<th class="hr-grade-attempt-head">Lần ${i+1}</th>`).join('')}<th class="hr-grade-plus-head">Dấu +</th></tr></thead>
      <tbody>${Array.from({length:4},(_,i)=>`<tr><td class="hr-grade-index">${i+1}</td><td class="hr-grade-student"><b>Nguyễn Trần Lâm Anh</b><small>CP-000123</small></td>${Array.from({length:n},()=>'<td><input class="hr-grade-input" placeholder="—"></td>').join('')}<td class="hr-grade-plus-cell">0</td></tr>`).join('')}</tbody>
    </table>
    </div></section>
  </div></main></div></body></html>`;

for(const width of [390,620,980,1440]) {
  test(`Academic table with 42 columns scrolls horizontally without crushing inputs at ${width}px`, async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.setContent(fixture());
    const result=await page.evaluate(()=>{
      const wrap=document.querySelector('.hr-grade-table-wrap');
      const table=document.querySelector('.hr-grade-table');
      const input=document.querySelector('.hr-grade-input');
      const index=document.querySelector('.hr-grade-index');
      const name=document.querySelector('.hr-grade-student');
      return {
        wrap:wrap.clientWidth,inner:wrap.scrollWidth,
        table:table.getBoundingClientRect().width,
        input:input.getBoundingClientRect().width,
        row:document.querySelector('tbody tr').getBoundingClientRect().height,
        stickyIndex:getComputedStyle(index).position,
        stickyName:getComputedStyle(name).position,
        scrollable:getComputedStyle(wrap).overflowX,
        outerScroll:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      };
    });
    expect(result.inner).toBeGreaterThan(result.wrap+500);
    expect(result.table).toBeGreaterThan(5500);
    expect(result.input).toBeGreaterThanOrEqual(64);
    expect(result.row).toBeLessThan(90);
    expect(result.stickyIndex).toBe('sticky');
    expect(result.stickyName).toBe('sticky');
    expect(result.scrollable).toBe('auto');
    expect(result.outerScroll).toBeLessThanOrEqual(4);
    const wrapper=page.locator('.hr-grade-table-wrap');
    await wrapper.evaluate(el=>{el.scrollLeft=600});
    expect(await wrapper.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
  });
}
