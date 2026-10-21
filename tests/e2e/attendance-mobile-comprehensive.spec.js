import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const styleFiles=[
 'src/components/GlobalAttendanceNavigationTab.css',
 'src/components/attendance/AttendanceMaterial3.css',
 'src/components/attendance/AttendanceUnifiedDesign.css',
 'src/components/attendance/AttendanceTypography.css',
 'src/components/attendance/AttendanceTypographyViews.css',
 'src/components/attendance/AttendanceIphoneReadable.css',
 'src/components/attendance/AttendanceDailyOverview.css',
 'src/components/attendance/AttendanceClassManagementWorkspace.css',
 'src/components/attendance/AttendanceHistoryV2.css',
 'src/components/attendance/AttendanceMonthlyReport.css',
 'src/components/attendance/StudentAttendanceReport.css',
 'src/components/attendance/AttendanceArchive.css',
 'src/pages/AttendanceWorkspace.css',
 'src/pages/AttendanceWorkspaceRebuilt.css',
 'src/pages/AttendanceQuickLayoutFix.css',
 'src/pages/AttendanceMobileAudit.css',
];
const css='*{box-sizing:border-box}html,body{margin:0;width:100%;max-width:100%}'+
styleFiles.map(x=>readFileSync(x,'utf8')).join('\n');

const head=(name)=>'<header class="awu-page-head"><div class="awu-page-head__identity"><span class="awu-page-head__icon">▣</span>'+
'<div class="awu-page-head__copy"><div class="awu-page-head__eyebrow">QUẢN LÝ CHUYÊN CẦN</div><h1>'+name+'</h1>'+
'<p>Quản lý lớp học, giáo viên và học sinh theo từng hoạt động.</p></div></div>'+
'<div class="awu-page-head__right"><div class="awu-page-head__indicators">'+
'<div class="awu-page-head__indicator is-green"><svg viewBox="0 0 24 24"></svg><span>Lớp hoạt động</span><b>28</b></div>'+
'<div class="awu-page-head__indicator is-violet"><svg viewBox="0 0 24 24"></svg><span>Thành viên lớp</span><b>310</b></div></div></div></header>';

const roster='<div class="attendance-quick-layout"><aside class="attendance-class-list">'+
'<header><strong>Lớp hoạt động</strong></header><div class="att-m3-class-discovery"><label>Tìm lớp<input></label></div>'+
'<div>'+Array.from({length:10},(_,i)=>'<button>Phụ đạo Toán '+i+'</button>').join('')+'</div></aside>'+
'<section class="attendance-rollcall"><header class="attendance-rollcall-head"><div><h2>Bồi dưỡng Lịch sử</h2></div></header>'+
'<div class="attendance-session-controls"><label>Ngày điểm danh<input type="date"></label></div>'+
'<div class="attendance-roster-head"><span>Học sinh</span><span>Lớp</span><span>Trạng thái</span></div>'+
'<div class="attendance-roster">'+Array.from({length:8},(_,i)=>'<div class="att-m3-roster-entry"><label>'+
'<span class="attendance-index">'+(i+1)+'</span><div><b>Nguyễn Hoàng Minh Anh</b><small>Không có mã HS</small></div>'+
'<span class="attendance-school-class">11.6</span>'+
'<div class="att-m3-attendance-status" role="group"><button class="is-active is-present">Có mặt</button>'+
'<button>Đi trễ</button><button>Vắng</button></div></label></div>').join('')+
'</div><footer class="attendance-confirm-bar"><label>Ghi chú<input></label><div class="att-m3-session-actions"><button>Xác nhận điểm danh</button></div></footer></section></div>';

const calendar='<div class="attendance-calendar-layout"><div class="attendance-daily-overview-host">'+
'<div class="attendance-daily-compact-toolbar"><div class="attendance-calendar-room-filter"><button>Phòng A201</button><button>Phòng A202</button></div>'+
'<label class="attendance-calendar-mode-bar__date"><span>Ngày điểm danh</span><input type="date"></label></div>'+
'<div class="attendance-daily-floor-card"><h2>Tầng 2</h2>'+
'<div class="attendance-daily-class-row"><span class="attendance-daily-class-row__class-shell">Bồi dưỡng Ngữ văn 10</span>'+
'<span class="attendance-daily-class-row__meta is-room">A201</span>'+
'<span class="attendance-daily-class-row__status is-completed">Đã điểm danh</span></div></div></div></div>';

