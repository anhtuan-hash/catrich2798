import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const cssFiles=[
  'src/components/GlobalAttendanceNavigationTab.css',
  'src/components/attendance/AttendanceMaterial3.css',
  'src/components/attendance/AttendanceHistoryV2.css',
  'src/components/attendance/AttendanceClassManagementWorkspace.css',
  'src/components/attendance/AttendanceClassManagementDetailMockup.css',
  'src/components/attendance/AttendanceDailyOverview.css',
  'src/components/attendance/AttendanceMonthlyReport.css',
  'src/components/attendance/StudentAttendanceReport.css',
  'src/components/attendance/StudentAttendanceReportTheme.css',
  'src/components/attendance/AttendanceArchive.css',
  'src/styles/SupplementalLearning.css',
  'src/styles/AttendanceTimeAccessControl.css',
  'src/components/attendance/AttendanceTypography.css',
  'src/components/attendance/AttendanceTypographyViews.css',
  'src/components/attendance/AttendanceUnifiedDesign.css',
];
const combined=cssFiles.map(file=>readFileSync(file,'utf8')).join('\n');
const fixture=[
  '<section class="attendance-shell" style="width:100%;max-width:1200px;margin:auto">',
  '<header class="attendance-topbar"><div class="attendance-title"><span>▣</span><div><small>QUẢN LÝ CHUYÊN CẦN</small><strong>Điểm danh lớp phụ đạo & bồi dưỡng</strong></div></div></header>',
  '<nav class="attendance-tabs"><button> Lịch điểm danh </button><button>Quản lý lớp</button><button>Lịch sử</button><button>Học bổ sung</button><button class="is-active" data-testid="active-tab">Báo cáo</button><button>Kho lưu trữ</button><button>Giờ GV</button></nav>',
  '<main class="attendance-content">',
  '<div class="attendance-quick-layout"><aside class="attendance-class-list" data-testid="quick-sidebar"><header>Danh sách lớp</header><div><button class="is-selected">Phụ đạo Tiếng Anh 11</button></div></aside>',
  '<section class="attendance-rollcall" data-testid="quick-rollcall"><header class="attendance-rollcall-head"><div><span>Phụ đạo</span><h2>Điểm danh</h2></div></header><div class="attendance-session-controls"><label>Giáo viên</label></div><div class="attendance-roster-head" data-testid="roster-head">HỌC SINH</div><div class="attendance-roster"><div class="att-m3-roster-entry"><label><span>A</span><div class="att-m3-attendance-status"><button class="is-active is-present" data-testid="present">Có mặt</button><button class="is-active is-late" data-testid="late">Đi trễ</button><button class="is-active is-absent" data-testid="absent">Vắng</button></div></label></div></div></section></div>',
  '<div class="attendance-daily-overview"><div class="attendance-daily-overview__summary" data-testid="calendar-summary"><div class="attendance-daily-overview__metrics"><article class="attendance-daily-overview__metric" data-testid="calendar-kpi">Có lịch 12</article><article class="attendance-daily-overview__metric is-completed">Đã điểm danh 10</article></div></div><div class="attendance-daily-floor-card" data-testid="calendar-floor"><div class="attendance-daily-class-row" data-testid="calendar-row">Lớp 11A1</div></div></div>',
  '<div class="attendance-manage-overview"><section class="attendance-manage-overview-toolbar attendance-import-card" data-testid="manage-toolbar"><input placeholder="Tìm lớp" /></section><div class="attendance-manage-class-tile" data-testid="manage-tile">Lớp phụ đạo</div></div><div class="attendance-manage-detail"><div class="attendance-manage-detail-hero" data-testid="manage-hero">Bồi dưỡng Văn 11</div><div class="attendance-manage-detail-roster-card" data-testid="manage-roster">Danh sách học sinh</div></div>',
  '<div class="ahv3__shell"><section class="ahv3__list" data-testid="history-sidebar"><header class="ahv3__list-head" data-testid="history-header">Lịch sử</header><div class="ahv3__items"><button class="is-selected" data-testid="history-selected">Buổi 1</button></div></section><section class="ahv3__detail" data-testid="history-detail"><div class="ahv3__hero" data-testid="history-hero">Buổi học</div><h3 class="ahv3__section-title" data-testid="history-section">Chi tiết</h3></section></div>',
  '<div class="att-report-m3"><div class="att-report-m3__toolbar" data-testid="teacher-report-hero">Báo cáo theo giáo viên</div><section class="att-report-m3__surface" data-testid="teacher-report-surface"><table><thead><tr><th data-testid="teacher-report-table">Giáo viên</th></tr></thead></table></section></div>',
  '<div class="stud-att"><header class="stud-att__intro" data-testid="student-report-hero">Báo cáo theo học sinh</header><section class="stud-att__filter-panel" data-testid="student-report-filter">Lọc báo cáo</section><div class="stud-att__metrics"><article class="stud-att__metric--students">Học sinh</article></div></div>',
  '<div class="attendance-archive"><header class="attendance-archive__hero" data-testid="archive-hero"><h2>Kho lưu trữ</h2></header><div class="attendance-archive__card" data-testid="archive-card">Buổi đã lưu</div></div>',
  '<div class="bes-attendance-time-settings is-compact-popover" data-testid="teacher-time"><div class="bes-attendance-time-heading"><strong>Giờ GV</strong></div></div>',
  '</main></section>',
  '<section class="bes-supplemental-dialog" data-testid="supplemental-dialog"><header class="bes-supplemental-dialog-head" data-testid="supplemental-header">Học bổ sung</header><div class="bes-supplemental-card" data-testid="supplemental-card">Buổi bổ sung</div></section>',
].join('');

