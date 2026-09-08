import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const cssUrl = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);
const reportCssUrl = new URL('../src/components/attendance/AttendanceMonthlyReport.css', import.meta.url);
const navCssUrl = new URL('../src/components/GlobalAttendanceNavigationTab.css', import.meta.url);
const calendarCssUrl = new URL('../src/components/GlobalAttendanceDailyCalendar.css', import.meta.url);
const css = fs.existsSync(cssUrl) ? fs.readFileSync(cssUrl, 'utf8') : '';
const reportCss = fs.existsSync(reportCssUrl) ? fs.readFileSync(reportCssUrl, 'utf8') : '';
const navCss = fs.existsSync(navCssUrl) ? fs.readFileSync(navCssUrl, 'utf8') : '';
const calendarCss = fs.existsSync(calendarCssUrl) ? fs.readFileSync(calendarCssUrl, 'utf8') : '';
const workspaceCss = `${css}\n${navCss}\n${calendarCss}`;

assert.doesNotMatch(attendance, /Mỗi lớp chỉ chốt một lần mỗi ngày · giờ xác nhận lưu theo máy chủ/);
assert.match(attendance, /Báo cáo/);
assert.match(attendance, /1,5 tiết/);
assert.match(attendance, /Hủy buổi học/);
assert.match(attendance, /Đã điểm danh/);
assert.match(attendance, /Đã hủy/);
assert.match(attendance, /0 tiết/);
assert.ok(css, 'Attendance Material 3 stylesheet must exist');
assert.match(css, /--att-m3-primary/);
assert.match(css, /--att-m3-success/);
assert.match(css, /--att-m3-warning/);
assert.match(css, /--att-m3-purple/);
assert.match(css, /--att-m3-cyan/);
assert.ok(reportCss, 'Attendance monthly report stylesheet must exist');
assert.match(reportCss, /\.att-report-m3\s*\{[^}]*min-height\s*:\s*0[^}]*overflow-y\s*:\s*auto/i,
  'Monthly report must own a vertical scroll viewport so long reports are not clipped by attendance-content overflow:hidden');

assert.match(
  workspaceCss,
  /\.attendance-calendar-layout\s*\{[^}]*gap\s*:\s*(?:8|9|10|11|12|13|14|15|16)px/i,
  'Calendar layout must use visible spacing between toolbar, weekday strip, and day-card grid',
);
assert.match(
  workspaceCss,
  /\.attendance-calendar-grid\s*\{[^}]*gap\s*:\s*(?:6|7|8|9|10|11|12)px/i,
  'Calendar grid must separate day cards with a visible gap',
);
assert.match(
  workspaceCss,
  /\.attendance-calendar-grid\s*\{[^}]*border\s*:\s*0(?:\s*!important)?/i,
  'Calendar grid must not use a fused outer border around touching cells',
);
assert.match(
  workspaceCss,
  /\.attendance-calendar-day\s*\{[^}]*border-radius\s*:\s*(?:12|13|14|15|16|17|18)px/i,
  'Calendar days must render as independent rounded cards',
);
assert.match(
  workspaceCss,
  /\.attendance-management-grid\s*\{[^}]*gap\s*:\s*(?:8|9|10|11|12|13|14|15|16)px/i,
  'Class management panels must be separated by a visible gap',
);
assert.match(
  workspaceCss,
  /\.attendance-history-layout\s*\{[^}]*gap\s*:\s*(?:8|9|10|11|12|13|14|15|16)px/i,
  'History list and detail panels must be separated by a visible gap',
);

console.log('Attendance Material 3 UI contract OK');