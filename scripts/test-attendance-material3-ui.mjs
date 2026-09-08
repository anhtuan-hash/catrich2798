import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const cssUrl = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);
const reportCssUrl = new URL('../src/components/attendance/AttendanceMonthlyReport.css', import.meta.url);
const css = fs.existsSync(cssUrl) ? fs.readFileSync(cssUrl, 'utf8') : '';
const reportCss = fs.existsSync(reportCssUrl) ? fs.readFileSync(reportCssUrl, 'utf8') : '';

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

console.log('Attendance Material 3 UI contract OK');