async function setup(page,width=1440){
  await page.setViewportSize({width,height:960});
  await page.setContent(fixture);
  await page.addStyleTag({content:combined});
}
async function style(page,id,name) {
  return page.getByTestId(id).evaluate((node,property)=>getComputedStyle(node).getPropertyValue(property).trim(),name);
}
test.describe('Attendance seven-tab visual coherence',()=>{
  test('all tab surfaces use a matching card vocabulary',async({page})=>{
    await setup(page);
    for(const id of [
      'quick-sidebar','quick-rollcall','calendar-summary','manage-toolbar',
      'manage-hero','history-sidebar','history-detail','teacher-report-hero',
      'teacher-report-surface','student-report-hero','student-report-filter',
      'archive-hero','archive-card'
    ]) {
      expect(parseFloat(await style(page,id,'border-top-left-radius')),id+' radius').toBeGreaterThanOrEqual(16);
      expect(await style(page,id,'border-top-width'),id+' border').not.toBe('0px');
    }
    for(const id of ['teacher-report-hero','student-report-hero','archive-hero','history-header','supplemental-header']){
      expect(await style(page,id,'background-image'),id+' shared gradient').toContain('linear-gradient');
    }
    expect(await style(page,'active-tab','background-image')).toContain('linear-gradient');
    expect(await style(page,'roster-head','background-image')).toContain('linear-gradient');
    expect(await style(page,'teacher-report-table','color')).not.toBe('rgb(255, 255, 255)');
  });
  test('attendance status semantics and unrelated portal stay usable',async({page})=>{
    await setup(page);
    const colors=await Promise.all(['present','late','absent'].map(id=>style(page,id,'background-color')));
    expect(new Set(colors).size).toBe(3);
    const supplementalRadius=parseFloat(await style(page,'supplemental-dialog','border-radius'));
    expect(supplementalRadius).toBeGreaterThanOrEqual(16);
    expect(await style(page,'teacher-time','background-image')).toContain('linear-gradient');
  });
  test('mobile remains legible and retains navigation semantics',async({page})=>{
    await setup(page,390);
    expect(await style(page,'active-tab','background-image')).toContain('linear-gradient');
    expect(parseFloat(await style(page,'student-report-filter','border-top-left-radius'))).toBeGreaterThanOrEqual(15);
    const title=page.locator('.attendance-title strong');
    expect(parseFloat(await title.evaluate(el=>getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
    const tabs=page.locator('.attendance-tabs>button');
    await expect(tabs).toHaveCount(7);
  });
});