const manage='<div class="attendance-manage-overview"><div class="attendance-manage-overview-toolbar attendance-import-card">'+
'<label class="attendance-manage-search"><input placeholder="Tìm lớp"></label>'+
'<button class="attendance-manage-import-button">Chọn file Excel</button></div>'+
'<div class="attendance-manage-filter-chips"><div role="group"><button>Tất cả</button><button>Phụ đạo</button><button>Bồi dưỡng</button></div>'+
'<div class="attendance-manage-display-toggle"><button>Lưới</button><button>Danh sách</button></div></div>'+
'<div class="attendance-manage-tile-grid">'+Array.from({length:4},(_,i)=>'<button class="attendance-manage-class-tile is-subject-geography">'+
'<span class="attendance-manage-tile__title">Bồi dưỡng Địa lí '+i+'</span>'+
'<span class="attendance-manage-tile__badges">Khối 11</span>'+
'<span class="attendance-manage-tile__meta"><span><svg></svg><span>Môn</span><strong>Địa lí</strong></span></span></button>').join('')+'</div></div>';

const history='<div class="ahv3__shell"><div class="ahv3__list">'+
'<div class="ahv3__list-head"><h2>Lịch sử điểm danh</h2></div>'+
'<div class="ahv3__items">'+Array.from({length:6},(_,i)=>'<button>Buổi học '+i+'</button>').join('')+'</div></div>'+
'<div class="ahv3__detail"><div class="ahv3__hero"><div class="ahv3__hero-copy"><h2>Chi tiết buổi học</h2></div></div>'+
'<div class="ahv3__info-grid"><article>Số tiết 2</article><article>Có mặt 20</article></div>'+
'<div class="ahv3__stat-grid"><article>Đi trễ 2</article><article>Vắng 1</article></div></div></div>';

const supplemental='<div class="bes-supplemental-report-filter"><div><span>Loại hoạt động</span>'+
'<button>Tất cả</button><button>Phụ đạo</button><button>Bồi dưỡng</button><button>Học bổ sung</button></div></div>'+
'<div class="bes-supplemental-workspace-host"><section><h2>Lớp học bổ sung</h2><label>Tên lớp<input></label>'+
'<button>Tạo lớp học bổ sung</button><p>Chưa có lớp học bổ sung phù hợp.</p></section></div>';

const teacherReport='<div class="att-report-m3"><div class="att-report-m3__toolbar">'+
'<div><h2>Báo cáo giáo viên</h2></div>'+
'<div class="att-report-m3__controls"><div class="att-report-m3__filters"><label>Tháng<input type="month"></label>'+
'<label>Lớp<select><option>Tất cả lớp</option></select></label>'+
'<label>Giáo viên<select><option>Tất cả giáo viên</option></select></label></div></div></div>'+
'<div class="att-report-m3__export"><button>Xuất Excel</button><button>In / Lưu PDF</button></div>'+
'<div class="att-report-m3__metrics">'+Array.from({length:4},(_,i)=>'<article class="is-blue"><div><span>Thống kê</span><b>'+[126,840,242,2][i]+'</b></div></article>').join('')+'</div>'+
'<div class="att-report-m3__table-wrap"><table><thead><tr>'+
Array.from({length:12},(_,i)=>'<th>Cột '+i+'</th>').join('')+'</tr></thead>'+
'<tbody><tr>'+Array.from({length:12},(_,i)=>'<td>Thông tin '+i+'</td>').join('')+'</tr></tbody></table></div></div>';

const studentReport='<div class="stud-att"><div class="stud-att__intro"><h2>Báo cáo học sinh</h2>'+
'<div class="stud-att__actions"><button>Xuất Excel</button><button>In PDF</button></div></div>'+
'<div class="stud-att__filters"><label>Từ ngày<input type="date"></label><label>Đến ngày<input type="date"></label>'+
'<label>Lớp<select><option>Tất cả lớp</option></select></label></div>'+
'<div class="stud-att__metrics">'+Array.from({length:4},(_,i)=>'<article><strong>'+[27,159,83,11][i]+'</strong><span>Thống kê</span></article>').join('')+'</div>'+
'<div class="stud-att__table-wrap"><table><thead><tr>'+Array.from({length:9},(_,i)=>'<th>Cột '+i+'</th>').join('')+'</tr></thead>'+
'<tbody><tr>'+Array.from({length:9},(_,i)=>'<td>Học sinh '+i+'</td>').join('')+'</tr></tbody></table></div></div>';

const archive='<div class="attendance-archive"><div class="attendance-archive__hero"><h2>Kho lưu trữ</h2>'+
'<div class="attendance-archive__stats">13 bản ghi</div></div>'+
'<div class="attendance-archive__toolbar"><label class="attendance-archive__search">Tìm kiếm<input></label>'+
'<select><option>Loại dữ liệu</option></select><select><option>Thời gian</option></select>'+
'<button class="attendance-archive__refresh">Cập nhật</button></div>'+
'<div class="attendance-archive__card"><div class="attendance-archive__meta"><span>Học sinh</span><span>10/2026</span></div>'+
'<div class="attendance-archive__actions"><button>Khôi phục</button><button>Xem lịch sử</button></div></div></div>';

