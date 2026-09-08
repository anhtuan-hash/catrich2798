import fs from 'node:fs';
import assert from 'node:assert/strict';

const flatNav = fs.readFileSync(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const utility = fs.readFileSync(new URL('../src/utils/extraClassAttendance.js', import.meta.url), 'utf8');
const sql = fs.readFileSync(new URL('../supabase/extra-class-attendance.sql', import.meta.url), 'utf8');

assert.match(flatNav, /GlobalTtcmNavigationTab[\s\S]*GlobalAttendanceNavigationTab/, 'Attendance must mount immediately after TTCM');
assert.match(attendance, /Điểm danh nhanh/, 'Attendance workspace needs a quick attendance tab');
assert.match(attendance, /Quản lý lớp/, 'Attendance workspace needs a class management tab');
assert.match(attendance, /Lịch sử/, 'Attendance workspace needs a history tab');
assert.match(attendance, /Thêm học sinh/, 'Admin must be able to add students manually');
assert.match(attendance, /Xóa khỏi lớp/, 'Admin must be able to remove students manually');
assert.match(attendance, /readSheet/, 'Excel import must use the existing read-excel-file browser reader');
assert.match(utility, /parseExtraClassRosterRows/, 'Roster parser must live in the focused attendance utility');
assert.match(utility, /buildAttendanceDraft/, 'Attendance draft logic must be explicit and testable');
assert.match(sql, /bes_extra_class_members/, 'Membership lifecycle table must exist');
assert.match(sql, /left_at timestamptz/, 'Membership removal must keep a left_at timestamp');
assert.match(sql, /removed_by uuid/, 'Membership removal must preserve the actor');
assert.match(sql, /bes_confirm_extra_class_attendance/, 'Attendance confirmation must be transactional on the server');
assert.match(sql, /clock_timestamp\(\)/, 'Attendance time must come from the database server');
assert.match(sql, /bes_extra_attendance_records/, 'Immutable per-student attendance records must exist');
assert.match(sql, /student_full_name text not null/, 'Attendance records must snapshot the student name');

const mod = await import('../src/utils/extraClassAttendance.js');
assert.equal(mod.normalizeExtraClassType('Phụ đạo'), 'remedial');
assert.equal(mod.normalizeExtraClassType('Bồi dưỡng HSG'), 'gifted');
const draft = mod.buildAttendanceDraft([
  { id: 'm1', member_key: 'a', full_name: 'A' },
  { id: 'm2', member_key: 'b', full_name: 'B' },
]);
assert.deepEqual(mod.attendanceSummary(draft), { total: 2, present: 2, absent: 0 });
const absentDraft = draft.map((item) => item.member_key === 'b' ? { ...item, present: false } : item);
assert.deepEqual(mod.attendanceSummary(absentDraft), { total: 2, present: 1, absent: 1 });

console.log('Extra class attendance contract OK');
