import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const files=[
  'src/components/GlobalAttendanceNavigationTab.css',
  'src/components/attendance/AttendanceMaterial3.css',
  'src/components/attendance/AttendanceUnifiedDesign.css',
  'src/components/attendance/AttendanceTypography.css',
  'src/components/attendance/AttendanceTypographyViews.css',
  'src/pages/AttendanceWorkspace.css'
];
const css=files.map(f=>readFileSync(f,'utf8')).join('\n');
const html=[
'<main id="bes-main-content" data-route="attendance"><div class="bqa-content-safe-frame">',
'<div class="attendance-workspace-page"><div class="attendance-standalone-root" data-attendance-workspace="standalone">',
'<section class="attendance-shell is-standalone" role="region" aria-label="Điểm danh">',
'<header class="attendance-topbar" data-testid="header">',
'<div class="attendance-title"><span>▣</span><div><small>ESL BRIAN · ỨNG DỤNG ĐIỂM DANH</small><strong>Điểm danh lớp phụ đạo & bồi dưỡng</strong></div></div>',
'<div class="attendance-top-actions"><button class="attendance-icon-button" type="button">↻</button><button class="attendance-icon-button attendance-workspace-back">‹ <span>Về ESL Brian</span></button></div>',
'</header><nav class="attendance-tabs" data-testid="tabs" aria-label="Phân hệ điểm danh">',
'<button type="button" class="is-active" data-testid="tab1">Lịch điểm danh</button>',
'<button type="button">Quản lý lớp</button><button type="button">Lịch sử</button>',
'<button type="button">Học bổ sung</button><button type="button">Báo cáo</button>',
'<button type="button">Kho lưu trữ</button><button type="button">Giờ GV</button>',
'</nav><section class="attendance-content" data-testid="content">',
'<div class="attendance-quick-layout"><aside class="attendance-class-list">Danh sách lớp</aside><article class="attendance-rollcall">Danh sách học sinh</article></div>',
'</section></section></div></div></div></main>'
].join('');
async function boot(page,width) {
  await page.setViewportSize({width,height:950});
  await page.setContent(html);
  await page.addStyleTag({content:css});
}
test('desktop uses a full-width horizontal tab bar ABOVE the content, never a sidebar',async({page})=>{
  await boot(page,1440);
  const shell=page.locator('.attendance-shell');
  await expect(shell).toHaveAttribute('role','region');
  await expect(page.locator('.attendance-layer')).toHaveCount(0);
  const shellBox=await shell.boundingBox();
  const header=await page.getByTestId('header').boundingBox();
  const nav=await page.getByTestId('tabs').boundingBox();
  const content=await page.getByTestId('content').boundingBox();
  expect(shellBox.width).toBeGreaterThan(1100);
  expect(header.y).toBeLessThan(nav.y);
  expect(nav.y).toBeLessThan(content.y);
  expect(Math.abs(nav.x-content.x)).toBeLessThan(3);
  expect(Math.abs(nav.width-content.width)).toBeLessThan(3);
  expect(await page.getByTestId('tabs').evaluate(el=>getComputedStyle(el).flexDirection)).toBe('row');
  expect(await shell.evaluate(el=>getComputedStyle(el).flexDirection)).toBe('column');
  await expect(page.getByTestId('tab1')).toHaveCSS('color','rgb(255, 255, 255)');
});
test('long reports expand page height instead of clipping or overlaying the footer',async({page})=>{
  await boot(page,1440);
  await page.getByTestId('content').evaluate(node=>{
    const section=document.createElement('section');
    section.id='report-overflow-fixture';section.style.height='1350px';section.textContent='Nội dung báo cáo dài';
    node.appendChild(section);
  });
  const shellHeight=(await page.locator('.attendance-shell').boundingBox()).height;
  expect(shellHeight).toBeGreaterThan(1450);
  expect(await page.getByTestId('content').evaluate(el=>getComputedStyle(el).overflowY)).toBe('visible');
});
test('mobile retains a horizontal scrollable top navigation',async({page})=>{
  await boot(page,390);
  const tabs=await page.getByTestId('tabs').boundingBox();
  const content=await page.getByTestId('content').boundingBox();
  expect(tabs.y).toBeLessThan(content.y);
  expect(tabs.width).toBeGreaterThan(330);
  expect(content.width).toBeGreaterThan(330);
  expect(await page.getByTestId('tabs').evaluate(el=>getComputedStyle(el).flexDirection)).toBe('row');
  expect(await page.getByTestId('tabs').evaluate(el=>getComputedStyle(el).overflowX)).toBe('auto');
  await expect(page.locator('.attendance-layer')).toHaveCount(0);
});
