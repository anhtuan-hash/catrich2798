import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=src('supabase/migrations/20261027132000_learning_reports_instructor_scoped.sql');
const safeIndex=src('supabase/migrations/20261027133000_learning_report_teacher_name_uniqueness.sql');
const ui=src('src/features/learningReports/LearningReportsWorkspace.jsx');
const service=src('src/features/learningReports/learningReportsService.js');
const css=src('src/features/learningReports/LearningReportsWorkspace.css');
const checks=[
  ['TTCM chooses actual instructor per class',ui.includes('Giáo viên thực dạy của lớp này')&&ui.includes("c.instructors||[]")],
  ['Teacher identity explicitly shown',ui.includes('teacherLabel={teacherName(selected.teacher_id)}')],
  ['Per-class instructor selection persisted',ui.includes('instructorName:byClass[c.id]')],
  ['Teacher rows display actual attendance instructor',ui.includes('row.instructorName')],
  ['Class summary displays instructor',ui.includes('c.instructorName')],
  ['Student does not resubmit attendance counts',!ui.includes('saveLearningSession')],
  ['Client calls scoped instructor binding',service.includes('bes_learning_report_bind_instructors')],
  ['No client call to class-only RPC',!service.includes("rpc('bes_learning_report_bind_classes'")],
  ['Old class-only RPC access revoked',migration.includes('revoke execute on function public.bes_learning_report_bind_classes(uuid,uuid[]) from authenticated')],
  ['Null legacy binding never counts',migration.includes("nullif(btrim(b.attendance_teacher_name),'') is not null")],
  ['Instructor comes from class teaching roster',migration.includes('public.bes_extra_class_teachers ct')],
  ['Roster ID enforced where populated',migration.includes('ct.teacher_id is null or ct.teacher_id=v_task.teacher_id')],
  ['Only TTCM can bind',migration.includes("or not (select public.can_manage_brian_team())")],
  ['Teacher identity tied to report user',migration.includes('b.teacher_id=v_task.teacher_id')],
  ['Matching class AND exact normalized instructor',migration.includes("b.class_id=s.class_id")&&migration.includes('btrim(s.teacher_name)')&&migration.includes('btrim(b.attendance_teacher_name)')],
  ['Only confirmed attendance sessions',migration.includes("s.session_status='completed'")],
  ['Only the reporting month',migration.includes('s.attendance_date>=v_task.period')&&migration.includes("s.attendance_date<(v_task.period+interval '1 month')::date")],
  ['Different reporters cannot claim same instructor',migration.includes('b.teacher_id<>v_task.teacher_id')&&migration.includes('assignedToOther')],
  ['Unique normalized mapping at DB level',safeIndex.includes('create unique index')&&safeIndex.includes('regexp_replace')],
  ['TTCM options are instructor-scoped',migration.includes("'confirmedSessions'")&&migration.includes("'instructors'")],
  ['No individual student names leave reporting RPC',!migration.includes('student_full_name')&&!migration.includes('student_code_snapshot')],
  ['Approved reports freeze source snapshot in existing module',src('supabase/migrations/20261027110000_learning_reports_attendance_readthrough.sql').includes('new.attendance_snapshot:=public.bes_learning_report_attendance(new.id)')],
  ['Responsive per-instructor cards',css.includes('.blr-instructor-class')],
];
for(const [name,pass] of checks)console.log((pass?'PASS':'FAIL')+': '+name);
assert.ok(checks.every(([,pass])=>pass),'Per-instructor attendance reporting contracts failed');
console.log(checks.length+' instructor-scoped reporting contracts passed.');
