import assert from 'node:assert/strict';
import fs from 'node:fs';
import {schoolYearMonths,buildLearningYearDashboard,summarizeLearningReports} from '../src/features/learningReports/learningReportsAnalytics.js';

const from=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const report={
  id:'r1',teacherId:'u1',period:'2026-10',status:'approved',
  dueAt:'2026-10-30T10:00:00Z',hasRecommendation:true,assessmentCount:2,
};
const report2={id:'r2',teacherId:'u2',period:'2026-10',status:'draft',hasRecommendation:false};
const session={id:'S1',teacherId:'u1',classId:'C1',period:'2026-10',periods:1.5,expected:10,present:9,absent:1,late:1};
const session2={id:'S2',teacherId:'u2',classId:'C1',period:'2026-10',periods:2,expected:30,present:15,absent:15,late:0};

assert.deepEqual(schoolYearMonths(2026),[
  '2026-08','2026-09','2026-10','2026-11','2026-12',
  '2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07',
]);
const raw={reports:[report,report2],sessions:[session,session2,{...session}],deadlines:[]};
const school=buildLearningYearDashboard(raw,2026);
const oct=school.months.find(m=>m.period==='2026-10');
assert.equal(oct.summary.teachers,2);
assert.equal(oct.summary.assigned,2);
assert.equal(oct.summary.submitted,1);
assert.equal(oct.summary.approved,1);
assert.equal(oct.summary.draft,1);
assert.equal(oct.summary.submissionPct,50);
assert.equal(oct.summary.sessions,2,'session ID repeated in raw data must count once');
assert.equal(oct.summary.classes,1,'co-teachers do not duplicate a class');
assert.equal(oct.summary.periods,3.5,'fractional teaching periods stay intact');
assert.equal(oct.summary.expected,40);
assert.equal(oct.summary.present,24);
assert.equal(oct.summary.attendancePct,60,'weighted attendance, not average of teacher rates');
assert.equal(oct.summary.recommendations,1);
assert.equal(oct.summary.assessments,2);
assert.equal(school.teachers.find(t=>t.teacherId==='u1').summary.sessions,1);
assert.equal(school.teachers.find(t=>t.teacherId==='u2').summary.sessions,1);
assert.equal(school.months[0].summary.submissionPct,null,'unassigned month must be marked not assigned');
const cleared=buildLearningYearDashboard({...raw,deadlines:[{period:'2026-10',cleared:true,dueAt:null}]},2026);
assert.equal(cleared.months[2].deadline.value,null);
assert.equal(cleared.months[2].deadline.cleared,true);
assert.equal(summarizeLearningReports([],[]).attendancePct,null);

const ui=from('src/features/learningReports/LearningReportsWorkspace.jsx');
const dashboard=from('src/features/learningReports/LearningReportsManagerDashboard.jsx');
const sql=from('supabase/migrations/20261027143000_learning_reports_manager_analytics.sql');
const security=from('supabase/migrations/20261027143500_learning_report_deadline_rls_scope.sql');
const service=from('src/features/learningReports/learningReportsService.js');
const checks=[
 ['two subdashboards wired by kind',ui.includes('kind={analyticsKind}')&&ui.includes('setAnalyticsKind')],
 ['manager-only render',ui.includes("isLeader&&!selected&&managerView!=='reports'")],
 ['monthly mode',ui.includes("managerView==='summary'")],
 ['history mode',ui.includes("managerView==='history'")],
 ['correct month selection',dashboard.includes("onModeChange('summary')")],
 ['school year CSV',dashboard.includes("exportYear")],
 ['monthly CSV',dashboard.includes("exportMonth")],
 ['deadline set and clear',dashboard.includes("submitDeadline(true)")&&dashboard.includes("submitDeadline(false)")],
 ['server auth checks owner',sql.includes("w.owner_id=v_actor")],
 ['server excludes unconfirmed attendance',sql.includes("s.session_status='completed'")],
 ['instructor matching',sql.includes("btrim(s.teacher_name)")&&sql.includes("btrim(b.attendance_teacher_name)")],
 ['duplicate session eliminated',sql.includes('distinct on (id)')],
 ['approved source uses snapshot',sql.includes("t.status='approved' and t.attendance_snapshot is not null")],
 ['deadline keys scoped',sql.includes('primary key(head_id,department_id,report_kind,period)')],
 ['RLS correlations qualified',security.includes("t.head_id=bes_learning_report_deadlines.head_id")],
 ['no anonymous RPC',sql.includes('from public,anon')],
 ['non-PII server payload',!sql.includes('student_full_name')&&!sql.includes('student_code_snapshot')],
 ['effective due date in teacher listing',service.includes('effective_due_at')],
 ['no input to score from attendance manual reentry',!dashboard.includes('saveLearningSession')],
];
for (const [label,pass] of checks)console.log((pass?'PASS':'FAIL')+': '+label);
assert.ok(checks.every(([,p])=>p),'Dashboard contract checks must pass');
console.log('PASS: 21 arithmetic/assertion checks + '+checks.length+' static contract checks.');
