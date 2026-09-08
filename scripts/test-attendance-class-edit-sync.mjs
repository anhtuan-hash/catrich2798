import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  isExtraClassScheduledOnDate,
  roomForExtraClass,
} from '../src/utils/extraClassSchedule2026.js';

const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const cssUrl = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260908_attendance_admin_class_member_edit.sql', import.meta.url);
const attendance = fs.readFileSync(attendanceUrl, 'utf8');
const css = fs.readFileSync(cssUrl, 'utf8');
const migration = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';

assert.equal(
  isExtraClassScheduledOnDate({ class_type: 'remedial', subject: 'Anh', grade_level: 10, weekdays: [1] }, '2026-09-07'),
  true,
  'Persisted weekdays must override the catalog schedule',
);
assert.equal(
  isExtraClassScheduledOnDate({ class_type: 'remedial', subject: 'Anh', grade_level: 10, weekdays: [1] }, '2026-09-08'),
  false,
  'Persisted weekdays must decide off-schedule state even when catalog says Tuesday',
);
assert.equal(
  roomForExtraClass({ class_type: 'remedial', subject: 'Anh', grade_level: 10, room: 'B205' }),
  'B205',
  'Persisted room must override the catalog room',
);

assert.match(attendance, /bes_admin_update_extra_class/,
  'Management UI must save class metadata through the Admin-only class RPC');
assert.match(attendance, /bes_admin_update_extra_class_member/,
  'Management UI must save member edits through the Admin-only member RPC');
assert.match(attendance, /Sửa thông tin lớp/,
  'Management UI must expose a class edit action');
assert.match(attendance, /Sửa học sinh/,
  'Management UI must expose a student edit action');
assert.match(attendance, /isAttendanceAdmin[\s\S]{0,500}Sửa thông tin lớp/,
  'Class editing must be guarded by the Admin role in the UI');
assert.match(attendance, /isAttendanceAdmin[\s\S]{0,900}Sửa học sinh/,
  'Student editing must be guarded by the Admin role in the UI');
assert.match(css, /\.attendance-class-info-card/,
  'Class information editing surface must have dedicated styling');
assert.match(css, /\.attendance-member-edit-row/,
  'Member editing row must have dedicated styling');

assert.match(migration, /create or replace function\s+public\.bes_admin_update_extra_class\s*\(/i,
  'Migration must define the Admin class-update RPC');
assert.match(migration, /create or replace function\s+public\.bes_admin_update_extra_class_member\s*\(/i,
  'Migration must define the Admin member-update RPC');
assert.match(migration, /Chỉ Admin được sửa thông tin lớp/i,
  'Class RPC must enforce Admin authorization server-side');
assert.match(migration, /Chỉ Admin được sửa thông tin học sinh/i,
  'Member RPC must enforce Admin authorization server-side');
assert.match(migration, /update\s+public\.bes_extra_classes/i,
  'Class RPC must update the current class row');
assert.match(migration, /update\s+public\.bes_extra_class_members/i,
  'Member RPC must update the current member row');
assert.doesNotMatch(migration, /update\s+public\.bes_extra_attendance_sessions/i,
  'Current class edits must never rewrite attendance session snapshots');
assert.doesNotMatch(migration, /update\s+public\.bes_extra_attendance_records/i,
  'Current member edits must never rewrite attendance record snapshots');
assert.match(migration, /duplicate|trùng|member_key/i,
  'Member RPC must protect current-roster identity against duplicate active keys');

console.log('Attendance class edit sync contract OK');
