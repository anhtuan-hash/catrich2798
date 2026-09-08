import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  isExtraClassScheduledOnDate,
  roomForExtraClass,
  weekdaysForExtraClass,
} from '../src/utils/extraClassSchedule2026.js';

const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const editorUrl = new URL('../src/components/attendance/AttendanceClassEditor.jsx', import.meta.url);
const cssUrl = new URL('../src/components/attendance/AttendanceClassEditor.css', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260908_attendance_admin_class_member_edit.sql', import.meta.url);
const attendance = fs.readFileSync(attendanceUrl, 'utf8');
const editor = fs.readFileSync(editorUrl, 'utf8');
const ui = `${attendance}\n${editor}`;
const css = fs.readFileSync(cssUrl, 'utf8');
const migration = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';

assert.equal(
  isExtraClassScheduledOnDate({ class_type: 'remedial', subject: 'Anh', grade_level: 10, weekdays: [1] }, '2026-09-07'),
  true,
  'In-memory JS weekday arrays must override the catalog schedule',
);
assert.equal(
  isExtraClassScheduledOnDate({ class_type: 'remedial', subject: 'Anh', grade_level: 10, weekdays: [1] }, '2026-09-08'),
  false,
  'In-memory JS weekday arrays must decide off-schedule state',
);
assert.equal(
  isExtraClassScheduledOnDate({ class_type: 'gifted', subject: 'Anh', grade_level: 12, weekdays: '2,3' }, '2026-09-07'),
  true,
  'Persisted text weekday 2 must mean Thứ 2 / Monday, matching the existing database format',
);
assert.equal(
  isExtraClassScheduledOnDate({ class_type: 'gifted', subject: 'Anh', grade_level: 12, weekdays: '2,3' }, '2026-09-08'),
  true,
  'Persisted text weekday 3 must mean Thứ 3 / Tuesday, matching the existing database format',
);
assert.equal(
  isExtraClassScheduledOnDate({ class_type: 'gifted', subject: 'Anh', grade_level: 12, weekdays: '2,3' }, '2026-09-09'),
  false,
  'Persisted school weekday text must not be interpreted as raw JS indexes',
);
assert.deepEqual(
  weekdaysForExtraClass({ class_type: 'gifted', subject: 'Anh', grade_level: 12, weekdays: '2,3' }),
  [1, 2],
  'Editor must receive normalized JS weekday indexes from persisted school notation',
);
assert.equal(
  roomForExtraClass({ class_type: 'remedial', subject: 'Anh', grade_level: 10, room: 'B205' }),
  'B205',
  'Persisted room must override the catalog room',
);

assert.match(attendance, /AttendanceClassEditor/,
  'Management view must integrate the dedicated class editor component');
assert.match(ui, /bes_admin_update_extra_class/,
  'Management UI must save class metadata through the Admin-only class RPC');
assert.match(ui, /bes_admin_update_extra_class_member/,
  'Management UI must save member edits through the Admin-only member RPC');
assert.match(ui, /Sửa thông tin lớp/,
  'Management UI must expose a class edit action');
assert.match(ui, /Sửa học sinh/,
  'Management UI must expose a student edit action');
assert.match(editor, /isAdmin\s*&&\s*!editingClass[\s\S]{0,300}Sửa thông tin lớp/,
  'Class editing must be guarded by the Admin role in the UI');
assert.match(editor, /member\.active\s*!==\s*false\s*&&\s*isAdmin[\s\S]{0,300}Sửa học sinh/,
  'Student editing must be guarded by the Admin role in the UI');
assert.match(css, /\.attendance-class-info-card/,
  'Class information editing surface must have dedicated styling');
assert.match(css, /\.attendance-member-edit-row/,
  'Member editing row must have dedicated styling');
assert.doesNotMatch(attendance, /selectedMembers\.length\s*,\s*attendanceDate/,
  'Quick attendance draft must not depend only on roster length because student edits can keep the same count');
assert.match(attendance, /\[selectedClassId,\s*selectedMembers,\s*attendanceDate,\s*daySession\?\.id,\s*dayRecords\]/,
  'Quick attendance draft must refresh when current member metadata changes');

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
assert.match(migration, /v_school_class_name\s+text\s*:=\s*trim\(coalesce\(p_school_class_name,\s*''\)\)/i,
  'Member RPC must preserve internal school-class whitespace so server member_key normalization matches frontend behavior');

console.log('Attendance class edit sync contract OK');
