import { test, expect } from '@playwright/test';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../src/styles/GradebookAcademicWorkspace.css',import.meta.url),'utf8');

for(const width of [390,620,980,1440]){
 test('Material 3 workbench v2 + 42-col grid is contained at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:780});
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>html,body{margin:0;font:13px system-ui;background:#f4f7ff}${css}</style></head><body>
  <div id="root"><main class="gradebook-studio"><div class="hr-tab-stack hr-gradebook">
  <section class="gb-roster-workbench">
    <div class="gb-roster-workbench-main">
      <label class="gb-roster-search"><input type="search" placeholder="Tìm học sinh" aria-label="Tìm học sinh"></label>
      <label class="gb-roster-missing"><input type="checkbox">Chỉ học sinh còn thiếu điểm</label>
      <label class="gb-roster-sort"><span>Sắp xếp</span><select aria-label="Sắp xếp học sinh"><option>Thứ tự lớp</option><option>Họ tên A–Z</option></select></label>
      <span class="gb-roster-count">29/29 học sinh</span>
    </div>
    <div class="gb-roster-workbench-side">
      <button class="gb-roster-next-empty">Ô trống tiếp theo</button>
      <button class="gb-roster-density">Bảng gọn</button>
      <button class="gb-roster-focus">Chế độ tập trung</button>
    </div>
  </section>
  <details class="gb-roster-column-insights" open><summary><strong>Tiến độ từng cột điểm</strong><span>1/42 cột hoàn tất</span></summary>
  <div class="gb-roster-column-grid">${Array.from({length:42},(_,i)=>'<article><div><strong>Lần '+(i+1)+'</strong><span>19/29</span></div><div class="gb-roster-column-track"><span style="width:65%"></span></div><small>10 học sinh chưa nhập</small></article>').join('')}</div></details>
  <section class="hr-panel hr-grade-panel"><div class="hr-grade-table-wrap">
    <table class="hr-grade-table" style="min-width:6000px"><thead><tr>
    <th class="hr-grade-index">STT</th><th class="hr-grade-student">Học sinh</th>
    ${Array.from({length:42},(_,i)=>'<th>Lần '+(i+1)+'</th>').join('')}</tr></thead><tbody>
    <tr><td class="hr-grade-index">1</td><td class="hr-grade-student"><b>Nguyễn Trần Lâm Anh</b></td>
    ${Array.from({length:42},()=>'<td><input class="hr-grade-input" value="8.5"></td>').join('')}</tr>
    </tbody></table>
  </div></section></div></main></div></body></html>`);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
  await expect(page.getByRole('combobox',{name:'Sắp xếp học sinh'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Ô trống tiếp theo'})).toBeVisible();
  const wrap=page.locator('.hr-grade-table-wrap');
  expect(await wrap.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeGreaterThan(500);
  expect((await page.locator('.hr-grade-input').first().boundingBox()).width).toBeGreaterThanOrEqual(64);
  const stats=page.locator('.gb-roster-column-grid');
  expect(await stats.evaluate(el=>getComputedStyle(el).overflowY)).toBe('auto');
 });
}
