import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  isExtraClassScheduledOnDate,
  roomForExtraClass,
  weekdaysForExtraClass,
} from '../src/utils/extraClassSchedule2026.js';

const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const workspaceUrl = new URL('../src/components/attendance/AttendanceClassManagementWorkspace.jsx', import.meta.url);
const editorUrl = new URL('../src/components/attendance/AttendanceClassEditor.jsx', import.meta.url);
const cssUrl = new URL('../src/components/attendance/AttendanceClassEditor.css', import.meta.url);
const rosterCssUrl = new URL('../src/components/attendance/AttendanceClassManagementRosterScroll.css', import.meta.url);
const legacyMigrationUrl = new URL('../supabase/migrations/20260908_attendance_admin_class_member_edit.sql', import.meta.url);
const manageMigrationUrl = new URL('../supabase/migrations/20260909_attendance_manage_class_details_permission.sql', import.meta.url);
const attendance = fs.readFileSync(attendanceUrl, 'utf8');
const workspace = fs.readFileSync(workspaceUrl, 'utf8');
const editor = fs.readFileSync(editorUrl, 'utf8');
const ui = `${attendance}\n${workspace}\n${editor}`;
const css = fs.readFileSync(cssUrl, 'utf8');
const rosterCss = fs.readFileSync(rosterCssUrl, 'utf8');
const legacyMigration = fs.existsSync(legacyMigrationUrl) ? fs.readFileSync(legacyMigrationUrl, 'utf8') : '';
const manageMigration = fs.existsSync(manageMigrationUrl) ? fs.readFileSync(manageMigrationUrl, 'utf8') : '';

assert.equal(
  roomForExtraClass(null),
  '',
  'Empty selected-class state must not crash the global navigation before attendance data loads',
);
assert.deepEqual(
  weekdaysForExtraClass(null),
  [],
  'Empty selected-class state must expose no weekdays instead of dereferencing null',
);
assert.equal(
  isExtraClassScheduledOnDate(null, '2026-09-08'),
  true,
  'An empty/unknown class must remain usable while attendance data is still loading',
);

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

assert.match(attendance, /AttendanceClassManagementWorkspace/,
  'Management view must integrate the dedicated two-step class management workspace');
assert.match(workspace, /AttendanceClassEditor/,
  'Two-step class detail must integrate the dedicated class editor component');
assert.match(ui, /bes_admin_update_extra_class/,
  'Management UI must save class metadata through the existing compatible class RPC');
assert.match(ui, /bes_update_extra_class_member/,
  'Management UI must save member edits through the Manage-authorized member RPC');
assert.match(ui, /Sửa thông tin lớp/,
  'Management UI must expose a class edit action');
assert.match(ui, /Sửa học sinh/,
  'Management UI must expose a student edit action');
assert.match(editor, /canManageMembers\s*&&\s*!editingClass[\s\S]{0,300}Sửa thông tin lớp/,
  'Class editing must be guarded by the Manage-tab capability in the UI');
assert.match(editor, /editingClass\s*&&\s*canManageMembers/,
  'Class edit form must remain available to any granted attendance:manage teacher');
assert.doesNotMatch(editor, /isAdmin\s*&&\s*!editingClass[\s\S]{0,300}Sửa thông tin lớp/,
  'Class editing must no longer be hard-coded to the Admin role');
assert.match(editor, /canManageMembers[\s\S]{0,300}Sửa học sinh/,
  'Student editing must be guarded by Manage-tab capability in the UI');
assert.match(css, /\.attendance-class-info-card/,
  'Class information editing surface must have dedicated styling');
assert.match(css, /\.attendance-member-edit-row/,
  'Member editing row must have dedicated styling');
assert.match(
  workspace,
  /className=\{`attendance-manage-detail-body\$\{editingClass \? ' is-editing-class' : ''\}`\}/,
  'Class edit mode must mark the detail body so the editor can reserve real layout space',
);
assert.match(
  rosterCss,
  /\.attendance-manage-detail-body\.is-editing-class\s*\{[^}]*grid-template-rows:\s*max-content\s+max-content[^}]*align-content:\s*start/s,
  'Class edit mode must stack the editor and roster as natural-height grid rows',
);
assert.match(
  rosterCss,
  /\.attendance-manage-detail-body\.is-editing-class\s*>\s*\.attendance-member-table\.is-mockup\s*\{[^}]*min-height:\s*auto/s,
  'Roster must release its 100% minimum height while the class editor is open',
);
assert.match(
  rosterCss,
  /\.attendance-manage-detail-body\s*>\s*\.attendance-member-table\.is-mockup\s*\{[^}]*min-height:\s*100%/s,
  'Normal class detail mode must retain the full-height roster behavior',
);
assert.doesNotMatch(attendance, /selectedMembers\.length\s*,\s*attendanceDate/,
  'Quick attendance draft must not depend only on roster length because student edits can keep the same count');
