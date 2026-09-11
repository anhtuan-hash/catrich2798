import fs from 'node:fs';
import assert from 'node:assert/strict';

const bootstrapSource = fs.readFileSync('src/attendanceTimeAccessBootstrap.js', 'utf8');
const globalPermissionSource = fs.readFileSync('supabase/migrations/20260911_global_attendance_permission.sql', 'utf8');
const deleteScopeFixSource = fs.readFileSync('supabase/migrations/20260909_attendance_report_delete_scope_fix.sql', 'utf8');
const { evaluateAttendanceTimeAccess } = await import(new URL('../src/utils/attendanceTimeAccess.js', import.meta.url));

const reportOnly = evaluateAttendanceTimeAccess({
  restrictionEnabled: false,
  isAdmin: false,
  hasQuickPermission: false,
  hasReportPermission: true,
  startTime: '16:45',
  endTime: '17:30',
  now: new Date('2026-09-11T17:00:00+07:00'),
});
assert.equal(reportOnly.allowed, false, 'Report-only account must not receive attendance operation rights');
assert.equal(reportOnly.reason, 'missing_permission');

assert.match(bootstrapSource, /function hasQuickPermission\(\)/, 'Frontend write controls must use an explicit quick-attendance capability');
assert.match(bootstrapSource, /if \(!hasQuickPermission\(\)\) return false/, 'Report bypass must be subordinate to quick-attendance permission');
assert.match(globalPermissionSource, /if not public\.can_take_extra_class_attendance\(\)[\s\S]{0,500}missing_permission/, 'Server decision must reject missing quick permission before any bypass');
assert.match(globalPermissionSource, /missing_permission[\s\S]{0,1400}if v_has_report/, 'Report permission may bypass time only after quick permission succeeds');

assert.match(
  deleteScopeFixSource,
  /public\.can_take_extra_class_attendance\(\) and public\.bes_can_operate_extra_attendance_session\(p_session_id, clock_timestamp\(\)\)/,
  'History deletion must still require quick permission plus the server operation gate',
);
assert.doesNotMatch(deleteScopeFixSource, /attendance:report/, 'Report-only users must not gain destructive history access');

console.log('Attendance report permission remains read/report-only without quick permission');
