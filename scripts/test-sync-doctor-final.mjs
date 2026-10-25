import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const repair=get('supabase/migrations/20261025130000_sync_doctor_safe_repair_rollback.sql');
const monitor=get('supabase/migrations/20261025132500_sync_doctor_health_monitor.sql');
const ui=get('src/pages/SyncDoctor.jsx');
const client=get('src/utils/syncDoctorReviewInbox.js');
assert.match(repair,/create or replace function public\.bes_sync_authorize_transition/);
assert.match(repair,/create or replace function public\.bes_sync_execute_one_student/);
assert.match(repair,/create or replace function public\.bes_sync_restore_single_link/);
assert.match(repair,/r\.requester_id=actor/);
assert.match(repair,/r\.execution_authorized_by is distinct from r\.requester_id/);
assert.match(repair,/r\.rollback_authorized_by is distinct from r\.requester_id/);
assert.match(repair,/b\.rehearsal_ok is not true/);
assert.match(repair,/b\.expires_at<=now\(\)/);
assert.match(repair,/encode\(sha256\(convert_to\(g\.payload::text,'UTF8'\)\),'hex'\)<>b\.snapshot_hash/);
assert.match(repair,/g\.updated_at is distinct from b\.post_revision/);
assert.match(repair,/post_checksum/);
assert.match(repair,/jsonb_array_length\(proposed->'students'\)<>previous_count\+1/);
assert.match(repair,/\(proposed-'students'\)<>\(g\.payload-'students'\)/);
assert.match(repair,/set payload=b\.snapshot,student_count=before_count/);
for(const signature of ['bes_sync_authorize_transition(uuid,text)','bes_sync_execute_one_student(uuid)','bes_sync_restore_single_link(uuid)']){
  assert.ok(repair.includes('revoke execute on function public.'+signature+' from authenticated;'),
    'Release hold must revoke EXECUTE for '+signature);
}
assert.match(monitor,/alter table public\.bes_sync_monitor_runs enable row level security/);
assert.match(monitor,/grant select on public\.bes_sync_monitor_runs to authenticated/);
assert.match(monitor,/bes_sync_monitor_runs_read_admin/);
assert.match(monitor,/cron\.schedule\('bes_sync_monitor_daily_v2'/);
assert.match(monitor,/delete from public\.bes_sync_monitor_runs where checked_at<now\(\)-interval '90 days'/);
assert.doesNotMatch(monitor,/\b(?:delete from|update|insert into)\s+public\.(?:bes_gradebook_workspaces|bes_class_rosters|bes_homeroom_workspaces)\b/i);
assert.match(client,/listSyncDoctorMonitorRuns/);
assert.match(client,/\.from\('bes_sync_monitor_runs'\)/);
assert.match(ui,/t\.monitorWarning/);
assert.match(ui,/t\.repairLocked/);
assert.match(ui,/tab===6/);
assert.match(ui,/possible_missing_links/);
console.log('PASS Sync Doctor final-stage safety gate: academic write RPCs held; strict rollback invariants; scheduled metadata-only health reporting.');
