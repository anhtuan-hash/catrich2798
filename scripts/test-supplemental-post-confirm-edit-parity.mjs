import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const shell = read('src/components/GlobalAttendanceNavigationTab.jsx');
const editor = read('src/attendancePostConfirmEditBootstrap.js');
const api = read('src/attendance/supplementalLearningApi.js');
const migrationPath = new URL('../supabase/migrations/20260912_supplemental_final_parity.sql', import.meta.url);

assert.match(shell, /data-bes-attendance-source/, 'The shared rollcall must expose its attendance source to the post-confirm editor.');
assert.match(shell, /data-bes-attendance-session-id/, 'The shared rollcall must expose the concrete session id to the post-confirm editor.');

assert.match(editor, /supplemental/, 'The existing post-confirm editor must recognize supplemental sessions.');
assert.match(editor, /besAttendanceSource|bes-attendance-source/, 'The editor must read the rollcall source discriminator.');
assert.match(editor, /besAttendanceSessionId|bes-attendance-session-id/, 'The editor must read the supplemental session id directly.');
assert.match(editor, /getSupplementalAttendanceEditSnapshot/, 'The editor must load a normalized supplemental edit snapshot through the supplemental API.');
assert.match(editor, /updateSupplementalAttendanceSession/, 'The editor must save supplemental corrections through the supplemental API.');
assert.match(editor, /tardy[\s\S]{0,500}late|late[\s\S]{0,500}tardy/, 'The editor must normalize database tardy status to the shared UI late status.');

assert.match(api, /export async function getSupplementalAttendanceEditSnapshot/, 'The supplemental API must expose the post-confirm edit snapshot RPC.');
assert.match(api, /export async function updateSupplementalAttendanceSession/, 'The supplemental API must expose the post-confirm update RPC.');
assert.match(api, /bes_get_supplemental_attendance_edit_snapshot/, 'Snapshot wrapper must call the dedicated supplemental RPC.');
assert.match(api, /bes_update_supplemental_attendance_session/, 'Update wrapper must call the dedicated supplemental RPC.');

assert.equal(fs.existsSync(migrationPath), true, 'The final parity migration must exist.');
const migration = read('supabase/migrations/20260912_supplemental_final_parity.sql');
assert.match(migration, /bes_supplemental_attendance_record_changes/i, 'Supplemental post-confirm corrections must have a dedicated audit trail.');
assert.match(migration, /bes_get_supplemental_attendance_edit_snapshot/i, 'The backend must expose a source-normalized supplemental edit snapshot.');
assert.match(migration, /bes_update_supplemental_attendance_session/i, 'The backend must expose a supplemental correction RPC.');
assert.match(migration, /interval\s+'30 minutes'/i, 'Supplemental corrections must retain the 30-minute teacher edit window.');
assert.match(migration, /attendance_confirmed_at/i, 'Supplemental correction access must be anchored to the original confirmation timestamp.');
assert.doesNotMatch(migration, /set\s+attendance_confirmed_at\s*=\s*clock_timestamp\(\)/i, 'Saving a correction must never restart the edit window.');
assert.match(migration, /present[\s\S]*tardy[\s\S]*absent/i, 'Supplemental correction RPC must support present/tardy/absent statuses.');
assert.match(migration, /change_kind/i, 'Supplemental correction audit must distinguish record and session-note changes.');
assert.match(migration, /private\.bes_is_supplemental_manager\(\)|private\.bes_require_supplemental_manager\(\)/i, 'Supplemental correction RPCs must stay behind strict supplemental authorization.');

console.log('Supplemental post-confirm edit parity contract OK');
