import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'supabase/migrations/20260914_attendance_archive_change_log_preservation.sql';
assert.ok(fs.existsSync(path), `Missing required migration: ${path}`);
const sql = fs.readFileSync(path, 'utf8');

assert.match(sql, /alter\s+table\s+public\.bes_attendance_archive[\s\S]*changes_snapshot\s+jsonb/i, 'Archive must retain attendance record-change history in a dedicated snapshot.');
assert.match(sql, /from\s+public\.bes_extra_attendance_record_changes[\s\S]*where\s+.*session_id\s*=\s*p_session_id/i, 'Extra-class archive must snapshot record-change history before deleting the active session.');
assert.match(sql, /from\s+public\.bes_supplemental_attendance_record_changes[\s\S]*where\s+.*session_id\s*=\s*p_session_id/i, 'Supplemental archive must snapshot record-change history.');
assert.match(sql, /delete\s+from\s+public\.bes_supplemental_attendance_record_changes[\s\S]*session_id\s*=\s*p_session_id/i, 'Supplemental archive must remove old change-log rows from the active session after snapshotting them.');
assert.match(sql, /insert\s+into\s+public\.bes_extra_attendance_record_changes[\s\S]*jsonb_populate_recordset[\s\S]*changes_snapshot/i, 'Restoring an extra-class attendance archive must restore its change-log rows.');
assert.match(sql, /insert\s+into\s+public\.bes_supplemental_attendance_record_changes[\s\S]*jsonb_populate_recordset[\s\S]*changes_snapshot/i, 'Restoring a supplemental attendance archive must restore its change-log rows.');

console.log('Attendance archive change-log preservation contract: PASS');
