import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const api = read('src/attendance/supplementalLearningApi.js');
const ui = read('src/supplementalLearningBootstrap.js');
const migrationPath = 'supabase/migrations/20260912_supplemental_class_hard_delete.sql';
assert.ok(fs.existsSync(path.join(root, migrationPath)), 'Missing hard-delete migration.');
const migration = read(migrationPath);

assert.match(api, /export async function deleteSupplementalClass\(/, 'Supplemental API must expose a true hard-delete wrapper.');
assert.match(api, /bes_delete_supplemental_class/, 'Hard-delete wrapper must call bes_delete_supplemental_class.');

assert.doesNotMatch(ui, /data-action="archive-class"[^>]*>Xóa lớp</, 'The visible Xóa lớp action must not be wired to archive semantics.');
assert.match(ui, /data-action="delete-class"/, 'Supplemental class cards must expose a true delete-class action.');
assert.match(ui, /deleteSupplementalClass\(client, classId\)/, 'Delete action must call the hard-delete API.');
assert.match(ui, /xóa vĩnh viễn|xóa hoàn toàn/i, 'Permanent deletion must be stated clearly in the confirmation copy.');

assert.match(migration, /create or replace function public\.bes_delete_supplemental_class\(/i, 'Migration must create a hard-delete RPC.');
assert.match(migration, /perform private\.bes_require_supplemental_manager\(\)/i, 'Hard-delete RPC must retain strict supplemental authorization.');
assert.match(migration, /delete from public\.bes_supplemental_attendance_record_changes/i, 'Hard delete must clear supplemental correction audit rows.');
assert.match(migration, /delete from public\.bes_supplemental_session_participants/i, 'Hard delete must clear session participant snapshots.');
assert.match(migration, /delete from public\.bes_supplemental_sessions/i, 'Hard delete must clear every session for the class.');
assert.match(migration, /delete from public\.bes_supplemental_group_memberships/i, 'Hard delete must clear class memberships.');
assert.match(migration, /delete from public\.bes_supplemental_group_teachers/i, 'Hard delete must clear class teachers.');
assert.match(migration, /delete from public\.bes_supplemental_groups/i, 'Hard delete must remove the class row itself.');
assert.match(migration, /revoke all on function public\.bes_delete_supplemental_class\(uuid\) from public, anon/i, 'Anonymous users must not execute hard delete.');
assert.match(migration, /grant execute on function public\.bes_delete_supplemental_class\(uuid\) to authenticated/i, 'Authenticated callers use the RPC, which enforces manager authorization internally.');

assert.match(migration, /create or replace function public\.bes_list_supplemental_attendance/i, 'Migration must harden the schedule reader too.');
assert.match(migration, /g\.archived_at is null/i, 'Attendance schedule must exclude sessions whose parent class is archived.');
assert.match(migration, /g\.active = true/i, 'Attendance schedule must exclude sessions whose parent class is inactive.');
assert.match(migration, /s\.group_id is null/i, 'Legacy adhoc supplemental sessions without a parent group must remain readable.');

console.log('supplemental hard-delete contract: PASS');
