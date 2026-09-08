import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const migrationUrl = new URL('../supabase/migrations/20260908_add_manual_extra_class_teacher.sql', import.meta.url);
const migration = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';

assert.doesNotMatch(attendance, /Không lấy từ tài khoản đăng ký trên website\.?/, 'Obsolete website-account explanatory copy must be removed');
assert.match(attendance, /Thêm giáo viên/, 'Class management must expose a manual add-teacher control');
assert.match(attendance, /bes_add_extra_class_teacher/, 'Class management must persist a manual teacher through the guarded RPC');
assert.match(attendance, /classTeacherNames/, 'Manual teachers must participate in the normalized teacher list used by attendance');
assert.doesNotMatch(attendance, /if\s*\(authoritative\.length\)\s*return\s+authoritative/, 'Authoritative catalog teachers must be merged with normalized manual teachers, not short-circuit them');
assert.match(attendance, /\[\.\.\.authoritative,\s*\.\.\.normalized,\s*\.\.\.fallback\]/, 'Attendance teacher options must merge catalog, normalized manual teachers, and fallback names');

assert.ok(migration, 'Manual teacher migration must exist');
assert.match(migration, /bes_add_extra_class_teacher\s*\(/i, 'Migration must define the add-teacher RPC');
assert.match(migration, /can_manage_extra_class_attendance\(\)/i, 'RPC must enforce Admin attendance permission');
assert.match(migration, /bes_extra_class_teachers/i, 'RPC must persist the teacher in normalized class assignments');
assert.match(migration, /lower\s*\(\s*trim\s*\(\s*teacher_name\s*\)\s*\)/i, 'RPC must reject duplicate teacher names case-insensitively within a class');
assert.match(migration, /from\s+anon/i, 'Anonymous users must be explicitly denied RPC execution');
assert.match(migration, /to\s+authenticated/i, 'Authenticated users must receive RPC execute grant');

console.log('Manual attendance teacher addition contract OK');
