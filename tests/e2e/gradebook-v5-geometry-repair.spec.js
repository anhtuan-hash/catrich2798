import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const sourceCSS = [
  '../../src/components/gradebook/HomeroomLearningGradebook.css',
  '../../src/styles/GradebookAcademicWorkspace.css',
  '../../src/styles/GradebookSpectrumV4.css',
  '../../src/styles/GradebookRosterLayoutHotfix.css',
  '../../src/styles/GradebookFocusV5.css',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

const sample = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;font:13px Arial,sans-serif;background:#f2f6fd}*,*::before,*::after{box-sizing:border-box}</style></head>
<body><div id="root"><main class="page hr-page gradebook-studio gb4-spectrum gb5-focus gb4-palette-electric" style="width:calc(100% - 24px);margin:auto;">
<section class="hr-tab-stack hr-gradebook">
  <div class="hr-grade-navigation-dock is-always-visible">
    <section class="hr-panel hr-grade-navigation" aria-label="Điều hướng sổ điểm">
      <div class="hr-grade-semesters" role="group" aria-label="Chọn học kỳ"><button class="active">Học kỳ I</button><button>Học kỳ II</button></div>
      <div class="hr-grade-views" role="group" aria-label="Chọn thành phần điểm">
        ${['TX · Đợt 1','TX · Đợt 2','TX · Đợt 3','TX · Đợt 4','Giữa kỳ','Cuối kỳ','Tổng hợp'].map((label,i)=>`<button data-grade-tone="blue" class="${i===0?'active':''}"><span class="gb4-view-icon">◫</span>${label}</button>`).join('')}
      </div>
      <div class="hr-grade-save-actions"><span class="is-saved">Dữ liệu đã lưu</span><button class="primary">Lưu bảng điểm</button></div>
    </section>
  </div>
  <div class="gb5-editor-anchor">
    <section class="hr-panel hr-grade-panel">
      <div class="hr-panel-head hr-grade-panel-head"><h2>Nhập điểm cho toàn bộ lớp</h2></div>
      <div class="hr-grade-table-wrap">
        <table class="hr-grade-table gb5-table-fill" style="min-width:820px">
          <thead><tr><th class="hr-grade-index">STT</th><th class="hr-grade-student">Học sinh</th>
          <th class="hr-grade-attempt-head">Lần 1</th><th class="hr-grade-plus-head">Dấu +</th>
          <th class="hr-grade-bonus-head">Điểm cộng</th><th class="hr-grade-result-head">Điểm Đợt 1</th></tr></thead>
          <tbody>${Array.from({length:29},(_,i)=>`<tr><td class="hr-grade-index">${i+1}</td>
          <td class="hr-grade-student"><b>Nguyễn Hoàng Minh Phương</b><small>CP-000${i+1}</small></td>
          <td class="gb-m3-score-cell"><input class="hr-grade-input" value="9"></td>
          <td class="hr-grade-plus-cell"><input class="hr-grade-input" value="0"></td>
          <td class="hr-grade-bonus-cell"><strong>0</strong></td>
          <td class="hr-grade-result"><strong>9</strong></td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>
  </div>
</section></main></div></body></html>`;

test('V5 navigation stays compact and a one-attempt score table fills the editor', async ({ page }) => {
  for (const width of [1440, 928, 768, 680, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(sample);
    await page.addStyleTag({ content: sourceCSS });
    const g = await page.evaluate(() => {
      const rect = (selector) => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right };
      };
      const views = document.querySelector('.hr-grade-views');
      const wrap = document.querySelector('.hr-grade-table-wrap');
      return {
        nav:rect('.hr-grade-navigation'), views:rect('.hr-grade-views'),
        first:rect('.hr-grade-views button'), last:rect('.hr-grade-views button:last-child'),
        wrapper:rect('.hr-grade-table-wrap'), table:rect('.hr-grade-table'),
        result:rect('tbody tr:first-child .hr-grade-result'),
        columns:getComputedStyle(views).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
        outerScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tableScroll:wrap.scrollWidth - wrap.clientWidth,
      };
    });
    const cols = width>1150?7:width>750?4:width>480?3:2;
    expect(g.columns, 'tab columns at '+width).toBe(cols);
    expect(g.nav.height, 'seven full-width navigation rows at '+width).toBeLessThan(width>750?195:290);
    expect(g.first.width, 'oversized tab at '+width).toBeLessThan(width>750?270:220);
    expect(g.last.right,'tab outside nav at '+width).toBeLessThanOrEqual(g.nav.right + 3);
    expect(g.last.y-g.first.y,'tabs span too many rows at '+width).toBeLessThan(width>480?90:135);
    expect(g.table.width,'table not filling the editor at '+width).toBeGreaterThanOrEqual(g.wrapper.width - 4);
    if(width>=928){
      expect(g.result.right, 'blank space after last score column at '+width).toBeGreaterThanOrEqual(g.wrapper.right - 10);
    }else{
      expect(g.tableScroll,'narrow viewport must retain horizontal scrolling at '+width).toBeGreaterThan(50);
    }
    expect(g.outerScroll,'outer horizontal overflow at '+width).toBeLessThanOrEqual(5);
  }
});
