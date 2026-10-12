import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const css = [
  '../../src/components/gradebook/HomeroomLearningGradebook.css',
  '../../src/styles/GradebookAcademicWorkspace.css',
  '../../src/styles/GradebookSpectrumV4.css',
  '../../src/styles/GradebookRosterLayoutHotfix.css',
  '../../src/styles/GradebookFocusV5.css',
].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

const fixture = `<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>*{box-sizing:border-box}html,body{margin:0;background:#eef4fb;font:13px Arial,sans-serif}</style></head>
<body><div id="root"><main class="page hr-page gradebook-studio gb4-spectrum gb4-palette-electric gb5-focus" style="padding:10px;max-width:100%;width:100%">
<section class="gradebook-studio-hero gb-academic-hero">
<div class="gb-academic-heading">
 <div class="gb-academic-heading-copy"><span class="gb-academic-eyebrow">GRADEBOOK / SỔ ĐIỂM</span><h1>Sổ điểm</h1>
 <p>Quản lý điểm số, theo dõi tiến độ và đánh giá học tập trực quan</p>
 <div class="gb4-hero-signals"><span>Lớp 12.6</span><span>29 học sinh</span></div>
 </div><span class="gb-academic-class-meta">2026–2027 · Học kỳ I</span>
</div>
<div class="gb-academic-class-row"><span class="gb-academic-section-label">LỚP ĐANG MỞ</span><div class="gb-academic-class-list">
<button class="is-active">12.6</button><button>12.3</button><button>11.1</button></div></div>
<div class="gb-academic-actions"><div class="gb-academic-primary-actions"><button class="gb-academic-primary">Nhập điểm</button><button>Tổng hợp</button><button>Xuất báo cáo</button></div>
<div class="gb-academic-secondary-actions"><button>Danh sách HS</button></div></div></section>
<section class="hr-tab-stack hr-gradebook" style="width:100%;min-width:0">
<div class="hr-grade-navigation-dock is-always-visible"><section class="hr-panel hr-grade-navigation">
<div class="hr-grade-semesters"><button class="active">Học kỳ I</button><button>Học kỳ II</button></div>
<div class="hr-grade-views">${['TX 1','TX 2','TX 3','TX 4','Giữa kỳ','Cuối kỳ','Tổng hợp'].map((x,i)=>`<button data-grade-tone="blue" class="${i===0?'active':''}">${x}</button>`).join('')}</div>
<div class="hr-grade-save-actions"><span class="is-saved">Dữ liệu đã lưu</span><button class="primary">Lưu bảng điểm</button></div>
</section></div>
<section class="gb5-focusbar"><div class="gb5-focusbar-main"><div class="gb5-focusbar-icon">∑</div>
<div class="gb5-focusbar-copy"><span class="gb5-eyebrow">FOCUS WORKSPACE · GRADEBOOK V5</span><h2>Không gian nhập điểm</h2><p>Tiếng Anh · Học kỳ I · 29 học sinh</p></div>
<span class="gb5-sync-status">Đã lưu</span></div><div class="gb5-focusbar-bottom"><div class="gb5-score-progress">
<span class="gb5-progress-number">51<small>%</small></span><div class="gb5-progress-copy"><b>Tiến độ nhập điểm</b><small>203/398 ô đã nhập</small><div class="gb5-track"><span style="width:51%"></span></div></div></div>
<div class="gb5-focusbar-actions"><button class="gb5-quiet-button">Chỉ ô còn thiếu</button><button class="gb5-quiet-button">Phân tích & công cụ</button><button class="gb5-main-button">Đến bảng điểm</button></div>
</div></section>
<div class="gb5-editor-anchor" style="width:100%;min-width:0">
<section class="gb-roster-workbench"><div class="gb-roster-workbench-main">
<label class="gb-roster-search"><input aria-label="Tìm học sinh" placeholder="Tìm tên hoặc mã học sinh"></label>
<label class="gb-roster-missing"><input type="checkbox"><span>Chỉ học sinh còn thiếu điểm</span></label>
<label class="gb-roster-sort"><span>Sắp xếp</span><select><option>Thứ tự lớp</option></select></label><span class="gb-roster-count">29/29 học sinh</span>
</div><div class="gb-roster-workbench-side"><button>Ô trống tiếp theo</button><button>Bảng gọn</button><button>Chế độ tập trung</button></div>
</section>
<section class="hr-panel hr-grade-panel"><div class="hr-panel-head hr-grade-panel-head"><div><small>TX Đợt 1</small><h2>Nhập điểm cho toàn bộ lớp</h2></div></div>
<div class="hr-grade-table-wrap"><table class="hr-grade-table" style="min-width:1700px"><thead><tr>
<th class="hr-grade-index">STT</th><th class="hr-grade-student">Học sinh</th>
${Array.from({length:10},(_,i)=>`<th>Lần ${i+1}</th>`).join('')}
</tr></thead><tbody>
${Array.from({length:3},(_,i)=>`<tr><td class="hr-grade-index">${i+1}</td><td class="hr-grade-student"><b>Nguyễn Văn A</b></td>${Array.from({length:10},()=>'<td><input class="hr-grade-input" value="9"></td>').join('')}</tr>`).join('')}
</tbody></table></div></section></div>
<details class="gb5-insights-drawer"><summary><span class="gb5-insights-symbol">📊</span><span><strong>Phân tích & công cụ Sổ điểm</strong><small>Thống kê học kỳ, tiến độ nhập và quản lý môn học</small></span><span class="gb5-insights-chevron">⌄</span></summary>
<div class="gb5-insights-content"><section class="hr-grade-overview"><article>42 cột điểm</article></section></div></details>
</section></main></div></body></html>`;

