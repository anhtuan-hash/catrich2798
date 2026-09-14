import fs from 'node:fs';
import assert from 'node:assert/strict';

function read(path) {
  assert.ok(fs.existsSync(path), `Missing required file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const migration = read('supabase/migrations/20260914_attendance_archive.sql');
const api = read('src/attendance/attendanceArchiveApi.js');
const ui = read('src/components/GlobalAttendanceNavigationTab.jsx');
const css = read('src/components/attendance/AttendanceArchive.css');

for (const token of [
  'bes_attendance_archive',
  'bes_archive_attendance_history',
  'bes_list_attendance_archive',
  'bes_restore_attendance_archive',
  'bes_request_attendance_archive_delete',
  'bes_review_attendance_archive_delete',
  'revoke all on function',
  'from anon',
  'grant execute on function',
  'to authenticated',
]) {
  assert.ok(migration.toLowerCase().includes(token.toLowerCase()), `Migration contract missing: ${token}`);
}

for (const token of [
  'archiveAttendanceHistory',
  'listAttendanceArchive',
  'restoreAttendanceArchive',
  'requestAttendanceArchiveDelete',
  'reviewAttendanceArchiveDelete',
]) {
  assert.ok(api.includes(token), `Archive API missing: ${token}`);
}

assert.ok(ui.includes("tab: 'archive'"), 'Attendance must expose an archive tab.');
assert.ok(ui.includes('Kho lưu trữ'), 'Archive tab label is missing.');
assert.ok(ui.includes('archiveCount'), 'Archive tab must expose an item-count badge.');
assert.ok(ui.includes("view === 'archive'"), 'Archive view rendering is missing.');
assert.ok(ui.includes('archiveAttendanceHistory'), 'History deletion must route through archive RPC.');
assert.ok(!ui.includes("deleteAttendanceHistoryAtSource(session)"), 'Legacy hard-delete helper must not remain in the history delete path.');
assert.ok(css.includes('@media'), 'Archive UI must include responsive/mobile styling.');

console.log('Attendance archive contract: PASS');
