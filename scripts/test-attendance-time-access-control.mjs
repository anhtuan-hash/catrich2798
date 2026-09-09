import fs from 'node:fs';
import assert from 'node:assert/strict';

const utilityUrl = new URL('../src/utils/attendanceTimeAccess.js', import.meta.url);
const bootstrapUrl = new URL('../src/attendanceTimeAccessBootstrap.js', import.meta.url);
const cssUrl = new URL('../src/styles/AttendanceTimeAccessControl.css', import.meta.url);
const appBootstrapUrl = new URL('../src/applicationBootstrap.jsx', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260909_attendance_time_access_control.sql', import.meta.url);

assert.ok(fs.existsSync(utilityUrl), 'Attendance time access utility must exist');
assert.ok(fs.existsSync(bootstrapUrl), 'Attendance time access UI/bootstrap must exist');
assert.ok(fs.existsSync(cssUrl), 'Attendance time access UI styles must exist');
assert.ok(fs.existsSync(migrationUrl), 'Attendance time access Supabase migration must exist');

const {
  parseAttendanceTimeRange,
  evaluateAttendanceTimeAccess,
} = await import(utilityUrl);

const normal = parseAttendanceTimeRange('16h45 đến 18h15');
assert.deepEqual(normal, { startMinutes: 1005, endMinutes: 1095, overnight: false });
assert.deepEqual(parseAttendanceTimeRange('14:00–15:30'), { startMinutes: 840, endMinutes: 930, overnight: false });
assert.deepEqual(parseAttendanceTimeRange('22:00 - 01:30'), { startMinutes: 1320, endMinutes: 90, overnight: true });
assert.equal(parseAttendanceTimeRange(''), null);
assert.equal(parseAttendanceTimeRange('không rõ'), null);

const base = {
  restrictionEnabled: true,
  isAdmin: false,
  hasReportPermission: false,
  hasQuickPermission: true,
  isAssigned: true,
  timeRange: '16h45 đến 18h15',
  attendanceDate: '2026-09-09',
  weekdays: '4',
};

assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T16:45:00+07:00') }).allowed, true, 'Exact start boundary must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T18:15:00+07:00') }).allowed, true, 'Exact end boundary must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T16:44:59+07:00') }).reason, 'outside_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T18:15:01+07:00') }).reason, 'outside_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, isAssigned: false, now: new Date('2026-09-09T17:00:00+07:00') }).reason, 'unassigned');
assert.equal(evaluateAttendanceTimeAccess({ ...base, timeRange: '', now: new Date('2026-09-09T17:00:00+07:00') }).reason, 'invalid_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, weekdays: '2', now: new Date('2026-09-09T17:00:00+07:00') }).reason, 'off_schedule');

assert.equal(evaluateAttendanceTimeAccess({ ...base, restrictionEnabled: false, isAssigned: false, now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Toggle OFF must preserve legacy behavior');
assert.equal(evaluateAttendanceTimeAccess({ ...base, isAdmin: true, isAssigned: false, timeRange: '', now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Admin must bypass schedule restriction');
assert.equal(evaluateAttendanceTimeAccess({ ...base, hasReportPermission: true, isAssigned: false, timeRange: '', now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Report permission must bypass schedule restriction');

const overnight = {
  ...base,
  timeRange: '22:00 - 01:30',
  weekdays: '4',
};
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, attendanceDate: '2026-09-09', now: new Date('2026-09-09T22:00:00+07:00') }).allowed, true, 'Overnight start must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, attendanceDate: '2026-09-09', now: new Date('2026-09-10T00:30:00+07:00') }).allowed, true, 'After midnight must map to previous session date');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, attendanceDate: '2026-09-10', now: new Date('2026-09-10T00:30:00+07:00') }).reason, 'wrong_session_date');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, attendanceDate: '2026-09-09', now: new Date('2026-09-10T01:30:00+07:00') }).allowed, true, 'Overnight exact end must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, attendanceDate: '2026-09-09', now: new Date('2026-09-10T01:31:00+07:00') }).reason, 'outside_time');

const migrationSource = fs.readFileSync(migrationUrl, 'utf8');
for (const required of [
  'bes_attendance_access_settings',
  'bes_get_attendance_access_settings',
  'bes_admin_set_attendance_time_restriction',
  'bes_can_operate_extra_class_attendance',
  'attendance:report',
  'bes_confirm_extra_class_attendance',
  'bes_cancel_extra_class_session',
]) {
  assert.match(migrationSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Migration must contain ${required}`);
}
assert.match(migrationSource, /p_attendance_date[\s\S]*p_teacher_name[\s\S]*p_now/, 'Backend helper must evaluate date, selected teacher and server time');
assert.match(migrationSource, /can_take_extra_class_attendance\(\)/, 'Backend must preserve the quick-attendance permission gate');
assert.match(migrationSource, /lower\(trim\(p\.full_name\)\)/, 'Backend must bind attendance to the caller profile identity');

const appBootstrapSource = fs.readFileSync(appBootstrapUrl, 'utf8');
assert.match(appBootstrapSource, /attendanceTimeAccessBootstrap\.js/, 'Application bootstrap must load the attendance access runtime');

const uiSource = fs.readFileSync(bootstrapUrl, 'utf8');
assert.match(uiSource, /bes_get_attendance_access_settings/, 'UI must read the server-side toggle');
assert.match(uiSource, /bes_admin_set_attendance_time_restriction/, 'Admin UI must persist the toggle through a protected RPC');
assert.match(uiSource, /evaluateAttendanceTimeAccess/, 'UI must use the shared boundary-tested evaluator');
assert.match(uiSource, /attendance:report/, 'Report permission must bypass the UI schedule lock');

console.log('Attendance time access control contract OK');