const panes={
 quick:['Điểm danh',roster],calendar:['Lịch điểm danh',calendar],
 manage:['Quản lý lớp',manage],history:['Lịch sử',history],
 supplemental:['Học bổ sung',supplemental],teacherReport:['Báo cáo giáo viên',teacherReport],
 studentReport:['Báo cáo học sinh',studentReport],archive:['Kho lưu trữ',archive],
};
const pageHTML=(name,content)=>'<main id="bes-main-content" data-route="attendance">'+
'<div class="attendance-workspace-page"><div class="attendance-standalone-root">'+
'<section class="attendance-shell is-standalone"><header class="attendance-topbar">'+
'<div class="attendance-title"><span>▣</span><div><small>ESL BRIAN · ỨNG DỤNG ĐIỂM DANH</small>'+
'<strong>Điểm danh lớp phụ đạo & bồi dưỡng</strong></div></div>'+
'<div class="attendance-top-actions"><button>↻</button><button class="attendance-workspace-back">‹</button></div>'+
'</header><nav class="attendance-tabs">'+
['Điểm danh','Lịch điểm danh','Quản lý lớp','Lịch sử','Học bổ sung','Báo cáo','Kho lưu trữ','Giờ GV']
.map(x=>'<button>'+x+'</button>').join('')+'</nav>'+
'<div class="attendance-content">'+head(name)+content+'</div></section></div></div></main>';

async function setup(page,width,height,name,body) {
 await page.setViewportSize({width,height});
 await page.setContent(pageHTML(name,body));
 await page.addStyleTag({content:css});
}
async function validate(page,width,view) {
 const sizes=await page.evaluate(()=>({
  documentWidth:document.documentElement.scrollWidth,
  viewport:document.documentElement.clientWidth,
  contentWidth:document.querySelector('.attendance-content').getBoundingClientRect().width,
  heroWidth:document.querySelector('.awu-page-head').getBoundingClientRect().width,
  navWidth:document.querySelector('.attendance-tabs').getBoundingClientRect().width,
 }));
 expect(sizes.documentWidth,view+' document overflow').toBeLessThanOrEqual(sizes.viewport+3);
 expect(sizes.contentWidth,view+' content collapsed').toBeGreaterThan(width-65);
 expect(sizes.heroWidth,view+' header collapsed').toBeGreaterThan(width-90);
 expect(sizes.navWidth,view+' tab row collapsed').toBeGreaterThan(width-65);
 const tabs=page.locator('.attendance-tabs');
 await expect(tabs).toHaveCSS('overflow-x','auto');
 await expect(tabs).toHaveCSS('flex-direction','row');
 for(const el of await page.locator('.awu-page-head__indicator').all()) {
  const b=await el.boundingBox();
  const panel=await page.locator('.awu-page-head').boundingBox();
  expect(b.x+b.width,view+' stat card escaped hero').toBeLessThanOrEqual(panel.x+panel.width+2);
 }
}
for(const [width,height] of [[320,720],[375,812],[390,844],[430,932],[768,1024]]){
 test('mobile audit '+width+'px: all eight views remain within viewport',async({page})=>{
  for(const [key,[name,body]] of Object.entries(panes)){
   await setup(page,width,height,name,body);
   await validate(page,width,key);
  }
 });
}
test('narrow reports preserve columns in a locally scrolling table',async({page})=>{
 for(const [key,wrap] of [['teacherReport','.att-report-m3__table-wrap'],['studentReport','.stud-att__table-wrap']]){
  const [name,body]=panes[key];
  await setup(page,390,844,name,body);
  const scroller=await page.locator(wrap).evaluate(node=>({width:node.clientWidth,total:node.scrollWidth}));
  expect(scroller.total,key+' table should be independently scrollable').toBeGreaterThan(scroller.width+200);
  expect(scroller.width).toBeLessThan(390);
  await validate(page,390,key);
 }
});
test('phone attendance status buttons remain readable and do not overlap',async({page})=>{
 await setup(page,320,720,...panes.quick);
 const buttons=await page.locator('.att-m3-roster-entry').first().locator('button').evaluateAll(nodes=>nodes.map(n=>{
  const r=n.getBoundingClientRect();return{x:r.x,w:r.width,y:r.y,h:r.height};
 }));
 expect(buttons).toHaveLength(3);
 for(const b of buttons) expect(b.w).toBeGreaterThan(56);
 expect(buttons[0].x+buttons[0].w).toBeLessThanOrEqual(buttons[1].x+2);
 expect(buttons[1].x+buttons[1].w).toBeLessThanOrEqual(buttons[2].x+2);
});
test('iOS-sized report controls prevent focus zoom',async({page})=>{
 await setup(page,390,844,...panes.studentReport);
 for(const el of await page.locator('.stud-att__filters input,.stud-att__filters select').all()){
  const font=await el.evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
  const height=(await el.boundingBox()).height;
  expect(font).toBeGreaterThanOrEqual(16);
  expect(height).toBeGreaterThanOrEqual(44);
 }
});
