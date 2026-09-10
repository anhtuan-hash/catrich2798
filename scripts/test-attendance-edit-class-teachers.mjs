import assert from 'node:assert/strict';
import fs from 'node:fs';

const editorPath = 'src/components/attendance/AttendanceClassEditor.jsx';
const workspacePath = 'src/components/attendance/AttendanceClassManagementWorkspace.jsx';
const globalPath = 'src/components/GlobalAttendanceNavigationTab.jsx';
const migrationPath = 'supabase/migrations/20260910163500_attendance_edit_class_teachers.sql';

const editor = fs.readFileSync(editorPath, 'utf8');
const workspace = fs.readFileSync(workspacePath, 'utf8');
const globalAttendance = fs.readFileSync(globalPath, 'utf8');

assert.match(
  editor,
  /teacherNames\s*=\s*\[\]/,
  'AttendanceClassEditor must receive the current normalized teacher list.',
);
assert.match(
  editor,
  /teacher_names:\s*normalizeTeacherNames\(teacherNames\)/,
  'Class edit state must initialize teacher_names from the current assignment list.',
);
assert.match(
  editor,
  /Giáo viên dạy lớp\s*\*/,
  'The class edit form must expose an explicit required teacher editor.',
);
assert.match(
  editor,
  /p_teacher_names:\s*classForm\.teacher_names/,
  'Saving class information must submit the complete teacher assignment list.',
);
assert.match(
  editor,
  /classForm\.teacher_names\.length\s*===\s*0/,
  'The UI must prevent saving a class without an assigned teacher.',
);
assert.match(
  workspace,
  /teacherNames=\{selectedAssignedTeachers\}/,
  'The management workspace must pass the selected class normalized teacher list into the editor.',
);
assert.match(
  globalAttendance,
  /const authoritative = normalized\.length\s*\?\s*\[\]\s*:\s*teachersForGiftedAssignment/,
  'Normalized teacher rows must override the static gifted catalog so removed teachers cannot reappear.',
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  'A migration must atomically update class metadata and normalized teacher assignments.',
);
const migration = fs.readFileSync(migrationPath, 'utf8');
assert.match(migration, /p_teacher_names\s+text\[\]/, 'The update RPC must accept the full teacher list.');
assert.match(migration, /can_manage_extra_class_roster\(\)/, 'Teacher changes must use the Quản lý lớp permission gate.');
assert.match(migration, /delete\s+from\s+public\.bes_extra_class_teachers/i, 'Removed teachers must be deleted from the normalized assignment table.');
assert.match(migration, /insert\s+into\s+public\.bes_extra_class_teachers/i, 'New teachers must be persisted to the normalized assignment table.');
assert.match(migration, /teacher_name\s*=\s*array_to_string\(v_teacher_names,\s*', '\)/, 'The class teacher_name cache must be synchronized with the normalized list.');
assert.match(migration, /can_manage_extra_class_roster\(\)[\s\S]*p_teacher_names/i, 'The RPC must keep teacher replacement behind the roster-management authorization path.');

console.log('Attendance class teacher editing contract: PASS');
