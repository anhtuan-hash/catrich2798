import fs from 'node:fs';
import assert from 'node:assert/strict';

const utilityUrl = new URL('../src/utils/attendancePostConfirmEdit.js', import.meta.url);
const bootstrapUrl = new URL('../src/attendancePostConfirmEditBootstrap.js', import.meta.url);
const historyBridgeUrl = new URL('../src/attendanceHistoryPostConfirmBridge.js', import.meta.url);
const postConfirmCssUrl = new URL('../src/styles/AttendancePostConfirmEdit.css', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260909_attendance_post_confirm_edit_window.sql', import.meta.url);
const supplementalBaseMigrationUrl = new URL('../supabase/migrations/20260912_supplemental_final_parity.sql', import.meta.url);
const delegatedMigrationUrl = new URL('../supabase/migrations/20260915_delegated_attendance_post_confirm_edit.sql', import.meta.url);
const startupUrl = new URL('../src/tabResumeStability.js', import.meta.url);

const {
  POST_CONFIRM_EDIT_WINDOW_MS,
  evaluatePostConfirmEditAccess,
  formatPostConfirmRemaining,
} = await import(utilityUrl);

assert.equal(POST_CONFIRM_EDIT_WINDOW_MS, 30 * 60 * 1000, 'Attendance adjustment window must be exactly 30 minutes');

const session = {
  id: 'session-1',
  session_status: 'completed',
  checked_at: '2026-09-09T10:02:00.000Z', // 17:02 Asia/Ho_Chi_Minh
  checked_by: 'teacher-1',
};

const operatorBase = {
  session,
  currentUserId: 'teacher-1',
  hasQuickPermission: true,
  isAdmin: false,
  hasReportPermission: false,
};

let result = evaluatePostConfirmEditAccess({
  ...operatorBase,
  now: new Date('2026-09-09T10:20:00.000Z'),
});
assert.equal(result.allowed, true, 'A delegated attendance operator must be able to adjust within 30 minutes');
assert.equal(result.reason, 'within_edit_window');
assert.equal(result.expiresAt, '2026-09-09T10:32:00.000Z');
assert.equal(formatPostConfirmRemaining(result.remainingMs), '12 phút');

result = evaluatePostConfirmEditAccess({
  ...operatorBase,
  now: new Date('2026-09-09T10:32:00.000Z'),
});
assert.equal(result.allowed, true, 'Exact 30-minute boundary must remain editable');

result = evaluatePostConfirmEditAccess({
  ...operatorBase,
  now: new Date('2026-09-09T10:32:00.001Z'),
});
assert.equal(result.allowed, false, 'Delegated attendance operator must be locked immediately after the 30-minute boundary');
assert.equal(result.reason, 'edit_window_expired');

result = evaluatePostConfirmEditAccess({
  ...operatorBase,
  currentUserId: 'teacher-2',
  now: new Date('2026-09-09T10:10:00.000Z'),
});
assert.equal(result.allowed, true, 'Another delegated attendance operator must be able to adjust within 30 minutes even if they did not confirm the session');
assert.equal(result.reason, 'within_edit_window');

result = evaluatePostConfirmEditAccess({
  ...operatorBase,
  hasQuickPermission: false,
  currentUserId: 'readonly-user',
  now: new Date('2026-09-09T10:10:00.000Z'),
});
assert.equal(result.allowed, false, 'Read-only attendance viewers must not gain post-confirm write access');
assert.equal(result.reason, 'missing_permission');

result = evaluatePostConfirmEditAccess({
  ...operatorBase,
  isAdmin: true,
  currentUserId: 'admin-1',
  now: new Date('2026-09-10T10:32:00.001Z'),
});
assert.equal(result.allowed, true, 'Admin must bypass the 30-minute expiry');
assert.equal(result.reason, 'admin_bypass');

result = evaluatePostConfirmEditAccess({
  ...operatorBase,
  hasReportPermission: true,
  hasQuickPermission: false,
  currentUserId: 'report-1',
  now: new Date('2026-09-10T10:32:00.001Z'),
});
assert.equal(result.allowed, true, 'Attendance report permission must bypass the 30-minute expiry');
assert.equal(result.reason, 'report_bypass');

result = evaluatePostConfirmEditAccess({
  ...operatorBase,
  session: { ...session, session_status: 'cancelled' },
  now: new Date('2026-09-09T10:10:00.000Z'),
});
assert.equal(result.allowed, false, 'Cancelled sessions must never enter adjustment mode');
assert.equal(result.reason, 'not_completed');

assert.ok(fs.existsSync(bootstrapUrl), 'Post-confirm adjustment bootstrap must exist');
assert.ok(fs.existsSync(migrationUrl), 'Post-confirm adjustment migration must exist');
assert.ok(fs.existsSync(supplementalBaseMigrationUrl), 'Supplemental final-parity migration must exist');
assert.ok(fs.existsSync(delegatedMigrationUrl), 'Delegated attendance post-confirm migration must exist');

const bootstrapSource = fs.readFileSync(bootstrapUrl, 'utf8');
const historyBridgeSource = fs.readFileSync(historyBridgeUrl, 'utf8');
const postConfirmCssSource = fs.readFileSync(postConfirmCssUrl, 'utf8');
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
assert.match(bootstrapSource, /function tickPostConfirmAccess\(/, 'Countdown refresh must use a lightweight access tick');
assert.doesNotMatch(
  bootstrapSource,
  /setInterval\(\(\) => \{[\s\S]*?queueRender\(\)[\s\S]*?\},\s*1000\)/,
  'The one-second timer must not rebuild the full post-confirm editor DOM',
);
assert.match(bootstrapSource, /restoreHistoryScroll\(/, 'History scroll position must survive required editor re-renders');
assert.match(
  postConfirmCssSource,
  /\.bes-history-post-confirm-bridge \.bes-post-confirm-students\s*\{[\s\S]*?max-height:\s*none[\s\S]*?overflow:\s*visible/,
  'History post-confirm editor must avoid a nested student-list scrollbar',
);
assert.match(bootstrapSource, /attendance-top-actions[\s\S]*Làm mới|title="Làm mới"|\[title="Làm mới"\]/, 'Saving an adjustment must refresh the React attendance view');
assert.match(
  bootstrapSource,
  /data-bes-history-post-confirm-bridge="true"/,
  'Post-confirm runtime must read the dedicated history compatibility surface before the regular rollcall panel',
);
assert.match(historyBridgeSource, /normalizeCompatibilitySurface/, 'History bridge must normalize its own layout');
assert.match(historyBridgeSource, /detail\.append\(surface\)/, 'History bridge must live at the end of the detail flow');
assert.doesNotMatch(historyBridgeSource, /classList\.add\('attendance-rollcall'\)/, 'History bridge must not inherit the real rollcall layout');
assert.doesNotMatch(historyBridgeSource, /style\.display\s*=\s*['"]contents['"]/, 'History bridge must not use display: contents inside the two-column history grid');
assert.match(
  postConfirmCssSource,
  /\.ahv3__shell \.ahv3__detail > \.bes-history-post-confirm-bridge\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/,
  'History adjustment bridge must span the full detail width',
);
assert.match(
  postConfirmCssSource,
  /\.bes-history-post-confirm-bridge > \.bes-post-confirm-edit-card\s*\{[\s\S]*?width:\s*100%/,
  'History adjustment card must fill the bridge instead of being squeezed into one grid column',
);

const migrationSource = fs.readFileSync(migrationUrl, 'utf8');
for (const required of [
  'bes_extra_attendance_record_changes',
  'bes_get_extra_attendance_edit_access',
  'bes_update_extra_attendance_session',
  "interval '30 minutes'",
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

const supplementalBaseMigrationSource = fs.readFileSync(supplementalBaseMigrationUrl, 'utf8');
assert.match(
  supplementalBaseMigrationSource,
  /create or replace function private\.bes_supplemental_attendance_edit_decision/,
  'Supplemental attendance must have its own post-confirm access decision',
);
assert.match(
  supplementalBaseMigrationSource,
  /v_session\.checked_by\s+is\s+distinct\s+from\s+v_uid/,
  'Regression fixture: the current supplemental decision still ties editing to the original confirmer',
);

const delegatedMigrationSource = fs.readFileSync(delegatedMigrationUrl, 'utf8');
assert.match(
  delegatedMigrationSource,
  /create or replace function private\.bes_extra_attendance_edit_decision/,
  'Delegated migration must replace the server-side post-confirm access decision',
);
assert.match(
  delegatedMigrationSource,
  /can_take_extra_class_attendance\(\)/,
  'Delegated migration must authorize through the Admin-granted attendance permission',
);
assert.match(
  delegatedMigrationSource,
  /interval '30 minutes'/,
  'Delegated migration must preserve the 30-minute window anchored to checked_at',
);
assert.match(
  delegatedMigrationSource,
  /create or replace function private\.bes_supplemental_attendance_edit_decision/,
  'Delegated migration must also replace the Học bổ sung post-confirm access decision',
);
assert.match(
  delegatedMigrationSource,
  /private\.bes_is_supplemental_manager\(\)/,
  'Supplemental corrections must retain strict supplemental-manager authorization',
);
assert.doesNotMatch(
  delegatedMigrationSource,
  /checked_by\s+is\s+distinct\s+from|not_session_teacher/,
  'Delegated operators must not be restricted to the account that originally confirmed the session',
);

const startupSource = fs.readFileSync(startupUrl, 'utf8');
assert.match(startupSource, /attendancePostConfirmEditBootstrap\.js/, 'Startup chain must load the post-confirm adjustment runtime');

console.log('Attendance 30-minute delegated post-confirm adjustment contract OK');
