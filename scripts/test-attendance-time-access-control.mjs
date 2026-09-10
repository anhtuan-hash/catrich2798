import fs from 'node:fs';
import assert from 'node:assert/strict';

const utilityUrl = new URL('../src/utils/attendanceTimeAccess.js', import.meta.url);
const bootstrapUrl = new URL('../src/attendanceTimeAccessBootstrap.js', import.meta.url);
const compactRuntimeUrl = new URL('../src/attendanceCompactTimeSettings.js', import.meta.url);
const compactCssUrl = new URL('../src/styles/AttendanceCompactTimeSettings.css', import.meta.url);
const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260909_attendance_time_access_control.sql', import.meta.url);

assert.ok(fs.existsSync(utilityUrl), 'Attendance time access utility must exist');
assert.ok(fs.existsSync(bootstrapUrl), 'Attendance time access UI/bootstrap must exist');
assert.ok(fs.existsSync(compactRuntimeUrl), 'Attendance configuration-tab runtime must exist');
assert.ok(fs.existsSync(compactCssUrl), 'Attendance configuration-tab styles must exist');
assert.ok(fs.existsSync(migrationUrl), 'Attendance time access Supabase migration must exist');

const { parseClockTime, evaluateAttendanceTimeAccess } = await import(utilityUrl);

assert.equal(parseClockTime('16:40'), 1000);
assert.equal(parseClockTime('17:15:00'), 1035);
assert.equal(parseClockTime('24:00'), null);
assert.equal(parseClockTime(''), null);

const base = {
  restrictionEnabled: true,
  isAdmin: false,
  hasReportPermission: false,
  hasQuickPermission: true,
  isAssigned: true,
  startTime: '16:40',
  endTime: '17:15',
};

assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T16:40:00+07:00') }).allowed, true, 'Exact start boundary must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T17:15:00+07:00') }).allowed, true, 'Exact end boundary must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T16:39:59+07:00') }).reason, 'outside_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T17:15:01+07:00') }).reason, 'outside_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, isAssigned: false, now: new Date('2026-09-09T16:50:00+07:00') }).reason, 'unassigned');
assert.equal(evaluateAttendanceTimeAccess({ ...base, startTime: '', now: new Date('2026-09-09T16:50:00+07:00') }).reason, 'invalid_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, startTime: '16:40', endTime: '16:40', now: new Date('2026-09-09T16:40:00+07:00') }).reason, 'invalid_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, restrictionEnabled: false, isAssigned: false, now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Toggle OFF must preserve PR #704 behavior');
assert.equal(evaluateAttendanceTimeAccess({ ...base, isAdmin: true, isAssigned: false, startTime: '', endTime: '', now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Admin must bypass the window');
assert.equal(evaluateAttendanceTimeAccess({ ...base, hasReportPermission: true, isAssigned: false, startTime: '', endTime: '', now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Report permission must bypass the window');

const overnight = { ...base, startTime: '22:00', endTime: '01:30' };
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, now: new Date('2026-09-09T22:00:00+07:00') }).allowed, true, 'Overnight start must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, now: new Date('2026-09-10T00:30:00+07:00') }).allowed, true, 'Overnight after-midnight time must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, now: new Date('2026-09-10T01:30:00+07:00') }).allowed, true, 'Overnight exact end must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, now: new Date('2026-09-10T01:30:01+07:00') }).reason, 'outside_time');

const migrationSource = fs.readFileSync(migrationUrl, 'utf8');
for (const required of [
  'bes_attendance_access_settings',
  'enforce_teacher_time_window',
  'teacher_start_time',
  'teacher_end_time',
  'bes_get_attendance_access_settings',
  'bes_admin_set_attendance_time_restriction',
  'bes_can_operate_extra_class_attendance',
  'attendance:report',
  'bes_confirm_extra_class_attendance',
  'bes_cancel_extra_class_session',
  'bes_delete_extra_attendance_session',
  'Asia/Ho_Chi_Minh',
]) {
  assert.match(migrationSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Migration must contain ${required}`);
}
assert.match(migrationSource, /p_class_id[\s\S]*p_teacher_name[\s\S]*p_now/, 'Backend helper must evaluate class assignment, selected teacher and server time');
assert.doesNotMatch(migrationSource, /v_class\.weekdays|v_class\.time_range/, 'Time-window feature must not reintroduce PR #705 schedule hard-lock semantics');
assert.match(migrationSource, /can_take_extra_class_attendance\(\)/, 'Backend must preserve the original quick-attendance permission gate for ordinary teachers');
assert.match(migrationSource, /v_profile\.full_name/, 'Backend must bind attendance to the caller profile identity');
assert.match(migrationSource, /security definer[\s\S]*set search_path = ''/, 'Privileged helpers must pin an empty search_path');
assert.match(migrationSource, /revoke all on function private\./, 'Private security-definer helpers must not be executable by PUBLIC');

const startupSource = fs.readFileSync(startupUrl, 'utf8');
assert.match(startupSource, /attendanceTimeAccessBootstrap\.js/, 'The pre-main startup chain must load the attendance access runtime');
assert.match(startupSource, /attendanceCompactTimeSettings\.js/, 'The pre-main startup chain must load the attendance configuration-tab runtime');

const uiSource = fs.readFileSync(bootstrapUrl, 'utf8');
assert.match(uiSource, /bes_get_attendance_access_settings/, 'UI must read the server-side settings');
assert.match(uiSource, /bes_admin_set_attendance_time_restriction/, 'Admin UI must persist the toggle and global time window through a protected RPC');
assert.match(uiSource, /type="time"/, 'Admin UI must expose start/end time inputs');
assert.match(uiSource, /teacher_start_time/, 'UI must use the Admin-configured global start time');
assert.match(uiSource, /teacher_end_time/, 'UI must use the Admin-configured global end time');
assert.match(uiSource, /evaluateAttendanceTimeAccess/, 'UI must use the shared boundary-tested evaluator');
assert.match(uiSource, /hasAttendanceTabAccess\(currentProfile\(\), 'report'\)/, 'Report permission must bypass the UI time lock');
assert.match(uiSource, /let\s+adminSettingsDirty\s*=\s*false/, 'Admin settings form must track unsaved draft state');
assert.match(uiSource, /adminSettingsDirty\s*=\s*true/, 'Input changes must mark the Admin settings form dirty');
assert.match(uiSource, /if\s*\(!adminSettingsDirty\)\s*\{[\s\S]{0,900}enabledInput\.checked[\s\S]{0,900}startInput\.value[\s\S]{0,900}endInput\.value[\s\S]{0,900}\}/, 'Server settings may sync into controls only while the form is clean');
assert.match(uiSource, /settings\s*=\s*\{\s*\.\.\.settings,\s*\.\.\.\(data\s*\|\|\s*\{\}\)\s*\}[\s\S]{0,500}adminSettingsDirty\s*=\s*false/, 'A successful save must clear dirty state after adopting the server response');

// The old DOM-injected "Giờ GV" popover is retired. The pre-main runtime now registers an
// Admin-only attendance item before React mounts, so GlobalAttendanceNavigationTab renders a
// normal React-owned tab. The existing protected settings panel is then hosted in the content area.
const compactSource = fs.readFileSync(compactRuntimeUrl, 'utf8');
const compactCssSource = fs.readFileSync(compactCssUrl, 'utf8');
assert.match(compactSource, /ATTENDANCE_PERMISSION_ITEMS/, 'Configuration runtime must register through the React attendance item registry');
assert.match(compactSource, /tab:\s*'config'/, 'Configuration must use a dedicated React view id');
assert.match(compactSource, /titleVi:\s*'Cấu hình'/, 'Admin tab must be labelled Cấu hình');
assert.match(compactSource, /attendance:config/, 'Configuration item must have its own non-grantable permission id');
assert.match(compactSource, /\.attendance-tabs\s*>\s*button\.is-active/, 'Runtime must detect the React-owned active configuration tab');
assert.match(compactSource, /\.attendance-content/, 'Settings workspace must render in the normal attendance content area');
assert.match(compactSource, /appendChild\(panel\)/, 'Existing protected settings panel must be moved into the configuration workspace');
assert.match(compactSource, /is-config-workspace/, 'Settings panel must use normal workspace presentation');
assert.doesNotMatch(compactSource, /<b>Giờ GV<\/b>/, 'The retired Giờ GV trigger must not be created');
assert.doesNotMatch(compactSource, /adminSettingsPopoverOpen/, 'Configuration must not retain popover state');
assert.doesNotMatch(compactSource, /aria-haspopup/, 'Configuration must not be exposed as a popover/dialog trigger');
assert.match(compactCssSource, /\.bes-attendance-time-settings\.is-config-workspace/, 'Configuration workspace must have dedicated in-flow styling');
assert.doesNotMatch(compactCssSource, /\.bes-attendance-time-trigger/, 'Retired Giờ GV trigger styles must be removed');
assert.doesNotMatch(compactCssSource, /position\s*:\s*absolute/, 'Configuration panel must stay in normal document flow');

console.log('Admin-configured global attendance time window contract OK');
