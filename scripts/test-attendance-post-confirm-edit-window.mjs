import fs from 'node:fs';
import assert from 'node:assert/strict';

const utilityUrl = new URL('../src/utils/attendancePostConfirmEdit.js', import.meta.url);
const bootstrapUrl = new URL('../src/attendancePostConfirmEditBootstrap.js', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260909_attendance_post_confirm_edit_window.sql', import.meta.url);
const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);

const {
  POST_CONFIRM_EDIT_WINDOW_MS,
  evaluatePostConfirmEditAccess,
  formatPostConfirmRemaining,
} = await import(utilityUrl);

assert.equal(POST_CONFIRM_EDIT_WINDOW_MS, 30 * 60 * 1000, 'Teacher adjustment window must be exactly 30 minutes');

const session = {
  id: 'session-1',
  session_status: 'completed',
  checked_at: '2026-09-09T10:02:00.000Z', // 17:02 Asia/Ho_Chi_Minh
  checked_by: 'teacher-1',
};

const teacherBase = {
  session,
  currentUserId: 'teacher-1',
  hasQuickPermission: true,
  isAdmin: false,
  hasReportPermission: false,
};

let result = evaluatePostConfirmEditAccess({
  ...teacherBase,
  now: new Date('2026-09-09T10:20:00.000Z'),
});
assert.equal(result.allowed, true, 'Teacher who confirmed must be able to adjust within 30 minutes');
assert.equal(result.reason, 'within_edit_window');
assert.equal(result.expiresAt, '2026-09-09T10:32:00.000Z');
assert.equal(formatPostConfirmRemaining(result.remainingMs), '12 phút');

result = evaluatePostConfirmEditAccess({
  ...teacherBase,
  now: new Date('2026-09-09T10:32:00.000Z'),
});
assert.equal(result.allowed, true, 'Exact 30-minute boundary must remain editable');

result = evaluatePostConfirmEditAccess({
  ...teacherBase,
  now: new Date('2026-09-09T10:32:00.001Z'),
});
assert.equal(result.allowed, false, 'Teacher must be locked immediately after the 30-minute boundary');
assert.equal(result.reason, 'edit_window_expired');

result = evaluatePostConfirmEditAccess({
  ...teacherBase,
  currentUserId: 'teacher-2',
  now: new Date('2026-09-09T10:10:00.000Z'),
});
assert.equal(result.allowed, false, 'Another teacher must not edit a session they did not confirm');
assert.equal(result.reason, 'not_session_teacher');

result = evaluatePostConfirmEditAccess({
  ...teacherBase,
  hasQuickPermission: false,
  now: new Date('2026-09-09T10:10:00.000Z'),
});
assert.equal(result.allowed, false, 'Ordinary teacher still needs quick-attendance permission');
assert.equal(result.reason, 'missing_permission');

result = evaluatePostConfirmEditAccess({
  ...teacherBase,
  isAdmin: true,
  currentUserId: 'admin-1',
  now: new Date('2026-09-10T10:32:00.001Z'),
});
assert.equal(result.allowed, true, 'Admin must bypass the 30-minute expiry');
assert.equal(result.reason, 'admin_bypass');

result = evaluatePostConfirmEditAccess({
  ...teacherBase,
  hasReportPermission: true,
  hasQuickPermission: false,
  currentUserId: 'report-1',
  now: new Date('2026-09-10T10:32:00.001Z'),
});
assert.equal(result.allowed, true, 'Attendance report permission must bypass the 30-minute expiry');
assert.equal(result.reason, 'report_bypass');

result = evaluatePostConfirmEditAccess({
  ...teacherBase,
  session: { ...session, session_status: 'cancelled' },
  now: new Date('2026-09-09T10:10:00.000Z'),
});
assert.equal(result.allowed, false, 'Cancelled sessions must never enter adjustment mode');
assert.equal(result.reason, 'not_completed');

assert.ok(fs.existsSync(bootstrapUrl), 'Post-confirm adjustment bootstrap must exist');
assert.ok(fs.existsSync(migrationUrl), 'Post-confirm adjustment migration must exist');

const bootstrapSource = fs.readFileSync(bootstrapUrl, 'utf8');
for (const required of [
  'bes_get_extra_attendance_edit_access',
  'bes_update_extra_attendance_session',
  'Còn',
  '30 phút',
  'Lưu điều chỉnh',
]) {
  assert.ok(bootstrapSource.includes(required), `Bootstrap must contain ${required}`);
}
assert.match(bootstrapSource, /hasAttendanceTabAccess\(currentProfile\(\), 'report'\)/, 'Report permission must bypass expiry in the client UI');
assert.match(bootstrapSource, /setInterval\([\s\S]*1000/, 'Countdown must refresh while the dialog is open');
assert.match(bootstrapSource, /attendance-top-actions[\s\S]*Làm mới|title="Làm mới"|\[title="Làm mới"\]/, 'Saving an adjustment must refresh the React attendance view');

const migrationSource = fs.readFileSync(migrationUrl, 'utf8');
for (const required of [
  'bes_extra_attendance_record_changes',
  'bes_get_extra_attendance_edit_access',
  'bes_update_extra_attendance_session',
  "interval '30 minutes'",
  'checked_by',
  'attendance:report',
  'present_count',
  'absent_count',
]) {
  assert.ok(migrationSource.includes(required), `Migration must contain ${required}`);
}
assert.doesNotMatch(
  migrationSource,
  /bes_attendance_access_decision|bes_attendance_access_settings/,
  'Post-confirm grace period must be independent from the Admin global attendance-window decision',
);
assert.match(migrationSource, /security definer[\s\S]*set search_path = ''/, 'Privileged update helper must pin an empty search_path');
assert.match(migrationSource, /revoke all on function public\.bes_update_extra_attendance_session/, 'Update RPC must not be executable by PUBLIC');

const startupSource = fs.readFileSync(startupUrl, 'utf8');
assert.match(startupSource, /attendancePostConfirmEditBootstrap\.js/, 'Startup chain must load the post-confirm adjustment runtime');

console.log('Attendance 30-minute post-confirm adjustment contract OK');
