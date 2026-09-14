import fs from 'node:fs';
import assert from 'node:assert/strict';

const permissionsUrl = new URL('../src/utils/permissions.js', import.meta.url);
const bridgeUrl = new URL('../src/components/GlobalAttendanceAdminPersistenceBridge.jsx', import.meta.url);
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

const bridgeSource = fs.readFileSync(bridgeUrl, 'utf8');
const migrationSource = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';

assert.match(
  bridgeSource,
  /hasAttendanceTabAccess\(currentUser,\s*['"]report['"]\)/,
  'Tạo lớp mới bridge must recognize attendance:report',
);
assert.match(
  bridgeSource,
  /hasAttendanceTabAccess\(currentUser,\s*['"]manage['"]\)/,
  'Existing attendance:manage creation capability must remain available',
);
assert.match(bridgeSource, /reportOnlyCreator/, 'Bridge must distinguish report-only creators from full class managers');
assert.match(bridgeSource, /\.attendance-top-actions/, 'Report-only creators must receive creation controls even without the Manage tab');
assert.match(bridgeSource, /bes_create_extra_class_with_teachers/, 'Manual creation must keep using the transactional create RPC');
assert.match(bridgeSource, /readSheet\(file\)/, 'Report-only creators must be able to import an Excel roster');
assert.match(bridgeSource, /parseExtraClassRosterRows\(rows\)/, 'Excel import must reuse the validated extra-class parser');
assert.match(bridgeSource, /if\s*\(classRow\)\s*\{[\s\S]{0,260}Bỏ qua lớp đã tồn tại[\s\S]{0,160}continue;/, 'Report-only import must skip existing classes instead of mutating them');
assert.match(bridgeSource, /bes_create_extra_class_with_members/, 'Report-only Excel import must use the transactional create-with-members RPC');
assert.doesNotMatch(bridgeSource, /\.from\(['"]bes_extra_classes['"]\)[\s\S]{0,220}\.update\(/, 'Report-only bridge must not update existing classes directly');
assert.doesNotMatch(bridgeSource, /\.from\(['"]bes_extra_class_members['"]\)[\s\S]{0,220}\.(?:update|delete)\(/, 'Report-only bridge must not mutate existing members directly');

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
