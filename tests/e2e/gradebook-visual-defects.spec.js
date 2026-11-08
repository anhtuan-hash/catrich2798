import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
// Active Mac Gradebook CSS-only viewports. Role/data UAT is not simulated.
const css=readFileSync(new URL('../../src/components/gradebook/GradebookMacEngine.css',import.meta.url),'utf8');
const hero=readFileSync(new URL('../../src/styles/GradebookHeroCommand.css',import.meta.url),'utf8');
const html=\`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;background:#f5f8fc;font:14px Arial}#root{padding:8px;max-width:100%;box-sizing:border-box}
\${css}\${hero}</style></head><body><div id="root"><div class="gbmac-studio">
<section class="gbmac-shell gbmac-hero-canvas gbmac-hero-refined gbmac-hero-command">
<div class="gbmac-hero-media"><div class="gbmac-hero-default-art"></div></div>
<div class="gbmac-hero-content"><div class="gbmac-shell-head"><h1>Sổ điểm</h1></div><div class="gbmac-shell-selectors">
<label>Lớp học<select><option>12.6</option></select></label>
<label>Học kỳ<select><option>Học kỳ I</option></select></label></div></div></section>
<div class="gbmac"><div class="gbmac-workspace">
<header class="gbmac-workspace-heading"><h2>TX · Đợt 1</h2><span class="gbmac-save-state">Đã lưu</span></header>
<div class="gbmac-toolbar"><label class="gbmac-search"><input type="search" aria-label="Tìm học sinh"></label>
<div class="gbmac-primary-actions">
<button class="gbmac-save">Lưu điểm</button>
<button class="gbmac-outline"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><path d="M5 4h14v16H5Z"/></svg>Xuất Excel</button>
<button class="gbmac-outline"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><path d="M5 4h14v16H5Z"/></svg>Phiếu PDF</button>
</div></div></div><button class="gbmac-more">Công cụ khác</button></div></div></div></body></html>\`;
for(const width of [390,620,980,1440]){
 test('Current hero, export actions and tool trigger fit '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:950});
  await page.setContent(html);
  await expect(page.getByRole('heading',{name:'Sổ điểm'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Xuất Excel'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Phiếu PDF'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Công cụ khác'})).toBeVisible();
  for(const btn of ['Xuất Excel','Phiếu PDF']){
    const box=await page.getByRole('button',{name:btn}).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-2);
    expect(box.x+box.width).toBeLessThanOrEqual(width+2);
  }
  const icon=page.getByRole('button',{name:'Xuất Excel'}).locator('svg');
  const size=await icon.evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,fill:getComputedStyle(el).fill}));
  expect(size.w).toBe(16);expect(size.h).toBe(16);
  expect(size.fill).toBe('none');
  const outer=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(outer).toBeLessThanOrEqual(4);
 });
}
