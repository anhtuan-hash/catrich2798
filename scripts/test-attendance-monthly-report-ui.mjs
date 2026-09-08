import fs from 'node:fs';
import assert from 'node:assert/strict';

const componentUrl = new URL('../src/components/attendance/AttendanceMonthlyReport.jsx', import.meta.url);
const component = fs.existsSync(componentUrl) ? fs.readFileSync(componentUrl, 'utf8') : '';

assert.ok(component, 'AttendanceMonthlyReport.jsx must exist');
for (const copy of [
  'Báo cáo điểm danh', 'Tổng số tiết', 'Buổi đã hủy', 'Theo giáo viên',
  'Theo tháng', 'Theo ngày', 'Người báo cáo', 'Chức vụ', 'Nhận xét chung',
  'Chi tiết học sinh vắng', 'Phòng học', 'Giờ dạy', 'Giờ chốt',
  'Xuất Excel', 'Xuất PDF báo cáo',
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

console.log('Attendance day/month report UI contract OK');
