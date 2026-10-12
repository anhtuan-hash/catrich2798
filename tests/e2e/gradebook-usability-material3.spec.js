import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const gradeCss=readFileSync(new URL('../../src/styles/GradebookAcademicWorkspace.css',import.meta.url),'utf8');
const prodCss=readFileSync(new URL('../../src/components/gradebook/GradebookProductivityPanel.css',import.meta.url),'utf8');

const tabNames=['TX · Đợt 1','TX · Đợt 2','TX · Đợt 3','TX · Đợt 4','Giữa kỳ','Cuối kỳ','Tổng hợp'];
const fixture=(n=42)=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  html,body{margin:0;background:#f5f8ff;font:13px Arial}
  ${gradeCss}\n${prodCss}
</style></head><body><div id="root"><main class="gradebook-studio"><div class="hr-tab-stack hr-gradebook">
<div class="hr-grade-navigation-dock is-always-visible"><section class="hr-panel hr-grade-navigation">
  <div class="hr-grade-semesters"><button>Học kỳ I</button><button>Học kỳ II</button></div>
  <div class="hr-grade-views">${tabNames.map(t=>'<button>'+t+'</button>').join('')}</div>
  <div class="hr-grade-save-actions"><span>Dữ liệu đã lưu</span><button>Lưu bảng điểm</button></div>
</section></div>
<section class="hr-panel hr-grade-panel"><div class="hr-grade-panel-head">
  <h2>Nhập điểm cho toàn bộ lớp</h2>
  <div class="gbv2-head-actions"><button class="gbv3-expand-table" aria-pressed="false">Xem toàn bộ 29 học sinh</button></div>
</div>
<div class="hr-grade-table-wrap">
<table class="hr-grade-table" style="min-width:5900px"><thead><tr>
  <th class="hr-grade-index">STT</th><th class="hr-grade-student">Học sinh</th>
  ${Array.from({length:n},(_,i)=>'<th class="hr-grade-attempt-head">Lần '+(i+1)+'</th>').join('')}
</tr></thead><tbody>${Array.from({length:29},(_,i)=>'<tr><td class="hr-grade-index">'+(i+1)+'</td><td class="hr-grade-student"><b>Nguyễn Trần Lâm Anh</b><small>CP-0000'+i+'</small></td>'+Array.from({length:n},()=>'<td><input class="hr-grade-input" value="8.5"></td>').join('')+'</tr>').join('')}</tbody></table>
</div></section>
<details class="gb-prod" open><summary class="gb-prod-heading"><span><strong>Bộ công cụ Sổ điểm</strong></span></summary>
  <div class="gb-prod-body"><div class="gb-prod-pane">
    <details class="gb-prod-excel"><summary class="gb-prod-excel-trigger"><strong>Nhập tệp Excel (.xlsx) có đối chiếu học sinh</strong></summary><div class="gb-prod-excel-content"><input type="file" aria-label="Tệp Excel"></div></details>
  </div></div></details>
</div></main></div></body></html>`;

for(const width of [390,620,980,1440]){
  test('Material 3 gradebook readable and isolated at '+width+'px',async({page})=>{
    await page.setViewportSize({width,height:780});
    await page.setContent(fixture());
    const outer=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(outer).toBeLessThanOrEqual(4);
    const wrap=page.locator('.hr-grade-table-wrap');
    const dim=await wrap.evaluate(el=>({w:el.clientWidth,scroll:el.scrollWidth,h:el.getBoundingClientRect().height,max:getComputedStyle(el).maxHeight}));
    expect(dim.scroll).toBeGreaterThan(dim.w+500);
    expect(dim.h).toBeGreaterThanOrEqual(width<740?460:590);
    const first=page.locator('.hr-grade-input').first();
    expect((await first.boundingBox()).width).toBeGreaterThanOrEqual(64);
    for(const tab of tabNames)await expect(page.getByRole('button',{name:tab,exact:true})).toBeVisible();
    const details=page.locator('.gb-prod-excel');
    expect(await details.evaluate(el=>el.open)).toBe(false);
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open');
    await expect(page.getByLabel('Tệp Excel')).toBeVisible();
    await page.locator('.gbv3-expand-table').click();
    await wrap.evaluate(el=>el.classList.add('gbv3-table-expanded'));
    const expanded=await wrap.evaluate(el=>({height:el.getBoundingClientRect().height,max:getComputedStyle(el).maxHeight}));
    expect(expanded.max).toBe('none');
    expect(expanded.height).toBeGreaterThan(780);
  });
}
