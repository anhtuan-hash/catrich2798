import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL(
  '../supabase/migrations/20261027155000_learning_reports_dual_kind_campaign_unique.sql',import.meta.url
),'utf8');
const dispatch=fs.readFileSync(new URL(
  '../supabase/migrations/20261027131100_smart_dispatch_event_immutable_guard.sql',import.meta.url
),'utf8');

const checks=[
  ['previous campaign-only rule detected',migration.includes("UNIQUE (campaign_id, teacher_id)'")],
  ['both programmes allowed for one teacher in same campaign',migration.includes('unique (campaign_id, teacher_id, report_kind)')],
  ['original stable constraint name preserved',migration.includes('add constraint bes_learning_report_tasks_campaign_id_teacher_id_key')],
  ['business unique index retained',migration.includes('bes_learning_report_one_per_teacher_kind_month')],
  ['migration guards against unexpected constraint changes',migration.includes("Unexpected learning report campaign uniqueness")],
  ['no original report data updated or deleted',!/\bdelete\s+from\b|\bupdate\s+public\.bes_learning_report_tasks\b/i.test(migration)],
  ['dispatch accepts two types in a single preview',dispatch.includes("p_kinds text[] default array['gifted','remedial']")],
  ['dispatch still prevents duplicate teacher + kind + month',dispatch.includes('on conflict(head_id,department_id,teacher_id,report_kind,period) do nothing')],
  ['each programme receives separate deadline event',dispatch.includes("select distinct g->>'kind'")&&dispatch.includes("v_event_by_kind->>(v_group->>'kind')")],
  ['events are scoped to teacher and programme',dispatch.includes("(g->>'teacherId')::uuid")&&dispatch.includes("g->>'kind'=v_kind")],
];
for(const [label,pass] of checks)console.log((pass?'PASS':'FAIL')+': '+label);
assert.ok(checks.every(([,ok])=>ok),'Dual-kind campaign migration regression');
console.log('PASS: '+checks.length+' dual-programme campaign checks. Database shadow-table insertion smoke test is required separately.');
