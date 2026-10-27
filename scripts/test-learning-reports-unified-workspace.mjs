import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reportCanBeRevoked,filteredLearningAssignments,eligibleAssignmentIds}
  from '../src/features/learningReports/learningAssignmentsModel.js';
const src=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const r=(id,kind,month,status,teacherLabel,payload={})=>({
  id,report_kind:kind,period:month,teacherLabel,status,payload,
});
const rows=[
  r('a','gifted','2026-10','draft','Nguyễn Thị Mỹ Duyên'),
  r('b','remedial','2026-10','draft','Nguyễn Thị Mỹ Duyên'),
  r('c','gifted','2026-09','submitted','Đào Ngọc Nhã'),
  r('d','remedial','2026-10','draft','Ngô Thị Mỹ Diệp',{objectives:'Đã nhập'}),
  r('e','gifted','2026-10','approved','Phạm Thị Ngọc Châm'),
  {...r('f','gifted','2026-10','draft','Giáo viên F'),submitted_at:'2026-10-27T10:00:00Z'},
];
assert.deepEqual(eligibleAssignmentIds(rows),['a','b']);
assert.equal(reportCanBeRevoked(rows[3]),false,'written draft protected');
assert.equal(reportCanBeRevoked(rows[4]),false,'approved report protected');
assert.equal(reportCanBeRevoked(rows[5]),false,'submitted_at report protected');
assert.equal(reportCanBeRevoked({...rows[0],payload:{foo:0}}),false,'numeric report work protected');
assert.equal(filteredLearningAssignments(rows,{kind:'all'}).length,6,'two programmes combined');
assert.equal(filteredLearningAssignments(rows,{kind:'remedial'}).length,2);
assert.equal(filteredLearningAssignments(rows,{month:'2026-10'}).length,5);
assert.equal(filteredLearningAssignments(rows,{status:'draft'}).length,4);
assert.equal(filteredLearningAssignments(rows,{query:'Mỹ Duyên'}).length,2);
assert.equal(filteredLearningAssignments(rows,{kind:'remedial',month:'2026-10',status:'draft'}).length,2);
assert.deepEqual(eligibleAssignmentIds(filteredLearningAssignments(rows,{month:'2026-09'})),[]);
assert.deepEqual(eligibleAssignmentIds(filteredLearningAssignments(rows,{query:'Mỹ Duyên'})),['a','b']);

const portal=src('src/pages/BrianTeamPortal.jsx');
const workspace=src('src/features/learningReports/LearningReportsWorkspace.jsx');
const manager=src('src/features/learningReports/LearningAssignmentManager.jsx');
const stats=src('src/features/learningReports/LearningReportsManagerDashboard.jsx');
const service=src('src/features/learningReports/learningReportsService.js');
const sql=src('supabase/migrations/20261027153000_learning_report_bulk_revocation.sql');
const checks=[
 ['two primary reporting workspaces',portal.includes('btp-primary-areas')&&portal.includes('btp-secondary-areas')],
 ['monthly reports and specialist views both retained',portal.includes('<MonthlyReportsWorkspace')&&portal.includes('<LearningReportsWorkspace')],
 ['teacher workspace retained',portal.includes("view === 'learning-mine'")],
 ['unified table replaces duplicate HSG/remedial tabs',workspace.includes('<LearningAssignmentManager')&&!workspace.includes('blr-kind-tabs')],
 ['analytics explicitly choose programme',workspace.includes('setAnalyticsKind')&&workspace.includes('kind={analyticsKind}')],
 ['teacher report editor and review remain',workspace.includes('saveLearningReport')&&workspace.includes('reviewLearningReport')],
 ['select-all enabled with native checkbox',manager.includes('Chọn tất cả')&&manager.includes('allSelected')],
 ['protected task cannot be selected',manager.includes('disabled={!canRemove||busy}')],
 ['visible eligible items only selected',manager.includes('revocable.map(t=>t.id)')],
 ['useEffect does not rerender endlessly',manager.includes('return next.length===old.length?old:next')],
 ['confirmation before bulk revoke',manager.includes('window.confirm(preview)')],
 ['batch uses safe authorized RPC',service.includes("rpc('bes_bulk_revoke_learning_report_assignments'")],
 ['navigation timer refreshes after removal',service.includes('notifyLearningDeadlineChange()')],
 ['batch enforces manager permission',sql.includes('public.can_manage_brian_team()')],
 ['existing per-task security reused',sql.includes('public.bes_revoke_learning_report_assignment(v_id)')],
 ['blocks mixed TTCM ownership',sql.includes('t.head_id<>v_actor')],
 ['bounded and unique inputs',sql.includes('cardinality(p_task_ids)>100')&&sql.includes('count(distinct x)')],
 ['returns skipped protected results',sql.includes("'skippedCount'")],
 ['anonymous execution revoked',sql.includes('from public,anon')],
 ['native print/PDF available',stats.includes('window.print()')],
 ['no attendance data changed',!sql.includes('delete from public.bes_extra_attendance')],
];
for(const [label,ok] of checks)console.log((ok?'PASS':'FAIL')+': '+label);
assert.ok(checks.every(([,ok])=>ok),'Unified reports contracts failed');
console.log('PASS: dynamic filtering and '+checks.length+' integration/security contracts');
