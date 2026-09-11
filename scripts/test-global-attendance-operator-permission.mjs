import fs from 'node:fs';
import assert from 'node:assert/strict';

const utilityUrl = new URL('../src/utils/attendanceTimeAccess.js', import.meta.url);
const bootstrapUrl = new URL('../src/attendanceTimeAccessBootstrap.js', import.meta.url);
const permissionsUrl = new URL('../src/utils/permissions.js', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260911_global_attendance_operator_permission.sql', import.meta.url);

const { evaluateAttendanceTimeAccess, attendanceAccessReasonVi } = await import(utilityUrl);

const base = {
  restrictionEnabled: true,
  isAdmin: false,
  hasReportPermission: false,
  hasQuickPermission: true,
  startTime: '16:45',
  endTime: '17:30',
  now: new Date('2026-09-11T17:00:00+07:00'),
};

assert.equal(
  evaluateAttendanceTimeAccess({ ...base, isAssigned: false }).allowed,
  true,
  'Admin-granted attendance permission must allow every class; teacher assignment must not be required',
);
assert.equal(
  evaluateAttendanceTimeAccess({ ...base, hasQuickPermission: false, isAssigned: true }).reason,
  'missing_permission',
  'A teaching assignment must never grant attendance write access by itself',
);
assert.equal(
  evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-11T18:00:00+07:00') }).reason,
  'outside_time',
  'Attendance operators must still obey the Admin-configured teacher-time window',
);
assert.match(attendanceAccessReasonVi({ allowed: false, reason: 'missing_permission' }), /Admin.*quyền điểm danh/i);

const bootstrapSource = fs.readFileSync(bootstrapUrl, 'utf8');
assert.doesNotMatch(bootstrapSource, /isAssignedAttendanceTeacher/, 'Frontend access must not depend on teaching assignment');
assert.doesNotMatch(bootstrapSource, /teacher_identity_mismatch/, 'Attendance operators must be able to operate every class without matching the selected teacher identity');
assert.doesNotMatch(bootstrapSource, /matchingTeacherNames\(/, 'Teacher dropdown options must not be restricted to the operator identity');
assert.match(bootstrapSource, /Bạn có thể thao tác điểm danh tất cả các lớp\./, 'Allowed-state UI must explain the global attendance assignment clearly');

const permissionSource = fs.readFileSync(permissionsUrl, 'utf8');
assert.match(permissionSource, /titleVi:\s*'Được phép điểm danh'/, 'Admin permission UI must name the global attendance assignment clearly');
assert.match(permissionSource, /descVi:\s*'[^']*tất cả các lớp[^']*'/, 'Admin permission UI must explain that the grant covers all classes');

assert.ok(fs.existsSync(migrationUrl), 'A forward migration must patch the already-deployed backend authorization helper');
const migrationSource = fs.readFileSync(migrationUrl, 'utf8');
assert.match(migrationSource, /create or replace function private\.bes_attendance_access_decision/i, 'Migration must replace the central backend attendance decision helper');
assert.match(migrationSource, /can_take_extra_class_attendance\(\)/, 'Backend must retain the Admin-granted attendance permission gate');
assert.doesNotMatch(migrationSource, /v_is_assigned/i, 'Backend must no longer require class assignment');
assert.doesNotMatch(migrationSource, /bes_extra_class_teachers/i, 'Backend decision must not inspect teacher assignment rows');
assert.doesNotMatch(migrationSource, /teacher_identity_mismatch/i, 'Backend must not bind the operator to the selected teacher identity');
assert.match(migrationSource, /outside_time/, 'Backend must continue enforcing the configured attendance time window');
assert.match(migrationSource, /admin_bypass/, 'Admin bypass must remain intact');
assert.match(migrationSource, /report_bypass/, 'Report-permission bypass must remain intact');

console.log('Global attendance operator permission contract OK');
