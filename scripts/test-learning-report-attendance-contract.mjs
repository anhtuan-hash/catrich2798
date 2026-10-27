import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const service=read('src/features/learningReports/learningReportsService.js');
const ui=read('src/features/learningReports/LearningReportsWorkspace.jsx');
const css=read('src/features/learningReports/LearningReportsWorkspace.css');
const sql=read('supabase/migrations/20261027110000_learning_reports_attendance_readthrough.sql');
const old=read('supabase/migrations/20261027100000_learning_reports_gifted_remedial.sql');
const cases=[
  ['five academic-only sections per kind',(service.match(/id:'(team|curriculum|attendance|outcomes|reflection|students)'/g)||[]).length===10],
  ['required academic feedback survives',service.includes('reportProgress')&&service.includes('complete.every(Boolean)')],
  ['no redundant roster and count form inputs',!service.includes("['plannedPeriods'")&&!service.includes("['completedPeriods'")&&!service.includes("['studentCount'")&&!service.includes("['currentStudents'")],
  ['read-only attendance summary surfaced',ui.includes('AttendancePanel')&&ui.includes('Dữ liệu tự động từ Brian Attendance')],
  ['legacy manual attendance entry removed from UI',!ui.includes('defaultSession')&&!ui.includes('saveLearningSession')&&!ui.includes('Nhật ký từng buổi dạy')],
  ['class mapping only assigned by TTCM',sql.includes('Chỉ TTCM phụ trách được liên kết lớp')&&sql.includes('v_task.head_id')],
  ['never guess teachers by name',!sql.includes('teacher_name =')&&!sql.includes('teacher_name like')],
  ['kind-matched class binding',sql.includes('c.class_type=v_task.report_kind')&&sql.includes('c.class_type=v_task.report_kind')],
  ['confirmed attendance only',sql.includes("session_status='completed'")&&sql.includes("s.class_type=v_task.report_kind")],
  ['per-month filtering',sql.includes("s.attendance_date>=v_task.period")&&sql.includes("s.attendance_date<(v_task.period+interval '1 month')::date")],
  ['include late within present, count late separately',sql.includes("r.status='late'")&&sql.includes('greatest(0,present_count-late_count)')],
  ['reuse class assignment across months',sql.includes('primary key(head_id,teacher_id,report_kind,class_id)')],
  ['no PII in attendance payload',!sql.includes('student_full_name')&&!sql.includes('student_code_snapshot')&&!sql.includes('full_name_snapshot')],
  ['RLS enabled for bindings',sql.includes('enable row level security;')],
  ['authenticated RPC only',sql.includes('from public,anon')&&sql.includes('to authenticated')],
  ['snapshot on review',sql.includes("new.status='approved'")&&sql.includes('new.attendance_snapshot:=public.bes_learning_report_attendance(new.id)')],
  ['teacher cannot submit without class link',service.includes('attendance.classes?.length')],
  ['progress preserves all academic sections',ui.includes('LEARNING_REPORT_SECTIONS[selected.report_kind].map')],
  ['existing report assignments preserved',old.includes('bes_issue_learning_reports')],
  ['responsive attendance panel',css.includes('.blr-attendance-metrics')&&css.includes('@media(max-width:560px)')],
];
for(const [name,pass] of cases)console.log((pass?'PASS':'FAIL')+': '+name);
assert.ok(cases.every(x=>x[1]),'Attendance-linked reporting contract');
console.log(cases.length+' attendance-linked reporting contracts passed.');
