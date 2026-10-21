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
const subjects=['geography','chemistry','math','english','literature','biology'];
const tiles=subjects.map((subject,i)=>
 '<button class="attendance-manage-class-tile is-subject-'+subject+'" data-testid="class-tile">'+
 '<span class="attendance-manage-tile__topline"><span class="attendance-manage-tile__icon">▤</span>'+
 '<span class="attendance-manage-tile__eyebrow">LỚP HỌC</span></span>'+
 '<span class="attendance-manage-tile__title" data-testid="card-title">Bồi dưỡng môn lớp '+(i+10)+'</span>'+
 '<span class="attendance-manage-tile__badges"><span class="attendance-manage-tile__type is-gifted">Bồi dưỡng</span>'+
 '<span class="attendance-manage-tile__grade">Khối 11</span></span>'+
 '<span class="attendance-manage-tile__meta">'+
 '<span class="attendance-manage-tile__subject"><i>◦</i><span>Môn học</span><strong>Địa lí</strong></span>'+
 '<span class="attendance-manage-tile__teacher"><i>◦</i><span>Giáo viên</span><strong>Nguyễn Thị A</strong></span>'+
 '<span class="attendance-manage-tile__room"><i>◦</i><span>Phòng học</span><strong>A406</strong></span>'+
 '<span class="attendance-manage-tile__weekday"><i>◦</i><span>Thời gian</span><strong>Thứ 4 · 16h45</strong></span>'+
 '<span class="attendance-manage-tile__students"><i>◦</i><span>Sĩ số</span><strong>25 học sinh</strong></span>'+
 '</span></button>'
).join('');
const html=(view='grid')=>
 '<main id="bes-main-content" data-route="attendance">'+
 '<div class="attendance-workspace-page"><div class="attendance-standalone-root">'+
 '<section class="attendance-shell is-standalone">'+
 '<header class="attendance-topbar"><div class="attendance-title"><span>▣</span><div><small>ESL BRIAN</small><strong>Điểm danh lớp phụ đạo & bồi dưỡng</strong></div></div></header>'+
 '<nav class="attendance-tabs"><button type="button">Điểm danh</button><button type="button" class="is-active">Quản lý lớp</button><button type="button">Báo cáo</button></nav>'+
 '<main class="attendance-content">'+
 '<header class="awu-page-head" data-testid="page-header">'+
 '<div class="awu-page-head__identity"><span class="awu-page-head__icon">▦</span><div class="awu-page-head__copy"><div class="awu-page-head__eyebrow">QUẢN LÝ ĐÀO TẠO</div><h1 data-testid="page-title">Quản lý lớp học</h1><p>Quản lý lớp học</p></div></div>'+
 '<div class="awu-page-head__right"><div class="awu-page-head__indicators"><div class="awu-page-head__indicator is-green" data-testid="kpi-green"><svg viewBox="0 0 24 24"></svg><span>Lớp hoạt động</span><b>28</b></div>'+
 '<div class="awu-page-head__indicator is-violet" data-testid="kpi-violet"><svg viewBox="0 0 24 24"></svg><span>Thành viên lớp</span><b>310</b></div></div></div></header>'+
 '<section class="attendance-manage-overview">'+
 '<div class="attendance-manage-overview-toolbar attendance-import-card"><label class="attendance-manage-search"><input placeholder="Tìm lớp"></label><button class="attendance-manage-import-button">Chọn file Excel</button></div>'+
 '<div class="attendance-manage-filter-chips"><div role="group"><button class="is-active">Tất cả</button><button>Phụ đạo</button></div>'+
 '<span class="attendance-manage-result-count">28 lớp</span><div class="attendance-manage-display-toggle"><button class="is-active">▦</button><button>☰</button></div></div>'+
 '<div class="attendance-manage-list-heading"><h2>Danh sách lớp học</h2><span>28 lớp phù hợp</span></div>'+
 '<div class="attendance-manage-tile-grid '+(view==='list'?'is-list':'')+'" data-testid="class-grid">'+tiles+
 '</div></section></main></section></div></div></main>';
async function setup(page,width,view='grid'){
 await page.setViewportSize({width,height:900});
 await page.setContent(html(view));
 await page.addStyleTag({content:css});
}
const computed=(page,selector,prop)=>page.locator(selector).first().evaluate((el,p)=>getComputedStyle(el).getPropertyValue(p).trim(),prop);
for(const [width,columns] of [[1440,3],[960,2],[390,1]]){
 test(width+'px Google Material layout uses '+columns+' columns',async({page})=>{
  await setup(page,width);
  await expect(page.locator('.attendance-tabs')).toHaveCSS('flex-direction','row');
  await expect(page.locator('.attendance-tabs button').first()).toHaveText('Điểm danh');
  const actual=await page.getByTestId('class-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
  expect(actual).toBe(columns);
  const title=await computed(page,'[data-testid=page-title]','font-size');
  expect(parseFloat(title)).toBeGreaterThanOrEqual(width<800?20:26);
  const cardTitle=await computed(page,'[data-testid=card-title]','font-size');
  expect(parseFloat(cardTitle)).toBeGreaterThanOrEqual(16);
  await expect(page.getByTestId('class-tile')).toHaveCount(6);
  expect(await computed(page,'[data-testid=class-tile]','background-color')).toBe('rgb(255, 255, 255)');
  expect(await computed(page,'[data-testid=page-header]','background-color')).toBe('rgb(255, 255, 255)');
  const first=await page.getByTestId('class-tile').first().boundingBox();
  expect(first.width).toBeGreaterThan(width<700?300:width<1200?260:325);
 });
}
test('green and purple KPIs and subject colors are visibly distinct',async({page})=>{
 await setup(page,1440);
 const green=await computed(page,'[data-testid=kpi-green]','background-color');
 const violet=await computed(page,'[data-testid=kpi-violet]','background-color');
 expect(green).not.toBe(violet);
 const tileColors=await page.locator('.attendance-manage-class-tile .attendance-manage-tile__icon').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).color));
 expect(new Set(tileColors).size).toBeGreaterThanOrEqual(5);
 await expect(page.locator('.attendance-manage-tile__meta>span').first()).toBeVisible();
});
test('list mode shows one full-width card per row',async({page})=>{
 await setup(page,1440,'list');
 const actual=await page.getByTestId('class-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
 expect(actual).toBe(1);
 const first=await page.getByTestId('class-tile').first().boundingBox();
 const second=await page.getByTestId('class-tile').nth(1).boundingBox();
 expect(second.y).toBeGreaterThan(first.y);
});
