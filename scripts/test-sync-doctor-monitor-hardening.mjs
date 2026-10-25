import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeSyncMonitor,SYNC_MONITOR_MAX_AGE_HOURS} from '../src/utils/syncDoctorMonitoring.mjs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const now=Date.parse('2026-10-25T12:00:00Z');
const latest={checked_at:'2026-10-25T04:00:00Z',school_year:'2026-2027',
  status:'attention',canonical_classes:27,gradebook_workspaces:48,
  possible_missing_links:63,affected_workspaces:3};
const older={...latest,checked_at:'2026-10-24T04:00:00Z',possible_missing_links:58};
assert.equal(SYNC_MONITOR_MAX_AGE_HOURS,36);
assert.equal(summarizeSyncMonitor([],now).kind,'unverified');
assert.equal(summarizeSyncMonitor([latest,older],now).kind,'attention');
assert.equal(summarizeSyncMonitor([latest,older],now).delta,5);
assert.equal(summarizeSyncMonitor([latest,older],now).affected,3);
assert.equal(summarizeSyncMonitor([{...latest,status:'healthy',possible_missing_links:0}],now).kind,'healthy');
assert.equal(summarizeSyncMonitor([{...latest,status:'partial'}],now).kind,'partial');
assert.equal(summarizeSyncMonitor([{...latest,canonical_classes:0}],now).kind,'partial');
assert.equal(summarizeSyncMonitor([latest],now+37*3600000).kind,'stale');
assert.equal(summarizeSyncMonitor([{...latest,checked_at:'bad timestamp'}],now).kind,'stale');
assert.equal(summarizeSyncMonitor([{...latest,checked_at:'2026-10-27T12:00:00Z'}],now).kind,'stale');
assert.equal(summarizeSyncMonitor([latest,{...older,school_year:'2025-2026'}],now).delta,null);
const migration=read('supabase/migrations/20261025143000_bes_sync_repair_scope_hardening.sql');
const page=read('src/pages/SyncDoctor.jsx');
const css=read('src/pages/SyncDoctor.css');
assert.match(migration,/Target workspace scope is ambiguous/);
assert.match(migration,/Rollback target workspace ambiguous/);
assert.match(migration,/Expected exactly one academic update/);
assert.match(migration,/Expected exactly one rollback target/);
assert.match(migration,/get diagnostics affected_rows = row_count/);
assert.match(migration,/returning updated_at into new_rev/);
assert.match(migration,/and school_year=g.school_year and class_name=g.class_name/);
for(const fname of ['bes_sync_authorize_transition(uuid,text)','bes_sync_execute_one_student(uuid)','bes_sync_restore_single_link(uuid)']){
  assert.ok(migration.includes('revoke execute on function public.'+fname+' from public,anon,authenticated;'),
    'Migration must keep '+fname+' inaccessible');
}
assert.match(page,/summarizeSyncMonitor\(monitorRuns\)/);
assert.match(page,/tab===0\|\|tab===6/);
assert.match(page,/controller\.current\?\.abort\(\)/);
assert.match(page,/setReport\(null\);setSelected\(null\);setHistory\(\[\]\)/);
assert.match(page,/monitorAlertTitle/);
assert.match(page,/monitorTrend/);
assert.match(css,/bsd-live-health/);
console.log('PASS Sync Doctor v1.5: stale/partial/attention differentiation, admin overview alert, user-state isolation, unique workspace and row-count guard, write permissions held.');
