import fs from 'node:fs';
import assert from 'node:assert/strict';

const utilityUrl = new URL('../src/utils/extraClassAttendance.js', import.meta.url);
const navigationUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const adjustmentUrl = new URL('../src/attendancePostConfirmEditBootstrap.js', import.meta.url);
const reportUrl = new URL('../src/utils/attendanceReport.js', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260910_attendance_tardy_status.sql', import.meta.url);

const attendance = await import(utilityUrl);

assert.ok(attendance.ATTENDANCE_STATUS, 'Attendance status constants must exist');
assert.equal(attendance.ATTENDANCE_STATUS.PRESENT, 'present');
assert.equal(attendance.ATTENDANCE_STATUS.LATE, 'late');
assert.equal(attendance.ATTENDANCE_STATUS.ABSENT, 'absent');
assert.equal(attendance.attendanceStatusLabel?.('present'), 'Có mặt');
assert.equal(attendance.attendanceStatusLabel?.('late'), 'Đi trễ');
assert.equal(attendance.attendanceStatusLabel?.('absent'), 'Vắng');

const draft = attendance.buildAttendanceDraft([
  { id: '1', member_key: 'one' },
  { id: '2', member_key: 'two' },
  { id: '3', member_key: 'three' },
]);
assert.ok(draft.every((row) => row.status === 'present' && row.present === true), 'New attendance draft must default every active student to present');

const summary = attendance.attendanceSummary([
  { status: 'present', present: true },
  { status: 'late', present: true },
  { status: 'absent', present: false },
]);
assert.deepEqual(summary, { total: 3, present: 2, late: 1, absent: 1 }, 'Late students must count as present while remaining separately countable');

const navigationSource = fs.readFileSync(navigationUrl, 'utf8');
for (const required of [
  'Đi trễ',
  'p_late_member_keys',
  "ATTENDANCE_STATUS.LATE",
  'selectedLateRecords',
]) {
  assert.ok(navigationSource.includes(required), `Attendance rollcall/history must contain ${required}`);
}
assert.match(navigationSource, /data-status|att-m3-attendance-status/, 'Initial attendance must expose an explicit status selector');

const adjustmentSource = fs.readFileSync(adjustmentUrl, 'utf8');
assert.ok(adjustmentSource.includes('data-status="late"'), 'Post-confirm editor must expose a Đi trễ status button');
assert.ok(adjustmentSource.includes("status === 'late'"), 'Post-confirm editor must preserve and count late records');
assert.doesNotMatch(adjustmentSource, /chuyển\s*<b>Vắng<\/b>\s*→\s*<b>Có mặt<\/b>/, 'Post-confirm help must not treat a late arrival as plain present');

const reportSource = fs.readFileSync(reportUrl, 'utf8');
assert.ok(reportSource.includes('lateInstances'), 'Attendance reporting must expose a separate late count');
assert.ok(reportSource.includes('late_count'), 'Per-session reporting must expose a late count');

assert.ok(fs.existsSync(migrationUrl), 'Tardy attendance migration must exist');
const migrationSource = fs.readFileSync(migrationUrl, 'utf8');
for (const required of [
  "'present', 'late', 'absent'",
  'p_late_member_keys',
  "status in ('present', 'late')",
  'bes_confirm_extra_class_attendance',
  'bes_update_extra_attendance_session',
]) {
  assert.ok(migrationSource.includes(required), `Migration must contain ${required}`);
}

console.log('Attendance tardy status contract OK');
