import fs from 'node:fs';
import assert from 'node:assert/strict';

const permissionsUrl = new URL('../src/utils/permissions.js', import.meta.url);
const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const bridgeUrl = new URL('../src/components/GlobalAttendanceAdminPersistenceBridge.jsx', import.meta.url);
const workspaceUrl = new URL('../src/components/attendance/AttendanceClassManagementWorkspace.jsx', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260914120000_attendance_report_class_creation.sql', import.meta.url);

const permissions = await import(permissionsUrl);
const {
  ATTENDANCE_PERMISSION_IDS,
  createCustomPermissions,
  hasAttendanceTabAccess,
} = permissions;

const reportOnly = {
  id: 'teacher-report-create',
  role: 'teacher',
  permissions: createCustomPermissions([ATTENDANCE_PERMISSION_IDS.report]),
};
assert.equal(hasAttendanceTabAccess(reportOnly, 'report'), true, 'Fixture must have Attendance report access');
assert.equal(hasAttendanceTabAccess(reportOnly, 'manage'), false, 'Report access must not silently become attendance:manage');

const attendanceSource = fs.readFileSync(attendanceUrl, 'utf8');
const bridgeSource = fs.readFileSync(bridgeUrl, 'utf8');
const workspaceSource = fs.readFileSync(workspaceUrl, 'utf8');
const migrationSource = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';

assert.match(
  bridgeSource,
  /hasAttendanceTabAccess\(currentUser,\s*['"]report['"]\)/,
  'Manual Tạo lớp mới bridge must recognize attendance:report',
);
assert.match(
  bridgeSource,
  /hasAttendanceTabAccess\(currentUser,\s*['"]manage['"]\)/,
  'Existing attendance:manage creation capability must remain available',
);
assert.match(
  bridgeSource,
  /bes_create_extra_class_with_teachers/,
  'Manual creation must keep using the transactional create RPC',
);

assert.match(attendanceSource, /const canCreateExtraClasses\s*=/, 'Attendance UI must derive a dedicated class-create capability');
assert.match(attendanceSource, /canCreateExtraClasses[\s\S]{0,260}hasAttendanceTabAccess\(currentUser,\s*['"]report['"]\)/, 'Class-create capability must include report access');
assert.match(attendanceSource, /const canOpenClassManagement\s*=\s*canAccessAttendanceView\(['"]manage['"]\)\s*\|\|\s*canCreateExtraClasses/, 'Report creators must be able to open the Manage surface without receiving manage permission');
assert.match(attendanceSource, /item\.tab\s*===\s*['"]manage['"][\s\S]{0,120}canOpenClassManagement/, 'Manage navigation entry must be available to create-capable report users');
assert.match(attendanceSource, /canCreateClasses=\{canCreateExtraClasses\}/, 'Workspace must receive create capability separately');
assert.match(attendanceSource, /canManageMembers=\{canAccessAttendanceView\(['"]manage['"]\)\}/, 'Existing-class mutations must remain tied to attendance:manage');
assert.match(attendanceSource, /bes_create_extra_class_with_members/, 'Report-only Excel import must use the transactional create-with-members RPC');
assert.match(attendanceSource, /if\s*\(!canManageClassRoster\s*&&\s*classRow\)/, 'Report-only import must branch away from existing-class updates');
assert.match(attendanceSource, /Bỏ qua lớp đã tồn tại/, 'Report-only import must explicitly report skipped existing classes');

assert.match(workspaceSource, /canCreateClasses\s*=\s*false/, 'Workspace must accept a dedicated canCreateClasses prop');
assert.match(workspaceSource, /canCreateClasses\s*\?\s*\(/, 'Create/import controls must be guarded by canCreateClasses');
assert.match(workspaceSource, /canManageMembers\s*\?\s*\(/, 'Existing-class mutation controls must be guarded by canManageMembers');

assert.ok(migrationSource, 'Report-access class creation migration must exist');
assert.match(migrationSource, /create or replace function public\.can_create_extra_class_roster\(\)/i, 'Migration must define a narrow create capability');
assert.match(migrationSource, /attendance:report/, 'Backend create capability must include attendance:report');
assert.match(migrationSource, /attendance:manage/, 'Backend create capability must preserve attendance:manage callers');
assert.match(migrationSource, /bes_create_extra_class_with_teachers[\s\S]*can_create_extra_class_roster/i, 'Manual class RPC must use the new create capability');
assert.match(migrationSource, /create or replace function public\.bes_create_extra_class_with_members/i, 'Migration must provide a transactional import-create RPC');
assert.match(migrationSource, /bes_create_extra_class_with_members[\s\S]*security definer/i, 'Import-create RPC must use controlled server privileges');
assert.match(migrationSource, /bes_create_extra_class_with_members[\s\S]*can_create_extra_class_roster\(\)/i, 'Import-create RPC must enforce the narrow create gate');
assert.match(migrationSource, /revoke all on function public\.bes_create_extra_class_with_members[\s\S]*from anon/i, 'Anonymous callers must not execute import-create RPC');
assert.match(migrationSource, /grant execute on function public\.bes_create_extra_class_with_members[\s\S]*to authenticated/i, 'Authenticated callers must reach the RPC and be gated inside it');
assert.doesNotMatch(migrationSource, /create or replace function public\.can_manage_extra_class_roster\(\)/i, 'Migration must not broaden the existing roster-management helper');
assert.doesNotMatch(migrationSource, /bes_delete_extra_class[\s\S]{0,220}can_create_extra_class_roster/i, 'Delete class must not gain the create-only capability');
assert.doesNotMatch(migrationSource, /bes_add_extra_class_teacher[\s\S]{0,220}can_create_extra_class_roster/i, 'Teacher mutation must not gain the create-only capability');

console.log('Attendance report-access class creation contract OK');
