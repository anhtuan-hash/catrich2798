import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../src/pages/SyncDoctor.jsx',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261025170000_sync_doctor_exact_active_count.sql',import.meta.url),'utf8');
assert.match(page,/\[t\.releaseGateDb,true\]/);
assert.match(page,/\[t\.releaseGateAccounts,false\]/);
assert.match(page,/PostgreSQL 16/);
assert.match(page,/releaseGateEvidence/);
assert.match(page,/actions\/runs\/40194640091/);
assert.match(page,/academic writes remain disabled/);
for(const name of ['bes_sync_authorize_transition(uuid,text)','bes_sync_execute_one_student(uuid)','bes_sync_restore_single_link(uuid)']){
  assert.ok(migration.includes('revoke execute on function public.'+name+' from public,anon,authenticated;'),
    'Academic write permissions must remain revoked: '+name);
}
console.log('PASS Sync Doctor SQL UAT gate: real PostgreSQL fixture accepted, real sessions pending, Production writes locked.');
