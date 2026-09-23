import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const api = read('src/attendance/supplementalLearningApi.js');
const admin = read('src/supplementalLearningBootstrap.js');
const migrationPath = new URL('../supabase/migrations/20260912_supplemental_hard_delete_class.sql', import.meta.url);

assert.match(api, /export async function deleteSupplementalClass\s*\(/, 'The supplemental API must expose permanent class deletion.');
assert.match(api, /bes_delete_supplemental_class/, 'Permanent class deletion must call its dedicated RPC.');

assert.match(admin, /deleteSupplementalClass/, 'The Học bổ sung admin UI must use the permanent-delete API.');
assert.match(admin, /data-action=["']delete-class["']/, 'The visible “Xóa lớp” action must be a permanent-delete action, not archive.');
assert.doesNotMatch(admin, /data-action=["']archive-class["'][^>]*>Xóa lớp</, 'A button labeled “Xóa lớp” must never be wired to archive semantics.');
assert.match(admin, /Xóa vĩnh viễn|không thể khôi phục/i, 'Permanent deletion must require an explicit destructive confirmation.');

assert.equal(fs.existsSync(migrationPath), true, 'The supplemental hard-delete migration must exist.');
const migration = read('supabase/migrations/20260912_supplemental_hard_delete_class.sql');
assert.match(migration, /create\s+or\s+replace\s+function\s+public\.bes_delete_supplemental_class/i, 'The backend must expose a dedicated hard-delete RPC.');
assert.match(migration, /private\.bes_require_supplemental_manager\(\)/i, 'Permanent deletion must stay behind supplemental-manager authorization.');
assert.match(migration, /delete\s+from\s+public\.bes_supplemental_sessions[\s\S]*where[\s\S]*group_id\s*=\s*p_group_id/i, 'Hard delete must explicitly remove class sessions before the group row.');
assert.match(migration, /delete\s+from\s+public\.bes_supplemental_groups[\s\S]*where[\s\S]*id\s*=\s*p_group_id/i, 'Hard delete must remove the class row itself.');
assert.match(migration, /proofPaths|proof_paths|proof_path/i, 'Hard delete must return proof paths for best-effort storage cleanup.');
assert.match(migration, /revoke\s+all\s+on\s+function\s+public\.bes_delete_supplemental_class\(uuid\)\s+from\s+public\s*,\s*anon/i, 'Anonymous callers must not be able to hard-delete supplemental classes.');
assert.match(migration, /grant\s+execute\s+on\s+function\s+public\.bes_delete_supplemental_class\(uuid\)\s+to\s+authenticated/i, 'Signed-in clients must reach the authorized hard-delete RPC.');

assert.match(migration, /bes_archive_supplemental_class[\s\S]*status\s+in\s*\(\s*'scheduled'\s*,\s*'in_progress'\s*\)/i, 'Archive fallback must also close in-progress future/current sessions.');
assert.match(migration, /bes_list_supplemental_attendance[\s\S]*archived_at\s+is\s+null/i, 'Daily supplemental attendance must exclude archived classes defensively.');
assert.match(migration, /bes_list_supplemental_attendance[\s\S]*g\.active\s*=\s*true/i, 'Daily supplemental attendance must exclude inactive classes defensively.');

console.log('Supplemental permanent class deletion contract OK');
