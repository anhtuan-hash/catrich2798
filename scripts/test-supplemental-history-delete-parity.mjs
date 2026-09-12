import assert from 'node:assert/strict';
import fs from 'node:fs';

const uiPath = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const apiPath = new URL('../src/attendance/supplementalLearningApi.js', import.meta.url);
const migrationPath = new URL('../supabase/migrations/20260912_supplemental_history_delete_parity.sql', import.meta.url);

const ui = fs.readFileSync(uiPath, 'utf8');
const api = fs.readFileSync(apiPath, 'utf8');

assert.ok(
  fs.existsSync(migrationPath),
  'A supplemental-history delete migration must exist so confirmed Học bổ sung sessions can be unlocked safely.',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

assert.match(
  api,
  /export\s+async\s+function\s+deleteSupplementalAttendanceHistory\s*\(/,
  'The supplemental API must expose a dedicated delete-history action.',
);
assert.match(
  api,
  /bes_delete_supplemental_attendance_history/,
  'The supplemental API must call the hardened delete-history RPC.',
);

assert.doesNotMatch(
  ui,
  /canDeleteAttendanceHistory\s*&&\s*!isSupplementalHistorySession\(selectedSession\)/,
  'The delete button must not exclude Học bổ sung history sessions.',
);
assert.doesNotMatch(
  ui,
  /!canDeleteAttendanceHistory\s*\|\|\s*isSupplementalHistorySession\(session\)/,
  'The single-delete handler must not reject Học bổ sung before routing to its dedicated RPC.',
);
assert.match(
  ui,
  /deleteSupplementalAttendanceHistory\s*\(/,
  'The history UI must route Học bổ sung deletion through the supplemental delete API.',
);
assert.match(
  ui,
  /const\s+targets\s*=\s*combinedHistorySessions\.filter\(/,
  'Bulk deletion must resolve selected rows from combined history so Học bổ sung is not silently omitted.',
);
assert.match(
  ui,
  /supplemental_session_id/,
  'The UI must use the real supplemental session UUID instead of the synthetic history id.',
);

assert.match(
  sql,
  /create\s+or\s+replace\s+function\s+public\.bes_delete_supplemental_attendance_history\s*\(\s*p_session_id\s+uuid\s*\)/i,
  'The database must define the dedicated supplemental delete-history RPC.',
);
assert.match(
  sql,
  /can_delete_extra_attendance_history\s*\(\s*\)/i,
  'Supplemental deletion must reuse the exact same destructive-history authorization as Phụ đạo/Bồi dưỡng.',
);
assert.match(
  sql,
  /delete\s+from\s+public\.bes_supplemental_session_participants[\s\S]*session_id\s*=\s*p_session_id/i,
  'Deleting supplemental history must clear its frozen attendance participant snapshot.',
);
assert.match(
  sql,
  /update\s+public\.bes_supplemental_sessions[\s\S]*status\s*=\s*'scheduled'/i,
  'Deleting supplemental history must unlock the same scheduled lesson for attendance again.',
);
for (const field of ['roster_frozen_at', 'attendance_confirmed_at', 'checked_by', 'checked_by_name', 'proof_path', 'total_students', 'present_count', 'absent_count', 'tardy_count']) {
  assert.match(sql, new RegExp(`${field}\\s*=`, 'i'), `The reset RPC must clear ${field}.`);
}
assert.match(
  sql,
  /grant\s+execute\s+on\s+function\s+public\.bes_delete_supplemental_attendance_history\s*\(\s*uuid\s*\)\s+to\s+authenticated/i,
  'Only authenticated callers should receive EXECUTE; authorization is enforced inside the RPC.',
);

console.log('Supplemental history delete parity contract OK');
