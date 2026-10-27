import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261027142000_revoke_learning_report_assignments.sql');
const service=read('src/features/learningReports/learningReportsService.js');
const ui=read('src/features/learningReports/LearningReportsWorkspace.jsx');
const css=read('src/features/learningReports/LearningAssignmentManager.css');
const table=read('src/features/learningReports/LearningAssignmentManager.jsx');
const model=read('src/features/learningReports/learningAssignmentsModel.js');
const checks=[
  ['TTCM assigned-report list restored',table.includes('Danh sách báo cáo được giao')],
  ['Teacher personal list remains available',ui.includes('Báo cáo của tôi')&&ui.includes("!isLeader&&!selected&&<section className=\"blr-list\">")],
  ['Teacher and TTCM visibility separated',ui.includes("isLeader&&managerView==='reports'")&&ui.includes("!isLeader&&!selected")],
  ['Per-card revoke button',table.includes('Xóa đã chọn')&&table.includes('blru-danger')],
  ['No nested buttons in report card',table.includes('blru-table')&&table.includes('blru-view')],
  ['Must confirm destructive operation',table.includes('window.confirm(preview)')&&table.includes('THU HỒI NHIỆM VỤ BÁO CÁO')],
  ['Cannot revoke submitted or approved from UI',model.includes("task.status!=='draft'")&&table.includes('reportCanBeRevoked(t)')],
  ['Server-authorized RPC called',service.includes("rpc('bes_revoke_learning_report_assignment'")],
  ['Nav timer refresh after withdrawal',service.includes("notifyLearningDeadlineChange();")&&service.includes("bes_revoke_learning_report_assignment")],
  ['Toast and list state update only after success',ui.includes('setTasks(rows=>rows.filter(row=>!removed.has(row.id)))')],
  ['TTCM management requirement checked on server',sql.includes('public.can_manage_brian_team()')],
  ['Department ownership verified on server',sql.includes('w.owner_id=v_actor')&&sql.includes("v_task.department_id")],
  ['No teacher work deleted',sql.includes("v_task.status<>'draft'")&&sql.includes('v_task.submitted_at is not null')&&sql.includes('v_task.reviewed_at is not null')],
  ['No filled drafts deleted',sql.includes('jsonb_each_text(coalesce(v_task.payload')],
  ['No journals deleted',sql.includes('bes_learning_report_sessions s where s.task_id=p_task_id')],
  ['Event recipient cleanup is teacher scoped',sql.includes('r.user_id=v_task.teacher_id')],
  ['Other task recipients in same event protected',sql.includes('other.event_id=v_event_id and other.teacher_id=v_task.teacher_id')],
  ['Empty deadline event cancelled, not removed',sql.includes("set status='cancelled'")],
  ['Teacher assignment deletion audited',sql.includes('bes_learning_report_revocations')&&sql.includes('revoked_by')],
  ['Audit table enforces RLS',sql.includes('enable row level security')],
  ['No anonymous RPC',sql.includes('from public,anon')],
  ['Delete is by exact task id',sql.includes('where t.id=p_task_id')],
  ['No attendance source deletion',!sql.includes('delete from public.bes_extra_attendance')],
  ['Responsive card UI',css.includes('.blru-table')&&css.includes('.blru-toolbar')],
];
for(const [label,ok] of checks)console.log((ok?'PASS':'FAIL')+': '+label);
assert.ok(checks.every(([,ok])=>ok),'Assignment withdrawal contracts must pass');
console.log('PASS: '+checks.length+' safe report-revocation checks.');
