import assert from 'node:assert/strict';
import fs from 'node:fs';

const uiPath = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const archiveApiPath = new URL('../src/attendance/attendanceArchiveApi.js', import.meta.url);
const migrationPath = new URL('../supabase/migrations/20260914_attendance_archive.sql', import.meta.url);

const ui = fs.readFileSync(uiPath, 'utf8');
const api = fs.readFileSync(archiveApiPath, 'utf8');

assert.ok(
  fs.existsSync(migrationPath),
  'Attendance archive migration must exist so Học bổ sung history can be removed reversibly.',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

assert.match(
  api,
  /export\s+async\s+function\s+archiveAttendanceHistory\s*\(/,
  'The attendance archive API must expose the shared first-delete action.',
);
assert.match(
  api,
  /p_source_type:\s*isSupplemental\s*\?\s*'supplemental'\s*:\s*'extra'/,
  'The shared archive API must explicitly route Học bổ sung sessions as supplemental.',
);

assert.doesNotMatch(
  ui,
  /canDeleteAttendanceHistory\s*&&\s*!isSupplementalHistorySession\(selectedSession\)/,
  'The archive button must not exclude Học bổ sung history sessions.',
);
assert.doesNotMatch(
  ui,
  /!canDeleteAttendanceHistory\s*\|\|\s*isSupplementalHistorySession\(session\)/,
  'The single archive handler must not reject Học bổ sung.',
);
assert.doesNotMatch(
  ui,
  /if\s*\(\s*isSupplementalHistorySession\(target\)\s*\)\s*return\s*;/,
  'Bulk selection must allow an individual Học bổ sung history row to be selected.',
);
assert.doesNotMatch(
  ui,
  /filteredHistory\.filter\(\(session\)\s*=>\s*!isSupplementalHistorySession\(session\)\)/,
  'Select-all must include Học bổ sung rows instead of filtering them out.',
);
assert.match(
  ui,
  /archiveAttendanceHistory\s*\(\s*client\s*,\s*session\s*\)/,
  'The history UI must route Học bổ sung first deletion through the reversible archive API.',
);
assert.match(
  ui,
  /const\s+targets\s*=\s*combinedHistorySessions\.filter\(/,
  'Bulk archive must resolve selected rows from combined history so Học bổ sung is not silently omitted.',
);
assert.match(
  ui,
  /supplemental_session_id/,
  'The UI must preserve the real supplemental session UUID instead of relying only on the synthetic history id.',
);

assert.match(
  sql,
  /create\s+or\s+replace\s+function\s+public\.bes_archive_attendance_history\s*\(\s*p_source_type\s+text\s*,\s*p_session_id\s+uuid\s*\)/i,
  'The database must define the source-aware attendance archive RPC.',
);
assert.match(
  sql,
  /can_delete_extra_attendance_history\s*\(\s*\)/i,
  'Supplemental archiving must reuse the exact same destructive-history authorization as Phụ đạo/Bồi dưỡng.',
);
assert.match(
  sql,
  /else\s+select\s+\*\s+into\s+v_supp[\s\S]*?from\s+public\.bes_supplemental_sessions[\s\S]*?bes_supplemental_session_participants/i,
  'Supplemental archive must snapshot and process its participant rows.',
);
assert.match(
  sql,
  /update\s+public\.bes_supplemental_sessions[\s\S]*status\s*=\s*'scheduled'/i,
  'Archiving supplemental history must unlock the same scheduled lesson for attendance again.',
);
for (const field of ['roster_frozen_at', 'attendance_confirmed_at', 'checked_by', 'checked_by_name', 'proof_path', 'total_students', 'present_count', 'absent_count', 'tardy_count']) {
  assert.match(sql, new RegExp(`${field}\\s*=`, 'i'), `The archive reset flow must clear ${field} from the active session.`);
}
assert.match(
  sql,
  /create\s+or\s+replace\s+function\s+public\.bes_delete_supplemental_attendance_history[\s\S]*bes_archive_attendance_history\s*\(\s*'supplemental'/i,
  'The legacy supplemental delete RPC must be a compatibility wrapper around archive.',
);
assert.match(
  sql,
  /grant\s+execute\s+on\s+function\s+public\.bes_archive_attendance_history\s*\(\s*text\s*,\s*uuid\s*\)\s+to\s+authenticated/i,
  'Only authenticated callers should receive archive EXECUTE; authorization is enforced inside the RPC.',
);

console.log('Supplemental history archive parity contract OK');
