import fs from 'node:fs';
import assert from 'node:assert/strict';

const componentUrl = new URL('../src/components/attendance/AttendanceMonthlyReport.jsx', import.meta.url);
const cssUrl = new URL('../src/components/attendance/AttendanceMonthlyReport.css', import.meta.url);
const component = fs.existsSync(componentUrl) ? fs.readFileSync(componentUrl, 'utf8') : '';
const css = fs.existsSync(cssUrl) ? fs.readFileSync(cssUrl, 'utf8') : '';

assert.ok(component, 'AttendanceMonthlyReport.jsx must exist');
assert.ok(css, 'AttendanceMonthlyReport.css must exist');
for (const copy of [
  'Báo cáo điểm danh', 'Tổng số tiết', 'Buổi đã hủy', 'Theo giáo viên',
  'Theo tháng', 'Theo ngày', 'Người báo cáo', 'Chức vụ', 'Nhận xét chung',
  'Chi tiết học sinh vắng', 'Phòng học', 'Giờ dạy', 'Giờ chốt',
  'Xuất Excel', 'Xuất PDF báo cáo', 'Sắp xếp theo',
]) {
  assert.match(component, new RegExp(copy), `Report UI must contain ${copy}`);
}
assert.match(component, /type="month"/);
assert.match(component, /type="date"/);
assert.match(component, /reporterName/);
assert.match(component, /reporterTitle/);
assert.match(component, /generalRemarks/);
assert.match(component, /buildAttendanceReport/);
assert.match(component, /teaching_room/);
assert.match(component, /teaching_time_range/);
assert.match(component, /absence_reason_code/);
assert.match(component, /absence_note/);
assert.match(component, /downloadAttendanceReportXlsx/);
assert.match(component, /printAttendanceReportPdf/);

// Approved report dashboard mockup: source-first React structure, no runtime overlay.
assert.match(component, /att-report-m3__hero-icon/, 'Report title must have a dedicated visual hero icon.');
assert.match(component, /att-report-m3__metric-icon/, 'Each KPI card must expose a dedicated icon treatment.');
assert.match(component, /att-report-m3__teacher-track/, 'Teacher summaries must render in one horizontal track.');
assert.doesNotMatch(component, /att-report-m3__teacher-grid/, 'Legacy multi-row teacher grid must be retired.');
assert.match(component, /teacherTrackRef/, 'Teacher track must expose a React ref for arrow scrolling.');
assert.match(component, /scrollTeacherTrack/, 'Teacher arrows must scroll the horizontal teacher track.');
assert.match(component, /aria-label="Giáo viên trước"/, 'Teacher strip must have a previous arrow control.');
assert.match(component, /aria-label="Giáo viên tiếp theo"/, 'Teacher strip must have a next arrow control.');
assert.match(component, /att-report-m3__teacher-avatar/, 'Teacher cards must show avatar initials.');
assert.match(component, /att-report-m3__teacher-progress/, 'Teacher cards must show attendance progress.');
assert.match(component, /teacherSort/, 'Teacher strip must support deterministic sorting.');

assert.match(css, /\.att-report-m3__teacher-track\s*\{[^}]*display\s*:\s*flex[^}]*overflow-x\s*:\s*auto[^}]*scroll-snap-type\s*:\s*x\s+mandatory/s, 'Teacher strip must be a horizontal scroll-snap track.');
assert.match(css, /\.att-report-m3__teacher-card\s*\{[^}]*flex\s*:\s*0\s+0[^}]*scroll-snap-align\s*:\s*start/s, 'Teacher cards must keep a fixed horizontal footprint and snap.');
assert.match(css, /\.att-report-m3__teacher-progress\s*\{/, 'Teacher attendance progress styling must exist.');
assert.match(css, /\.att-report-m3__table-wrap\s+thead\s*\{[^}]*position\s*:\s*sticky/s, 'Report table headers must remain visible while a table scrolls.');
assert.match(css, /scrollbar-gutter\s*:\s*stable/, 'Report scroll surfaces must reserve stable scrollbar space.');

console.log('Attendance day/month report dashboard contract OK');