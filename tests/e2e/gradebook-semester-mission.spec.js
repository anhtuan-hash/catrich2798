import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../src/styles/GradebookAcademicWorkspace.css',import.meta.url),'utf8');
const names=['TX · Đợt 1','TX · Đợt 2','TX · Đợt 3','TX · Đợt 4','Giữa kỳ','Cuối kỳ'];
for(const width of [390,620,980,1440]){
  test('Mission visual cards and 42 score columns fit '+width+' px without page overflow',async({page})=>{
    await page.setViewportSize({width,height:780});
    await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:#f4f8ff;font:13px system-ui}${css}</style></head><body>
<div id="root"><main class="gradebook-studio"><div class="hr-tab-stack hr-gradebook">
<section class="gb-mission">
 <div class="gb-mission-heading">
  <div class="gb-mission-heading-copy"><span class="gb-mission-eyebrow">GRADEBOOK INSIGHTS</span><h2>Trung tâm tiến độ học kỳ</h2><p>Theo dõi ô điểm còn thiếu</p></div>
  <div class="gb-mission-overall"><div class="gb-mission-ring" style="--gb-mission-pct:62%"><span>62<small>%</small></span></div><div><strong>160/258</strong><small>ô điểm đã nhập</small><em>98 ô còn trống</em></div></div>
 </div>
 <div class="gb-mission-layout">
  <div class="gb-mission-sections"><div class="gb-mission-subhead"><span>Sáu thành phần đánh giá</span><small>2/6 hoàn tất</small></div>
    <div class="gb-mission-grid">${names.map((name,i)=>`<button class="gb-mission-card gb-mission-card--${i}" style="--gb-mission-progress:40%">
     <span class="gb-mission-card-top"><span class="gb-mission-icon">✓</span></span><strong>${name}</strong>
     <span class="gb-mission-card-value">40<small>%</small></span><span class="gb-mission-bar"><span></span></span>
     <span class="gb-mission-card-caption">30/75 ô · 45 còn trống</span></button>`).join('')}</div></div>
  <aside class="gb-mission-queue"><div class="gb-mission-queue-title"><span class="gb-mission-queue-icon">☷</span><div><strong>Ưu tiên hoàn thiện</strong><small>Thiếu nhiều điểm nhất</small></div></div>
  <div class="gb-mission-queue-list">${Array.from({length:6},(_,i)=>`<button class="gb-mission-queue-row"><span class="gb-mission-avatar">${i+1}</span><span class="gb-mission-student"><strong>Nguyễn Trần Lâm Anh</strong><small>CP-000${i}</small></span><span class="gb-mission-missing">5 ô</span></button>`).join('')}</div>
  <div class="gb-mission-queue-foot">Chọn học sinh để xem ô thiếu</div></aside>
 </div>
</section>
<section class="hr-panel hr-grade-panel"><div class="hr-grade-table-wrap">
 <table class="hr-grade-table" style="min-width:5900px"><thead><tr><th class="hr-grade-index">STT</th><th class="hr-grade-student">Học sinh</th>
 ${Array.from({length:42},(_,i)=>'<th>Lần '+i+'</th>').join('')}</tr></thead>
 <tbody><tr><td class="hr-grade-index">1</td><td class="hr-grade-student"><b>Nguyễn Trần Lâm Anh</b></td>
 ${Array.from({length:42},()=>'<td><input class="hr-grade-input" value="0"></td>').join('')}</tr></tbody></table>
 </div></section>
</div></main></div></body></html>`);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
    await expect(page.getByRole('heading',{name:'Trung tâm tiến độ học kỳ'})).toBeVisible();
    expect(await page.locator('.gb-mission-card').count()).toBe(6);
    expect(await page.locator('.gb-mission-queue-row').count()).toBe(6);
    const card=await page.locator('.gb-mission-card').first().boundingBox();
    expect(card.width).toBeGreaterThan(95);
    expect(await page.locator('.hr-grade-table-wrap').evaluate(e=>e.scrollWidth-e.clientWidth)).toBeGreaterThan(500);
    expect((await page.locator('.hr-grade-input').first().boundingBox()).width).toBeGreaterThanOrEqual(64);
  });
}