test('V5 puts editor before optional analytics and prevents narrow toolbars at 390–1440 px', async ({page}) => {
  for (const [width,height] of [[1440,900],[1024,768],[768,960],[390,844]]) {
    await page.setViewportSize({width,height});
    await page.setContent(fixture);
    await page.addStyleTag({content:css});
    const layout=await page.evaluate(()=>{
      const b=(selector)=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}};
      return {hero:b('.gb-academic-heading'),tabs:b('.hr-grade-navigation'),
        focus:b('.gb5-focusbar'),editor:b('.gb5-editor-anchor'),
        roster:b('.gb-roster-workbench'),table:b('.hr-grade-panel'),
        insights:b('.gb5-insights-drawer'),label:b('.gb-roster-missing > span'),
        contentWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
        tableScroll:document.querySelector('.hr-grade-table-wrap').scrollWidth,
        tableWidth:document.querySelector('.hr-grade-table-wrap').clientWidth};
    });
    expect(layout.hero.height,'Hero too large at '+width).toBeLessThan(width>750?190:225);
    expect(layout.table.y,'Table must come before optional dashboard at '+width).toBeLessThan(layout.insights.y);
    expect(layout.editor.y,'Focus bar must precede editor').toBeGreaterThanOrEqual(layout.focus.y);
    expect(layout.roster.height,'Toolbar huge at '+width).toBeLessThan(width>750?310:540);
    expect(layout.label.height,'Label vertical at '+width).toBeLessThan(60);
    expect(layout.label.width,'Label collapsed at '+width).toBeGreaterThan(155);
    expect(layout.contentWidth,'Horizontal overflow at '+width).toBeLessThanOrEqual(layout.viewport+6);
    expect(layout.tableScroll).toBeGreaterThan(layout.tableWidth+100);
    const alwaysVisible=page.locator('.hr-grade-views button');
    await expect(alwaysVisible).toHaveCount(7);
    await expect(page.getByText('Không gian nhập điểm')).toBeVisible();
    await expect(page.getByText('Phân tích & công cụ Sổ điểm')).toBeVisible();
    await expect(page.getByText('42 cột điểm')).not.toBeVisible();
    await page.locator('.gb5-insights-drawer>summary').click();
    await expect(page.getByText('42 cột điểm')).toBeVisible();
  }
});
