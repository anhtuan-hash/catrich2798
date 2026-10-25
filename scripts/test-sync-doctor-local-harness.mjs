import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
const read=p=>readFileSync(p,'utf8');
const e2e=read('tests/sync-doctor-local/02_e2e.sql');
const bootstrap=read('tests/sync-doctor-local/01_bootstrap.sql');
const runner=read('scripts/test-sync-doctor-local-postgres.sh');
const extracted=execFileSync(process.execPath,
  ['scripts/sync-doctor-extract-local-functions.mjs'],{encoding:'utf8',maxBuffer:200000});
const names=[
  'public.bes_sync_preview_review',
  'public.bes_sync_create_private_backup',
  'public.bes_sync_rehearse_private_restore',
  'public.bes_sync_authorize_transition',
  'public.bes_sync_execute_one_student',
  'public.bes_sync_restore_single_link',
];
for(const name of names){
  assert.ok(extracted.includes('create or replace function '+name+'('),'Missing real function '+name);
}
assert.equal((extracted.match(/create or replace function /gi)||[]).length,6);
for(const name of ['bes_sync_authorize_transition(uuid,text)',
  'bes_sync_execute_one_student(uuid)','bes_sync_restore_single_link(uuid)']){
  assert.ok(extracted.includes('revoke execute on function public.'+name+' from public,anon,authenticated;'),
    'Keep Production write RPCs disabled even in release artifact');
}
assert.match(extracted,/Expected exactly one academic update/);
assert.match(extracted,/Expected exactly one rollback target/);
assert.match(extracted,/b\.post_checksum/);
assert.match(extracted,/r\.requester_id/);
assert.match(bootstrap,/create schema auth/);
assert.match(bootstrap,/create schema bes_internal/);
assert.match(bootstrap,/create table public\.bes_gradebook_workspaces/);
assert.match(bootstrap,/create table bes_internal\.bes_sync_backup_snapshots/);
assert.match(e2e,/begin;\s*do \$scenario\$/i);
assert.match(e2e,/\$scenario\$;\s*rollback;/i);
assert.match(e2e,/SYNTH/);
assert.match(e2e,/Concurrent score edit was overwritten/);
assert.match(e2e,/Exact backup was not restored/);
assert.match(e2e,/Ambiguous target was allowed/);
assert.match(e2e,/Ordinary teacher unexpectedly/);
assert.match(e2e,/Requester executed their own repair/);
assert.match(e2e,/where e\.request_id=local_request_id/);
assert.match(runner,/127\.0\.0\.1/);
assert.match(runner,/DATABASE_URL/);
assert.match(runner,/PGSERVICE/);
assert.match(runner,/PGHOSTADDR/);
assert.match(runner,/sync_doctor_fixture_/);
assert.match(runner,/dropdb --if-exists/);
assert.match(runner,/PGCONNECT_TIMEOUT=5/);
assert.doesNotMatch(runner,/supabase (?:link|db push|start|branch)/i);
assert.doesNotMatch(runner,/\b(?:https?:\/\/|supabase\.co)\b/i);
const bash=spawnSync('bash',['-n','scripts/test-sync-doctor-local-postgres.sh'],{encoding:'utf8'});
assert.equal(bash.status,0,bash.stderr||'bash shell syntax failed');
console.log('PASS Sync Doctor free local SQL harness: extracted six real functions; verified disposable loopback runner, synthetic fixtures, release gate and rollback checks. SQL runtime E2E NOT executed.');
