import fs from 'node:fs';
import assert from 'node:assert/strict';

function read(path) {
  assert.ok(fs.existsSync(path), `Missing required file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const migration = read('supabase/migrations/20260914_attendance_archive.sql');
const api = read('src/attendance/attendanceArchiveApi.js');
const ui = read('src/components/GlobalAttendanceNavigationTab.jsx');
const panel = read('src/components/attendance/AttendanceArchivePanel.jsx');
const css = read('src/components/attendance/AttendanceArchive.css');

for (const token of [
  'bes_attendance_archive',
  'bes_archive_attendance_history',
  'bes_list_attendance_archive',
  'bes_restore_attendance_archive',
  'bes_request_attendance_archive_delete',
  'bes_review_attendance_archive_delete',
  'bes_finalize_attendance_archive_delete',
  "'approved'",
  'revoke all on function',
  'grant execute on function',
  'to authenticated',
]) {
  assert.ok(migration.toLowerCase().includes(token.toLowerCase()), `Migration contract missing: ${token}`);
}
assert.match(migration, /revoke\s+all\s+on\s+function[\s\S]*from\s+(?:public\s*,\s*)?anon\b/i, 'Archive RPC execution must be revoked from anonymous callers.');
assert.doesNotMatch(migration, /delete\s+from\s+storage\.objects/i, 'Database RPCs must not delete Storage metadata directly.');
assert.match(migration, /create\s+or\s+replace\s+function\s+public\.bes_finalize_attendance_archive_delete\s*\([^)]*\)[\s\S]*?as\s+\$\$[\s\S]*?end;\s*\$\$;/i, 'Permanent-delete finalizer must use valid PostgreSQL dollar quoting.');
assert.match(migration, /bes_finalize_attendance_archive_delete[\s\S]*if\s+not\s+public\.is_admin\(\)/i, 'Only Admin may finalize permanent deletion.');
assert.match(migration, /bes_restore_attendance_archive[\s\S]*delete_request_status\s*=\s*'approved'/i, 'Approved deletions must be blocked from restore while finalization is pending.');
assert.match(migration, /Buổi Học bổ sung này đã có dữ liệu điểm danh mới/i, 'Supplemental restore must guard against overwriting a newly attended session.');

for (const token of [
  'archiveAttendanceHistory',
  'listAttendanceArchive',
  'restoreAttendanceArchive',
  'requestAttendanceArchiveDelete',
  'reviewAttendanceArchiveDelete',
  'finalizeAttendanceArchiveDelete',
]) {
  assert.ok(api.includes(token), `Archive API missing: ${token}`);
}
assert.match(api, /storage\.from\(ATTENDANCE_PROOF_BUCKET\)\.remove\(\[proofPath\]\)/, 'Approved permanent deletion must remove proof via the Supabase Storage API.');
assert.match(api, /finalizeAttendanceArchiveDelete\(client, archiveId\)/, 'Archive row deletion must happen only after proof cleanup succeeds.');

assert.ok(migration.includes("select public.bes_archive_attendance_history('extra', p_session_id)"), 'Legacy extra-class delete RPC must soft-delete into archive.');
assert.ok(migration.includes("select public.bes_archive_attendance_history('supplemental', p_session_id)"), 'Legacy supplemental delete RPC must soft-delete into archive.');
assert.ok(migration.includes('if not public.is_admin()'), 'Permanent-delete review must be Admin-only.');

assert.ok(ui.includes("tab: 'archive'"), 'Attendance must expose an archive tab.');
assert.ok(ui.includes('Kho lưu trữ'), 'Archive tab label is missing.');
assert.ok(ui.includes('archiveCount'), 'Archive tab must expose an item-count badge.');
assert.ok(ui.includes("view === 'archive'"), 'Archive view rendering is missing.');
assert.ok(ui.includes('AttendanceArchivePanel'), 'Archive panel must be rendered in Attendance.');
assert.ok(ui.includes('archiveAttendanceHistory'), 'History deletion must route through archive RPC.');
assert.ok(!ui.includes('deleteAttendanceHistoryAtSource(session)'), 'Legacy hard-delete helper must not remain in the history delete path.');

const singleDeleteStart = ui.indexOf('async function deleteAttendanceSession(session)');
const singleDeleteEnd = ui.indexOf('function toggleHistorySelectionMode()', singleDeleteStart);
assert.ok(singleDeleteStart >= 0 && singleDeleteEnd > singleDeleteStart, 'Single history-delete function must be discoverable.');
const singleDeleteSource = ui.slice(singleDeleteStart, singleDeleteEnd);
assert.ok(!singleDeleteSource.includes('removeAttendanceProofPaths'), 'Archiving must retain proof images for restoration.');
assert.ok(singleDeleteSource.includes('loadArchive'), 'Archiving must refresh archive count/list.');

for (const token of ['Khôi phục', 'Yêu cầu xóa vĩnh viễn', 'Duyệt xóa vĩnh viễn', 'Từ chối', 'Hoàn tất xóa vĩnh viễn']) {
  assert.ok(panel.includes(token), `Archive panel missing action: ${token}`);
}
assert.ok(panel.includes("status === 'approved'"), 'Archive panel must represent the approved-but-not-yet-finalized state.');
assert.ok(css.includes('@media'), 'Archive UI must include responsive/mobile styling.');
assert.ok(css.includes('attendance-tab-badge'), 'Archive badge styling is missing.');

console.log('Attendance archive contract: PASS');
