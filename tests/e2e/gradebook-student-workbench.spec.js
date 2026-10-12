import { test, expect } from '@playwright/test';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../src/styles/GradebookAcademicWorkspace.css',import.meta.url),'utf8');

for(const width of [390,620,980,1440]){
 test('Workbench controls remain accessible, aligned, and isolated at '+width,async({page})=>{
  await page.setViewportSize({width,height:780});
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
   <style>html,body{margin:0;font:13px system-ui;background:#f4f7ff}${css}</style></head><body>
   <div id="root"><main class="gradebook-studio"><div class="hr-tab-stack hr-gradebook">
    <section class="gb-roster-workbench">
      <div class="gb-roster-workbench-main">
        <label class="gb-roster-search"><span class="gb-roster-search-icon">⌕</span>
          <input type="search" aria-label="Tìm học sinh theo tên hoặc mã" placeholder="Tìm theo tên hoặc mã học sinh…"></label>
        <label class="gb-roster-missing"><input type="checkbox">Chỉ học sinh còn thiếu điểm</label>
        <span class="gb-roster-count">29/29 học sinh</span>
        <span class="gb-roster-progress"><span class="gb-roster-progress-track"><span style="width:65%"></span></span><small>19/29 đã có điểm</small></span>
      </div>
      <div class="gb-roster-workbench-side"><span class="gb-roster-keyboard-hint">Enter · Alt+Arrow</span>
        <button class="gb-roster-focus" aria-pressed="false">Chế độ tập trung</button></div>
    </section>
    <section class="hr-panel hr-grade-panel"><div class="hr-grade-table-wrap">
    <table class="hr-grade-table" style="min-width:6000px"><thead><tr>
      <th class="hr-grade-index">STT</th><th class="hr-grade-student">Học sinh</th>
      ${Array.from({length:42},(_,i)=>`<th>Lần ${i+1}</th>`).join('')}
    </tr></thead><tbody><tr><td class="hr-grade-index">1</td><td class="hr-grade-student"><b>Nguyễn Trần Lâm Anh</b></td>
      ${Array.from({length:42},()=>'<td><input class="hr-grade-input" value="8.5"></td>').join('')}
    </tr></tbody></table></div></section>
   </div></main></div></body></html>`);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
  await expect(page.getByRole('searchbox',{name:'Tìm học sinh theo tên hoặc mã'})).toBeVisible();
  await expect(page.getByRole('checkbox')).toBeVisible();
  await expect(page.getByRole('button',{name:'Chế độ tập trung'})).toBeVisible();
  const gap=await page.locator('.hr-grade-table-wrap').evaluate(e=>e.scrollWidth-e.clientWidth);
  expect(gap).toBeGreaterThan(500);
  expect((await page.locator('.hr-grade-input').first().boundingBox()).width).toBeGreaterThanOrEqual(64);
 });
}
