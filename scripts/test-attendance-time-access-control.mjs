import fs from 'node:fs';
import assert from 'node:assert/strict';

const utilityUrl = new URL('../src/utils/attendanceTimeAccess.js', import.meta.url);
const bootstrapUrl = new URL('../src/attendanceTimeAccessBootstrap.js', import.meta.url);
const compactRuntimeUrl = new URL('../src/attendanceCompactTimeSettings.js', import.meta.url);
const compactCssUrl = new URL('../src/styles/AttendanceCompactTimeSettings.css', import.meta.url);
const attendanceTabsCssUrl = new URL('../src/components/GlobalAttendanceNavigationTab.css', import.meta.url);
const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260909_attendance_time_access_control.sql', import.meta.url);
const globalOperatorMigrationUrl = new URL('../supabase/migrations/20260911_global_attendance_operator_permission.sql', import.meta.url);

assert.ok(fs.existsSync(utilityUrl), 'Attendance time access utility must exist');
assert.ok(fs.existsSync(bootstrapUrl), 'Attendance time access UI/bootstrap must exist');
assert.ok(fs.existsSync(compactRuntimeUrl), 'Compact Admin time settings runtime must exist');
assert.ok(fs.existsSync(compactCssUrl), 'Compact Admin time settings styles must exist');
assert.ok(fs.existsSync(attendanceTabsCssUrl), 'Attendance tab source styles must exist');
assert.ok(fs.existsSync(migrationUrl), 'Attendance time access Supabase migration must exist');
assert.ok(fs.existsSync(globalOperatorMigrationUrl), 'Global attendance operator forward migration must exist');

const {
  parseClockTime,
  evaluateAttendanceTimeAccess,
} = await import(utilityUrl);

assert.equal(parseClockTime('16:40'), 1000);
assert.equal(parseClockTime('17:15:00'), 1035);
assert.equal(parseClockTime('24:00'), null);
assert.equal(parseClockTime(''), null);

const base = {
  restrictionEnabled: true,
  isAdmin: false,
  hasReportPermission: false,
  hasQuickPermission: true,
  startTime: '16:40',
  endTime: '17:15',
};

assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T16:40:00+07:00') }).allowed, true, 'Exact start boundary must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T17:15:00+07:00') }).allowed, true, 'Exact end boundary must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T16:39:59+07:00') }).reason, 'outside_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T17:15:01+07:00') }).reason, 'outside_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, isAssigned: false, now: new Date('2026-09-09T16:50:00+07:00') }).allowed, true, 'Teaching assignment must not affect an Admin-granted global attendance operator');
assert.equal(evaluateAttendanceTimeAccess({ ...base, hasQuickPermission: false, isAssigned: true, now: new Date('2026-09-09T16:50:00+07:00') }).reason, 'missing_permission', 'Teaching assignment alone must not grant attendance write access');
assert.equal(evaluateAttendanceTimeAccess({ ...base, startTime: '', now: new Date('2026-09-09T16:50:00+07:00') }).reason, 'invalid_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, startTime: '16:40', endTime: '16:40', now: new Date('2026-09-09T16:40:00+07:00') }).reason, 'invalid_time');

assert.equal(evaluateAttendanceTimeAccess({ ...base, restrictionEnabled: false, now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Toggle OFF must allow an Admin-granted attendance operator without a time restriction');
assert.equal(evaluateAttendanceTimeAccess({ ...base, restrictionEnabled: false, hasQuickPermission: false, now: new Date('2026-09-09T03:00:00+07:00') }).reason, 'missing_permission', 'Toggle OFF must not grant attendance permission by itself');
assert.equal(evaluateAttendanceTimeAccess({ ...base, isAdmin: true, hasQuickPermission: false, startTime: '', endTime: '', now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Admin must bypass the window and ordinary permission gate');
assert.equal(evaluateAttendanceTimeAccess({ ...base, hasReportPermission: true, hasQuickPermission: false, startTime: '', endTime: '', now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Report permission must bypass the window and ordinary permission gate');

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
assert.match(migrationSource, /p_class_id[\s\S]*p_teacher_name[\s\S]*p_now/, 'Backend helper API must keep class, selected-teacher and server-time parameters for existing callers');
assert.doesNotMatch(migrationSource, /v_class\.weekdays|v_class\.time_range/, 'Time-window feature must not reintroduce PR #705 schedule hard-lock semantics');
assert.match(migrationSource, /can_take_extra_class_attendance\(\)/, 'Backend must preserve the explicit quick-attendance permission gate');
assert.match(migrationSource, /security definer[\s\S]*set search_path = ''/, 'Privileged helpers must pin an empty search_path');
assert.match(migrationSource, /revoke all on function private\./, 'Private security-definer helpers must not be executable by PUBLIC');

const globalOperatorMigrationSource = fs.readFileSync(globalOperatorMigrationUrl, 'utf8');
assert.match(globalOperatorMigrationSource, /create or replace function private\.bes_attendance_access_decision/i, 'Forward migration must replace the central attendance authorization helper');
assert.match(globalOperatorMigrationSource, /can_take_extra_class_attendance\(\)/, 'Current backend authorization must remain driven by the Admin-granted attendance permission');
assert.doesNotMatch(globalOperatorMigrationSource, /bes_extra_class_teachers|v_is_assigned/i, 'Current backend authorization must not depend on class teaching assignment');
assert.match(globalOperatorMigrationSource, /Asia\/Ho_Chi_Minh/, 'Current backend authorization must retain authoritative Vietnam time enforcement');

const startupSource = fs.readFileSync(startupUrl, 'utf8');
assert.match(startupSource, /attendanceTimeAccessBootstrap\.js/, 'The pre-main startup chain must load the attendance access runtime');
assert.match(startupSource, /attendanceCompactTimeSettings\.js/, 'The pre-main startup chain must load the compact settings runtime after the time-access runtime');

const uiSource = fs.readFileSync(bootstrapUrl, 'utf8');
assert.match(uiSource, /bes_get_attendance_access_settings/, 'UI must read the server-side settings');
assert.match(uiSource, /bes_admin_set_attendance_time_restriction/, 'Admin UI must persist the toggle and global time window through a protected RPC');
assert.match(uiSource, /type="time"/, 'Admin UI must expose start/end time inputs');
assert.match(uiSource, /teacher_start_time/, 'UI must use the Admin-configured global start time');
assert.match(uiSource, /teacher_end_time/, 'UI must use the Admin-configured global end time');
assert.match(uiSource, /evaluateAttendanceTimeAccess/, 'UI must use the shared boundary-tested evaluator');
assert.match(uiSource, /hasAttendanceTabAccess\(currentProfile\(\), 'quick'\)/, 'UI must use the Admin-granted quick attendance permission as the ordinary write assignment');
assert.match(uiSource, /hasAttendanceTabAccess\(currentProfile\(\), 'report'\)/, 'Report permission must bypass the UI time lock');
assert.doesNotMatch(uiSource, /isAssignedAttendanceTeacher|matchingTeacherNames|teacher_identity_mismatch/, 'UI authorization must not depend on teaching assignment or selected-teacher identity');

// Regression: changing the toggle/time inputs must survive MutationObserver-driven renders
// until the Admin explicitly saves. The server snapshot may only overwrite a clean form.
assert.match(uiSource, /let\s+adminSettingsDirty\s*=\s*false/, 'Admin settings form must track unsaved draft state');
assert.match(uiSource, /adminSettingsDirty\s*=\s*true/, 'Input changes must mark the Admin settings form dirty');
assert.match(uiSource, /if\s*\(!adminSettingsDirty\)\s*\{[\s\S]{0,900}enabledInput\.checked[\s\S]{0,900}startInput\.value[\s\S]{0,900}endInput\.value[\s\S]{0,900}\}/, 'Server settings may sync into controls only while the form is clean');
assert.match(uiSource, /settings\s*=\s*\{\s*\.\.\.settings,\s*\.\.\.\(data\s*\|\|\s*\{\}\)\s*\}[\s\S]{0,500}adminSettingsDirty\s*=\s*false/, 'A successful save must clear dirty state after adopting the server response');

// Giờ GV stays a compact popover trigger, but it must use the exact visual state language of
// the React attendance navigation tabs instead of presenting itself as a separate pill/control.
const compactSource = fs.readFileSync(compactRuntimeUrl, 'utf8');
const compactCssSource = fs.readFileSync(compactCssUrl, 'utf8');
const attendanceTabsCssSource = fs.readFileSync(attendanceTabsCssUrl, 'utf8');
assert.match(compactSource, /bes-attendance-time-trigger/, 'Admin must get a compact time-settings trigger in the attendance tab bar');
assert.match(compactSource, /bes-attendance-time-trigger-label[^>]*>Giờ GV<\/span>/, 'Compact trigger must keep the Giờ GV label');
assert.match(compactSource, /readWindowLabel\(panel\)/, 'Compact trigger must display the current attendance window');
assert.match(compactSource, /attendance-icon bes-attendance-time-trigger-icon/, 'Giờ GV must use the same SVG icon language as the React attendance tabs');
assert.match(compactSource, /classList\.toggle\('is-active',\s*adminSettingsPopoverOpen\)/, 'Opening Giờ GV must reuse the attendance tab active state');
assert.match(compactSource, /tabs\.appendChild\(trigger\)/, 'Compact trigger must be appended after the existing attendance tabs (after Báo cáo)');
assert.match(compactSource, /tabs\.appendChild\(panel\)/, 'Existing settings panel must stay out of document flow inside the tab bar popover layer');
assert.match(compactSource, /let\s+adminSettingsPopoverOpen\s*=\s*false/, 'Popover open/closed state must remain explicit and stable across renders');
assert.match(compactSource, /panel\.hidden\s*=\s*!adminSettingsPopoverOpen/, 'Settings panel must stay out of view until the Admin opens it');
assert.match(compactSource, /event\.key\s*===\s*'Escape'/, 'Escape must close the compact settings popover');
assert.match(compactSource, /closest\?\.\('\.bes-attendance-time-settings, \.bes-attendance-time-trigger'\)/, 'Clicking outside the popover must close it');

assert.match(attendanceTabsCssSource, /\.attendance-tabs button\s*\{[^}]*padding\s*:\s*0\s+18px[^}]*font-weight\s*:\s*800/is, 'Giờ GV must inherit the canonical attendance tab geometry and typography');
assert.match(compactCssSource, /\.attendance-tabs\s*>\s*button\s*\{[^}]*transition\s*:/is, 'All top-level attendance tabs must share one hover/color transition contract');
assert.match(compactCssSource, /\.attendance-tabs\s*>\s*button::after\s*\{[^}]*height\s*:\s*3px[^}]*opacity\s*:\s*0[^}]*transform\s*:\s*scaleX\([^)]*\)[^}]*transition\s*:/is, 'Attendance underline must have one shared animated base state');
assert.match(compactCssSource, /\.attendance-tabs\s*>\s*button\.is-active::after\s*\{[^}]*opacity\s*:\s*1[^}]*transform\s*:\s*scaleX\(1\)/is, 'Attendance active tabs must reveal the same 3px underline animation');

const triggerBlock = compactCssSource.match(/\.bes-attendance-time-trigger\s*\{([^}]*)\}/i)?.[1] || '';
for (const property of ['min-height', 'margin-left', 'padding', 'border', 'border-radius', 'background', 'font', 'transition']) {
  assert.doesNotMatch(triggerBlock, new RegExp(`(?:^|\\n)\\s*${property.replace('-', '\\-')}\\s*:`, 'i'), `Giờ GV must inherit ${property} from the shared attendance tab source instead of overriding it`);
}
assert.doesNotMatch(compactCssSource, /\.bes-attendance-time-trigger:hover\s*,?[\s\S]{0,120}\.bes-attendance-time-trigger\.is-open\s*\{/i, 'Giờ GV must not own a separate hover/open visual rule');
assert.doesNotMatch(compactCssSource, /!important/i, 'Teacher-time tab parity must be solved at source without !important patches');
assert.match(compactCssSource, /\.bes-attendance-time-settings\.is-compact-popover\s*\{[^}]*position\s*:\s*absolute/is, 'Settings panel must remain an overlay, not normal document flow');
assert.match(compactCssSource, /\.bes-attendance-time-heading\s*\{[^}]*display\s*:\s*none/is, 'Verbose heading must remain removed inside the compact popover');

console.log('Admin-configured global attendance time window contract OK');
