import fs from 'node:fs';
import assert from 'node:assert/strict';

const utilityUrl = new URL('../src/utils/attendanceTimeAccess.js', import.meta.url);
const bootstrapUrl = new URL('../src/attendanceTimeAccessBootstrap.js', import.meta.url);
const compactRuntimeUrl = new URL('../src/attendanceCompactTimeSettings.js', import.meta.url);
const compactCssUrl = new URL('../src/styles/AttendanceCompactTimeSettings.css', import.meta.url);
const attendanceTabsCssUrl = new URL('../src/components/GlobalAttendanceNavigationTab.css', import.meta.url);
const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);
const baseMigrationUrl = new URL('../supabase/migrations/20260909_attendance_time_access_control.sql', import.meta.url);
const globalMigrationUrl = new URL('../supabase/migrations/20260911_global_attendance_permission.sql', import.meta.url);

for (const requiredFile of [utilityUrl, bootstrapUrl, compactRuntimeUrl, compactCssUrl, attendanceTabsCssUrl, baseMigrationUrl, globalMigrationUrl]) {
  assert.ok(fs.existsSync(requiredFile), `${requiredFile.pathname} must exist`);
}

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
  startTime: '16:40',
  endTime: '17:15',
};

assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T16:40:00+07:00') }).allowed, true, 'Exact start boundary must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T17:15:00+07:00') }).allowed, true, 'Exact end boundary must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T16:39:59+07:00') }).reason, 'outside_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, now: new Date('2026-09-09T17:15:01+07:00') }).reason, 'outside_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, startTime: '', now: new Date('2026-09-09T16:50:00+07:00') }).reason, 'invalid_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, startTime: '16:40', endTime: '16:40', now: new Date('2026-09-09T16:40:00+07:00') }).reason, 'invalid_time');
assert.equal(evaluateAttendanceTimeAccess({ ...base, restrictionEnabled: false, now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Authorized accounts may operate when Giờ GV is disabled');
assert.equal(evaluateAttendanceTimeAccess({ ...base, restrictionEnabled: false, hasQuickPermission: false, now: new Date('2026-09-09T03:00:00+07:00') }).reason, 'missing_permission', 'Disabling Giờ GV must not grant attendance permission');
assert.equal(evaluateAttendanceTimeAccess({ ...base, isAdmin: true, hasQuickPermission: false, startTime: '', endTime: '', now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Admin must bypass the window and quick permission');
assert.equal(evaluateAttendanceTimeAccess({ ...base, hasReportPermission: true, now: new Date('2026-09-09T03:00:00+07:00') }).allowed, true, 'Quick + Report may bypass the window');
assert.equal(evaluateAttendanceTimeAccess({ ...base, hasQuickPermission: false, hasReportPermission: true, now: new Date('2026-09-09T16:50:00+07:00') }).reason, 'missing_permission', 'Report alone must never grant attendance operations');

const overnight = { ...base, startTime: '22:00', endTime: '01:30' };
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, now: new Date('2026-09-09T22:00:00+07:00') }).allowed, true, 'Overnight start must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, now: new Date('2026-09-10T00:30:00+07:00') }).allowed, true, 'Overnight after-midnight time must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, now: new Date('2026-09-10T01:30:00+07:00') }).allowed, true, 'Overnight exact end must be allowed');
assert.equal(evaluateAttendanceTimeAccess({ ...overnight, now: new Date('2026-09-10T01:30:01+07:00') }).reason, 'outside_time');

const baseMigrationSource = fs.readFileSync(baseMigrationUrl, 'utf8');
for (const required of [
  'bes_attendance_access_settings',
  'enforce_teacher_time_window',
  'teacher_start_time',
  'teacher_end_time',
  'bes_get_attendance_access_settings',
  'bes_admin_set_attendance_time_restriction',
  'bes_can_operate_extra_class_attendance',
  'bes_confirm_extra_class_attendance',
  'bes_cancel_extra_class_session',
  'bes_delete_extra_attendance_session',
  'Asia/Ho_Chi_Minh',
]) {
  assert.match(baseMigrationSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Baseline time migration must contain ${required}`);
}
assert.doesNotMatch(baseMigrationSource, /v_class\.weekdays|v_class\.time_range/, 'Time-window feature must not reintroduce class-schedule hard locks');
assert.match(baseMigrationSource, /security definer[\s\S]*set search_path = ''/, 'Privileged helpers must pin an empty search_path');

const globalMigrationSource = fs.readFileSync(globalMigrationUrl, 'utf8');
assert.match(globalMigrationSource, /create or replace function private\.bes_attendance_access_decision/, 'Forward migration must replace the server decision helper');
assert.match(globalMigrationSource, /if not public\.can_take_extra_class_attendance\(\)/, 'Global attendance permission must use the Admin-granted quick gate');
assert.doesNotMatch(globalMigrationSource, /bes_extra_class_teachers|v_is_assigned|teacher_identity_mismatch/, 'Global authorization must not depend on class-teacher assignment or identity matching');
assert.match(globalMigrationSource, /missing_permission[\s\S]{0,1400}if v_has_report/, 'Quick permission must be checked before Report time bypass');

const startupSource = fs.readFileSync(startupUrl, 'utf8');
assert.match(startupSource, /attendanceTimeAccessBootstrap\.js/, 'The pre-main startup chain must load the attendance access runtime');
assert.match(startupSource, /attendanceCompactTimeSettings\.js/, 'The pre-main startup chain must load the compact settings runtime after the time-access runtime');

const uiSource = fs.readFileSync(bootstrapUrl, 'utf8');
assert.match(uiSource, /bes_get_attendance_access_settings/, 'UI must read server-side settings');
assert.match(uiSource, /bes_admin_set_attendance_time_restriction/, 'Admin UI must persist the time window through a protected RPC');
assert.match(uiSource, /bes_get_extra_class_attendance_access/, 'UI must reconcile its operation state with the server decision');
assert.match(uiSource, /type="time"/, 'Admin UI must expose start/end time inputs');
assert.match(uiSource, /evaluateAttendanceTimeAccess/, 'UI must use the shared boundary-tested evaluator');
assert.match(uiSource, /function hasQuickPermission\(\)/, 'UI must have an explicit global quick-attendance permission gate');
assert.match(uiSource, /if \(!hasQuickPermission\(\)\) return false/, 'Report time bypass must require quick-attendance permission first');
assert.doesNotMatch(uiSource, /isAssignedAttendanceTeacher|matchingTeacherNames|teacher_identity_mismatch/, 'UI must not bind an invigilator to a class teacher identity');
assert.match(uiSource, /tất cả lớp/i, 'UI must explain that the grant covers all classes');

assert.match(uiSource, /let\s+adminSettingsDirty\s*=\s*false/, 'Admin settings form must track unsaved draft state');
assert.match(uiSource, /adminSettingsDirty\s*=\s*true/, 'Input changes must mark the Admin settings form dirty');
assert.match(uiSource, /if\s*\(!adminSettingsDirty\)\s*\{[\s\S]{0,900}enabledInput\.checked[\s\S]{0,900}startInput\.value[\s\S]{0,900}endInput\.value[\s\S]{0,900}\}/, 'Server settings may sync into controls only while the form is clean');
assert.match(uiSource, /settings\s*=\s*\{\s*\.\.\.settings,\s*\.\.\.\(data\s*\|\|\s*\{\}\)\s*\}[\s\S]{0,500}resetAdminSettingsDraft\(\)/, 'A successful save must clear dirty state after adopting the server response');

// Preserve the Giờ GV tab visual-parity contract from PR #757.
const compactSource = fs.readFileSync(compactRuntimeUrl, 'utf8');
const compactCssSource = fs.readFileSync(compactCssUrl, 'utf8');
const attendanceTabsCssSource = fs.readFileSync(attendanceTabsCssUrl, 'utf8');
assert.match(compactSource, /bes-attendance-time-trigger/, 'Admin must get a compact time-settings trigger in the attendance tab bar');
assert.match(compactSource, /bes-attendance-time-trigger-label[^>]*>Giờ GV<\/span>/, 'Compact trigger must keep the Giờ GV label');
assert.match(compactSource, /readWindowLabel\(panel\)/, 'Compact trigger must display the current attendance window');
assert.match(compactSource, /attendance-icon bes-attendance-time-trigger-icon/, 'Giờ GV must use the same SVG icon language as the React attendance tabs');
assert.match(compactSource, /classList\.toggle\('is-active',\s*adminSettingsPopoverOpen\)/, 'Opening Giờ GV must reuse the attendance tab active state');
assert.match(compactSource, /tabs\.appendChild\(trigger\)/, 'Compact trigger must be appended after the existing attendance tabs');
assert.match(compactSource, /tabs\.appendChild\(panel\)/, 'Existing settings panel must stay in the tab-bar popover layer');
assert.match(compactSource, /event\.key\s*===\s*'Escape'/, 'Escape must close the compact settings popover');

assert.match(attendanceTabsCssSource, /\.attendance-tabs button\s*\{[^}]*padding\s*:\s*0\s+18px[^}]*font-weight\s*:\s*800/is, 'Giờ GV must inherit canonical attendance tab geometry and typography');
assert.match(compactCssSource, /\.attendance-tabs\s*>\s*button::after\s*\{[^}]*height\s*:\s*3px[^}]*opacity\s*:\s*0[^}]*transform\s*:\s*scaleX\([^)]*\)[^}]*transition\s*:/is, 'Attendance underline must keep its shared animated base state');
assert.match(compactCssSource, /\.attendance-tabs\s*>\s*button\.is-active::after\s*\{[^}]*opacity\s*:\s*1[^}]*transform\s*:\s*scaleX\(1\)/is, 'Active attendance tabs must reveal the same underline');
assert.doesNotMatch(compactCssSource, /!important/i, 'Teacher-time tab parity must remain source-level without !important patches');

console.log('Admin-configured global attendance time window contract OK');
