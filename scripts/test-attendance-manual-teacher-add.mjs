import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const managementWorkspace = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassManagementWorkspace.jsx', import.meta.url), 'utf8');
const managementUi = `${attendance}\n${managementWorkspace}`;
const migrationUrl = new URL('../supabase/migrations/20260908_add_manual_extra_class_teacher.sql', import.meta.url);
const migration = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';

assert.doesNotMatch(managementUi, /Không lấy từ tài khoản đăng ký trên website\.?/, 'Obsolete website-account explanatory copy must be removed');
assert.match(managementUi, /Thêm giáo viên/, 'Class management must expose a manual add-teacher control');
assert.match(attendance, /bes_add_extra_class_teacher/, 'Class management must persist a manual teacher through the guarded RPC');
assert.match(attendance, /classTeacherNames/, 'Manual teachers must participate in the normalized teacher list used by attendance');
assert.match(attendance, /const authoritative = normalized\.length\s*\?\s*\[\]\s*:\s*teachersForGiftedAssignment/, 'Persisted normalized teacher assignments must override the static catalog after a class has been edited');
assert.match(attendance, /const fallback = normalized\.length\s*\?\s*\[\]\s*:\s*String\(classRow\?\.teacher_name/, 'Cached class teacher names must only be a fallback when normalized assignments do not exist');
assert.match(attendance, /\[\.\.\.normalized,\s*\.\.\.authoritative,\s*\.\.\.fallback\]/, 'Attendance teacher options must prefer normalized assignments and only fall back to catalog/cached names');

assert.ok(migration, 'Manual teacher migration must exist');
assert.match(migration, /bes_add_extra_class_teacher\s*\(/i, 'Migration must define the add-teacher RPC');
assert.match(migration, /can_manage_extra_class_attendance\(\)/i, 'RPC must enforce Admin attendance permission');
assert.match(migration, /bes_extra_class_teachers/i, 'RPC must persist the teacher in normalized class assignments');
assert.match(migration, /lower\s*\(\s*trim\s*\(\s*teacher_name\s*\)\s*\)/i, 'RPC must reject duplicate teacher names case-insensitively within a class');
assert.match(migration, /from\s+anon/i, 'Anonymous users must be explicitly denied RPC execution');
assert.match(migration, /to\s+authenticated/i, 'Authenticated users must receive RPC execute grant');

console.log('Manual attendance teacher addition contract OK');