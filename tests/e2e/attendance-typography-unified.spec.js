import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const files=[
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
  'src/components/attendance/AttendanceTypography.css',
  'src/components/attendance/AttendanceTypographyViews.css',
];
const stylesheet=files.map(file=>readFileSync(file,'utf8')).join('\n');
const html=[
  '<section class="attendance-shell" style="width:100%;max-width:100%">',
  '<header class="attendance-topbar"><div class="attendance-title"><div><small>QUẢN LÝ CHUYÊN CẦN</small><strong>Điểm danh</strong></div></div></header>',
  '<nav class="attendance-tabs"><button data-testid="tab">Lịch điểm danh</button><button>Quản lý lớp</button><button>Lịch sử</button><button>Học bổ sung</button><button>Báo cáo</button><button>Kho lưu trữ</button><button>Giờ GV</button></nav>',
  '<main class="attendance-content">',
  '<div class="attendance-class-list"><div><button><b data-testid="class-name">Phụ đạo Toán 10</b><small data-testid="class-description">Khối 10</small><time>16:45</time></button></div></div>',
  '<div class="attendance-roster"><div class="attendance-roster-head" data-testid="roster-label">DANH SÁCH HỌC SINH</div></div>',
  '<div class="attendance-manage-overview"><div class="attendance-manage-result-count" data-testid="manage-count">Số lớp phù hợp</div><div class="attendance-manage-detail-roster-toolbar"><button data-testid="manage-button">Thêm học sinh</button></div></div>',
  '<div class="ahv3__shell"><div class="ahv3__list"><div class="ahv3__list-head"><div class="ahv3__date-filters"><label><span data-testid="history-label">Từ ngày</span><input data-testid="history-date" type="date"></label></div></div><div class="ahv3__card-title"><b data-testid="history-title">Buổi đã chốt</b></div></div></div>',
  '<div class="attendance-daily-overview"><div class="attendance-daily-table-header" data-testid="calendar-header">LỚP / GIÁO VIÊN</div><div class="attendance-daily-class-row__status" data-testid="calendar-status">Đã điểm danh</div></div>',
  '<div class="att-report-m3"><div class="att-report-m3__filters"><label><span data-testid="teacher-filter-label">THÁNG</span><input data-testid="teacher-filter" type="month"></label></div><div class="att-report-m3__export"><button data-testid="teacher-export">Xuất PDF báo cáo</button></div><table><thead><tr><th data-testid="teacher-th">Ngày</th></tr></thead><tbody><tr><td data-testid="teacher-td">01/10/2026</td></tr></tbody></table><div class="att-report-m3__metrics"><article><div><b data-testid="teacher-kpi">242</b><span>Tổng tiết</span></div></article></div></div>',
  '<div class="stud-att"><div class="stud-att__filters"><label data-testid="student-filter-label">Lớp học<select data-testid="student-filter"><option>Tất cả</option></select></label></div><div class="stud-att__metrics"><article class="stud-att__metric--students"><div class="stud-att__metric-value"><strong data-testid="student-kpi">27</strong><span data-testid="student-kpi-label">Học sinh</span></div></article></div><table><thead><tr><th>Học sinh</th></tr></thead><tbody><tr><td data-testid="student-td">Nguyễn Văn A</td></tr></tbody></table></div>',
  '<div class="attendance-archive"><div class="attendance-archive__hero"><h2>Kho lưu trữ</h2></div><div class="attendance-archive__stats"><strong data-testid="archive-kpi">12</strong><span data-testid="archive-label">Bản ghi</span></div></div>',
  '</main></section>',
  '<section class="bes-supplemental-dialog" data-testid="supplemental"><header class="bes-supplemental-dialog-head"><h2 data-testid="supplemental-heading">Học bổ sung</h2></header><div class="bes-supplemental-report-tools"><label data-testid="supplemental-label">Tìm học sinh<input data-testid="supplemental-input" placeholder="Tên học sinh"></label></div></section>',
].join('');

async function setup(page,width=1440){
  await page.setViewportSize({width,height:960});
  await page.setContent(html);
  await page.addStyleTag({content:stylesheet});
}
async function fontSize(page,id){
  return page.getByTestId(id).evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
}

test.describe('Attendance uniform type scale across all tabs',()=>{
  test('desktop content, controls, labels and metrics',async({page})=>{
    await setup(page);
    for(const id of ['tab','manage-button','history-date','teacher-export','teacher-filter','student-filter','supplemental-input']) {
      expect(await fontSize(page,id),id).toBe(13);
    }
    for(const id of ['class-description','roster-label','manage-count','history-label','calendar-header','calendar-status','teacher-filter-label','student-filter-label','student-kpi-label','archive-label','supplemental-label']) {
      expect(await fontSize(page,id),id).toBe(12);
    }
    for(const id of ['teacher-th','teacher-td','student-td','history-title']) {
      expect(await fontSize(page,id),id).toBe(13);
    }
    expect(await fontSize(page,'class-name')).toBe(14);
    expect(await fontSize(page,'teacher-kpi')).toBe(26);
    expect(await fontSize(page,'student-kpi')).toBe(26);
    expect(await fontSize(page,'supplemental-heading')).toBe(21);
  });
  test('mobile controls avoid Safari zoom and remain legible',async({page})=>{
    await setup(page,390);
    for(const id of ['history-date','teacher-filter','student-filter','supplemental-input']) {
      expect(await fontSize(page,id),id).toBe(16);
    }
    expect(await fontSize(page,'tab')).toBe(14);
    expect(await fontSize(page,'teacher-th')).toBe(14);
    expect(await fontSize(page,'student-td')).toBe(14);
    expect(await fontSize(page,'student-kpi')).toBe(25);
    expect(await fontSize(page,'supplemental-heading')).toBe(22);
  });
});