assert.match(attendance, /\[selectedClassId,\s*selectedMembers,\s*attendanceDate,\s*daySession\?\.id,\s*dayRecords\]/,
  'Quick attendance draft must refresh when current member metadata changes');

assert.match(legacyMigration, /create or replace function\s+public\.bes_admin_update_extra_class\s*\(/i,
  'Legacy migration must define the compatible class-update RPC');
assert.match(legacyMigration, /create or replace function\s+public\.bes_admin_update_extra_class_member\s*\(/i,
  'Legacy migration must define the Admin member-update RPC');
assert.ok(manageMigration.length > 0,
  'A follow-up migration must align class-detail edits with attendance:manage');
assert.match(manageMigration, /create or replace function\s+public\.bes_admin_update_extra_class\s*\(/i,
  'Manage-permission migration must replace the compatible class-update RPC');
assert.match(manageMigration, /if not public\.can_manage_extra_class_roster\(\)/i,
  'Class RPC must enforce attendance:manage authorization server-side');
assert.doesNotMatch(manageMigration, /Chỉ Admin được sửa thông tin lớp/i,
  'Effective class RPC must no longer enforce an Admin-only role check');
assert.match(legacyMigration, /Chỉ Admin được sửa thông tin học sinh/i,
  'Legacy member RPC must continue enforcing Admin authorization server-side');
assert.match(manageMigration, /update\s+public\.bes_extra_classes/i,
  'Class RPC must update the current class row');
assert.match(legacyMigration, /update\s+public\.bes_extra_class_members/i,
  'Member RPC must update the current member row');
assert.doesNotMatch(manageMigration, /update\s+public\.bes_extra_attendance_sessions/i,
  'Current class edits must never rewrite attendance session snapshots');
assert.doesNotMatch(legacyMigration, /update\s+public\.bes_extra_attendance_records/i,
  'Current member edits must never rewrite attendance record snapshots');
assert.match(legacyMigration, /duplicate|trùng|member_key/i,
  'Member RPC must protect current-roster identity against duplicate active keys');
assert.match(legacyMigration, /v_school_class_name\s+text\s*:=\s*trim\(coalesce\(p_school_class_name,\s*''\)\)/i,
  'Member RPC must preserve internal school-class whitespace so server member_key normalization matches frontend behavior');
assert.match(
  legacyMigration,
  /revoke all on function public\.bes_extra_member_key\(text,text,text\) from public,\s*anon,\s*authenticated;/i,
  'Internal member-key helper must not remain executable through Supabase client roles',
);
assert.match(
  manageMigration,
  /revoke all on function public\.bes_admin_update_extra_class\(uuid,text,text,integer,text,text,integer\[\]\) from public;/i,
  'Class update RPC must revoke PUBLIC execution',
);
assert.match(
  manageMigration,
  /revoke all on function public\.bes_admin_update_extra_class\(uuid,text,text,integer,text,text,integer\[\]\) from anon;/i,
  'Class update RPC must revoke anonymous execution',
);
assert.match(
  manageMigration,
  /grant execute on function public\.bes_admin_update_extra_class\(uuid,text,text,integer,text,text,integer\[\]\) to authenticated;/i,
  'Signed-in users must receive the class RPC entry point, with attendance:manage authorization enforced inside the RPC',
);
assert.match(
  legacyMigration,
  /revoke all on function public\.bes_admin_update_extra_class_member\(uuid,uuid,text,text,text\) from public,\s*anon,\s*authenticated;/i,
  'Legacy member update RPC must explicitly revoke default anon/authenticated grants before least-privilege grant',
);
assert.match(
  legacyMigration,
  /grant execute on function public\.bes_admin_update_extra_class_member\(uuid,uuid,text,text,text\) to authenticated;/i,
  'Signed-in users must receive the legacy member RPC entry point, with Admin authorization still enforced inside the RPC',
);

console.log('Attendance class edit sync contract OK');