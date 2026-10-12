import { test, expect } from '@playwright/test';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../../src/styles/GradebookAcademicWorkspace.css',import.meta.url),'utf8');
const base=readFileSync(new URL('../../src/components/gradebook/HomeroomLearningGradebook.css',import.meta.url),'utf8');
const semesters=['Học kỳ I','Học kỳ II'];
const views=['TX · Đợt 1','TX · Đợt 2','TX · Đợt 3','TX · Đợt 4','Giữa kỳ','Cuối kỳ','Tổng hợp'];
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;font:13px Arial,sans-serif;background:#f5f8fc;}${base}\n${css}</style></head>
<body><div id="root"><main class="gradebook-studio"><section class="hr-tab-stack hr-gradebook">
<div class="hr-grade-navigation-dock is-always-visible"><section class="hr-panel hr-grade-navigation" aria-label="Điều hướng sổ điểm">
<div class="hr-grade-semesters">${semesters.map((s,i)=>`<button class="${i===0?'active':''}">${s}</button>`).join('')}</div>
<div class="hr-grade-views">${views.map((s,i)=>`<button class="${i===0?'active':''}">${s}</button>`).join('')}</div>
<div class="hr-grade-save-actions"><span class="is-saved">Dữ liệu đã lưu</span><button class="primary">Lưu bảng điểm</button></div>
</section></div></section></main></div></body></html>`;
for(const width of [390,620,980,1440]){
  test(`All semester, grade tabs, status and Save remain visible at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.setContent(html);
    const buttons=page.locator('.hr-grade-navigation button');
    await expect(buttons).toHaveCount(10);
    for(const label of [...semesters,...views,'Lưu bảng điểm']){
      const button=page.getByRole('button',{name:label,exact:true});
      await expect(button).toBeVisible();
      const layout=await button.evaluate(el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width}});
      expect(layout.left).toBeGreaterThanOrEqual(0);
      expect(layout.right).toBeLessThanOrEqual(width+2);
      expect(layout.width).toBeGreaterThan(35);
    }
    await expect(page.getByText('Dữ liệu đã lưu')).toBeVisible();
    const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,collapsed:document.querySelector('.hr-grade-navigation-dock').classList.contains('is-collapsed')}));
    expect(layout.scroll).toBeLessThanOrEqual(layout.client+3);
    expect(layout.collapsed).toBe(false);
  });
}
