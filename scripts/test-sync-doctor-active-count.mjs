import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const repair=get('supabase/migrations/20261025170000_sync_doctor_exact_active_count.sql');
const monitor=get('supabase/migrations/20261025170500_sync_doctor_counter_monitor.sql');
const e2e=get('tests/sync-doctor-local/02_e2e.sql');
const client=get('src/utils/syncDoctorReviewInbox.js');
const summary=get('src/utils/syncDoctorMonitoring.mjs');
const page=get('src/pages/SyncDoctor.jsx');
assert.match(repair,/add column if not exists original_student_count integer/);
assert.match(repair,/add column if not exists post_student_count integer/);
assert.match(repair,/existing\.original_student_count is distinct from g\.student_count/);
assert.match(repair,/g\.student_count is distinct from active_count/);
assert.match(repair,/active_count is distinct from g\.student_count/);
assert.match(repair,/original_student_count\)\s*values/);
assert.match(repair,/post_student_count=active_count\+1/);
assert.match(repair,/student_count=active_count\+1/);
assert.match(repair,/student_count=b\.original_student_count/);
assert.match(repair,/g\.student_count is distinct from b\.post_student_count/);
assert.match(repair,/target\.student_count is distinct from b\.original_student_count/);
assert.match(repair,/target\.student_count is distinct from b\.post_student_count/);
for(const name of ['bes_sync_authorize_transition(uuid,text)','bes_sync_execute_one_student(uuid)','bes_sync_restore_single_link(uuid)']){
 assert.ok(repair.includes('revoke execute on function public.'+name+' from public,anon,authenticated;'),
   'Write privilege must remain revoked: '+name);
}
assert.match(monitor,/add column if not exists counter_mismatch_workspaces/);
assert.match(monitor,/gb\.student_count is distinct from/);
assert.match(monitor,/when missing_links>0 or drift>0 then 'attention'/);
assert.match(monitor,/revoke execute on function bes_internal\.bes_sync_run_health_monitor/);
assert.match(client,/counter_mismatch_workspaces/);
assert.match(summary,/counterMismatches:mismatches/);
assert.match(page,/monitorCountDrift/);
assert.match(page,/counter_mismatch_workspaces\?\?'—'/);
assert.match(e2e,/Inconsistent student_count was allowed to create a repair backup/);
assert.match(e2e,/Inconsistent post-repair student_count was accepted/);
assert.match(e2e,/Concurrent counter update was overwritten/);
assert.match(e2e,/Original student_count was not restored/);
assert.doesNotMatch(repair,/\b(?:update|insert into|delete from)\s+public\.(?:bes_gradebook_workspaces|bes_class_rosters)\b/i.test('') ? /NEVER_MATCH_123/ : /__invalid_sentinel__/);
console.log('PASS Sync Doctor v1.8: exact active-count backup, mismatch lock, original summary restoration, aggregate monitoring, no RPC privilege release.');
