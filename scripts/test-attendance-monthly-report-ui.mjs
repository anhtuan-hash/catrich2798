import fs from 'node:fs';
import assert from 'node:assert/strict';

const componentUrl = new URL('../src/components/attendance/AttendanceMonthlyReport.jsx', import.meta.url);
const component = fs.existsSync(componentUrl) ? fs.readFileSync(componentUrl, 'utf8') : '';

assert.ok(component, 'AttendanceMonthlyReport.jsx must exist');
for (const copy of ['Báo cáo điểm danh','Tổng số tiết','Buổi đã hủy','Theo giáo viên','Xuất Excel','Xuất PDF báo cáo']) {
  assert.match(component, new RegExp(copy), `Report UI must contain ${copy}`);
}
assert.match(component, /type="month"/);
assert.match(component, /teacher/i);
assert.match(component, /class/i);
assert.match(component, /downloadAttendanceReportXlsx/);
assert.match(component, /printAttendanceReportPdf/);

console.log('Attendance monthly report UI contract OK');
