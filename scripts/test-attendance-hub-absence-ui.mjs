import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const utility = fs.readFileSync(new URL('../src/utils/extraClassAttendance.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url), 'utf8');

assert.match(attendance, /Tìm nhanh lớp/i, 'Quick attendance must provide a fast class search');
for (const label of ['Tất cả', 'Toán', 'Toán/Casio', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí']) {
  assert.match(attendance, new RegExp(label), `Subject hub must include ${label}`);
}
for (const label of ['Có phép', 'Không phép', 'Ốm', 'Việc gia đình', 'Khác']) {
  assert.match(attendance, new RegExp(label), `Absence reason UI must include ${label}`);
}
assert.match(attendance, /Phòng học/);
assert.match(attendance, /Thời gian dạy/);
assert.match(attendance, /p_absence_details/);
assert.match(attendance, /p_teaching_room/);
assert.match(attendance, /p_teaching_time_range/);
assert.match(attendance, /absence_reason_code/);
assert.match(attendance, /absence_note/);
assert.match(utility, /ABSENCE_REASON_OPTIONS/);
assert.match(utility, /attendanceSubjectKey/);
assert.match(utility, /absence_reason_code:\s*''/);
assert.match(utility, /absence_note:\s*''/);
for (const token of ['is-subject-math', 'is-subject-casio', 'is-subject-literature', 'is-subject-english', 'is-subject-physics', 'is-subject-chemistry', 'is-subject-biology', 'is-subject-history', 'is-subject-geography']) {
  assert.match(css, new RegExp(token), `Material 3 CSS must define ${token}`);
}

console.log('Attendance class hub, subject colors, room/time and absence UI contract OK');
