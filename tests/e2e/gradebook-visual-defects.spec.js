import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const load=(p)=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const base=load('src/components/gradebook/HomeroomLearningGradebook.css');
const pageCss=load('src/styles/GradebookStudio.css');
const current=load('src/styles/GradebookAcademicWorkspace.css');
const svg='<svg viewBox="0 0 24 24"><path d="M5 4h10v16H5Z"/><path d="M15 7h4v10h-4M8 9l4 6M12 9l-4 6"/></svg>';
const options=['TX · Đợt 1','TX · Đợt 2','TX · Đợt 3','TX · Đợt 4','Giữa kỳ','Cuối kỳ','Tổng hợp'];
const fixture=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  html,body{margin:0;background:#f5f8fc;font:12px Arial}
  ${base}\n${pageCss}\n${current}
</style></head><body><div id="root"><main class="page hr-page gradebook-studio">
<div class="hr-tab-stack hr-gradebook">
  <details class="hr-panel gb-grade-tools"><summary class="gb-grade-tools-trigger">
    <span class="hr-grade-title-icon">${svg}</span>
    <span class="gb-grade-tools-heading"><strong>Công cụ Sổ điểm</strong><small>Quản lý môn học và công thức tính điểm</small></span>
    <span class="gb-grade-tools-chevron">⌄</span></summary>
    <div class="gb-grade-tools-content"><div class="hr-grade-controls"><details class="gbv2-manage-subject"><summary>＋ Quản lý môn học</summary><div class="gbv2-manage-content">Tiếng Anh</div></details></div><details class="gbv2-formula-details"><summary>fx · Xem công thức tính điểm</summary><div>Công thức</div></details></div>
  </details>
  <div class="hr-grade-navigation-dock is-always-visible"><section class="hr-panel hr-grade-navigation">
    <div class="hr-grade-semesters"><button>Học kỳ I</button><button>Học kỳ II</button></div>
    <div class="hr-grade-views">${options.map(x=>'<button>'+x+'</button>').join('')}</div>
    <div class="hr-grade-save-actions"><span class="is-saved">Dữ liệu đã lưu</span><button class="primary">Lưu bảng điểm</button></div>
  </section></div>
  <section class="hr-panel hr-grade-export-bar">
    <div class="hr-grade-export-copy">
      <span class="hr-grade-export-icon">${svg}</span>
      <div><span>EXCEL · PDF REPORTS</span><h3>Xuất báo cáo điểm</h3><p>Xuất theo môn Tiếng Anh · Học kỳ I</p></div>
    </div>
    <div class="hr-grade-export-actions"><button class="secondary hr-grade-export-class">Xuất điểm cả lớp</button><button class="primary hr-grade-export-pdf">Xuất phiếu điểm cá nhân (PDF)</button></div>
  </section>
</div></main></div></body></html>`;
for(const width of [390,620,980,1440]){
  test(`Gradebook report/tools/tabs are correctly sized at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000});
    await page.setContent(fixture);
    await expect(page.getByText('Công cụ Sổ điểm')).toBeVisible();
    const tools=page.locator('.gb-grade-tools');
    expect(await tools.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(80);
    const report=page.locator('.hr-grade-export-bar');
    expect(await report.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(170);
    const icon=page.locator('.hr-grade-export-icon svg');
    const iconInfo=await icon.evaluate(e=>{const b=e.getBoundingClientRect();return {w:b.width,h:b.height,fill:getComputedStyle(e).fill,stroke:getComputedStyle(e).stroke}});
    expect(iconInfo.w).toBe(20);
    expect(iconInfo.h).toBe(20);
    expect(iconInfo.fill).toBe('none');
    expect(iconInfo.stroke).not.toBe('none');
    for(const label of ['Học kỳ I','Học kỳ II',...options,'Lưu bảng điểm']){
      const button=page.getByRole('button',{name:label,exact:true});
      await expect(button).toBeVisible();
      const box=await button.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x+box.width).toBeLessThanOrEqual(width+2);
    }
    const outer=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(outer).toBeLessThanOrEqual(3);
    await tools.locator('summary').first().click();
    await expect(page.getByText('＋ Quản lý môn học')).toBeVisible();
  });
}
