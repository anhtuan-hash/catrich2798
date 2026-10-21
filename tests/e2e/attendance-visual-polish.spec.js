import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const css=[
 'src/components/GlobalAttendanceNavigationTab.css',
 'src/components/attendance/AttendanceMaterial3.css',
 'src/components/attendance/AttendanceTypography.css',
 'src/components/attendance/AttendanceTypographyViews.css',
 'src/components/attendance/AttendanceUnifiedDesign.css',
 'src/components/attendance/AttendanceClassManagementWorkspace.css',
 'src/pages/AttendanceWorkspace.css',
 'src/pages/AttendanceWorkspaceRebuilt.css',
].map(p=>readFileSync(p,'utf8')).join('\n');
const tiles=Array.from({length:6},(_,i)=>
 '<button class="attendance-manage-class-tile is-subject-geography" data-testid="class-tile">'+
 '<span class="attendance-manage-tile__topline"><span class="attendance-manage-tile__icon">▤</span>'+
 '<span class="attendance-manage-tile__type is-gifted">Bồi dưỡng</span></span>'+
 '<span class="attendance-manage-tile__title" data-testid="card-title">Bồi dưỡng Địa lí '+(i+10)+'</span>'+
 '<span class="attendance-manage-tile__subtitle">Địa lí · Khối 11</span>'+
 '<span class="attendance-manage-tile__meta"><span>Phòng A406</span><span>Thứ 4</span><span>16h45 đến 18h15</span>'+
 '<span>22 học sinh</span><span>Giáo viên phụ trách</span></span></button>'
).join('');
const fixture='<main id="bes-main-content" data-route="attendance">'+
'<div class="attendance-workspace-page"><div class="attendance-standalone-root">'+
'<section class="attendance-shell is-standalone">'+
'<header class="attendance-topbar"><div class="attendance-title"><span>▣</span><div><small>ESL BRIAN</small><strong>Điểm danh lớp phụ đạo & bồi dưỡng</strong></div></div></header>'+
'<nav class="attendance-tabs"><button type="button">Điểm danh</button><button type="button" class="is-active">Quản lý lớp</button><button type="button">Báo cáo</button></nav>'+
'<main class="attendance-content">'+
'<header class="awu-page-head" data-testid="page-header">'+
'<div class="awu-page-head__identity"><span class="awu-page-head__icon">▦</span><div class="awu-page-head__copy"><div class="awu-page-head__eyebrow">QUẢN LÝ ĐÀO TẠO</div><h1 data-testid="page-title">Quản lý lớp học</h1><p>Danh sách lớp học</p></div></div>'+
'<div class="awu-page-head__right"><div class="awu-page-head__indicators"><div class="awu-page-head__indicator"><span>Lớp hoạt động</span><b>28</b></div></div></div></header>'+
'<section class="attendance-manage-overview">'+
'<header class="awu-panel-head" data-testid="section-header"><div class="awu-panel-head__copy"><span class="awu-panel-head__icon">▤</span><div><span class="awu-panel-head__eyebrow">DANH SÁCH LỚP</span><h2>Danh sách lớp học</h2><p>Tìm theo môn, loại lớp hoặc khối</p></div></div></header>'+
'<div class="attendance-manage-overview-toolbar attendance-import-card"><label class="attendance-manage-search"><input placeholder="Tìm tên lớp hoặc giáo viên"></label><button class="attendance-manage-import-button">Chọn file Excel</button></div>'+
'<div class="attendance-manage-filter-chips"><div><button class="is-active">Tất cả</button><button>Phụ đạo</button></div></div>'+
'<div class="attendance-manage-tile-grid" data-testid="class-grid">'+tiles+
'</div></section></main></section></div></div></main>';
async function setup(page,width){
 await page.setViewportSize({width,height:900});
 await page.setContent(fixture);
 await page.addStyleTag({content:css});
}
for(const [width,columns] of [[1440,3],[960,2],[390,1]]){
 test(width+'px class grid uses '+columns+' balanced readable columns',async({page})=>{
  await setup(page,width);
  await expect(page.locator('.attendance-tabs')).toHaveCSS('flex-direction','row');
  await expect(page.locator('.attendance-tabs button').first()).toHaveText('Điểm danh');
  const grid=page.getByTestId('class-grid');
  const actual=await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
  expect(actual).toBe(columns);
  const title=await page.getByTestId('page-title').evaluate(el=>({font:getComputedStyle(el).fontFamily,size:parseFloat(getComputedStyle(el).fontSize)}));
  expect(title.size).toBeGreaterThanOrEqual(width<700?19:22);
  expect(title.font.toLowerCase()).not.toContain('dancing script');
  const cardSize=await page.getByTestId('card-title').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(cardSize).toBeGreaterThanOrEqual(16);
  await expect(page.getByTestId('class-tile')).toHaveCount(6);
  const a=await page.getByTestId('page-header').boundingBox(),b=await page.getByTestId('section-header').boundingBox();
  expect(a.y).toBeLessThan(b.y);
  expect(b.width).toBeGreaterThan(width<700?290:650);
 });
}
