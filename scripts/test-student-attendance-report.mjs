import assert from 'node:assert/strict';
import { buildStudentAttendanceReport, attendanceAlert, studentIdentity } from '../src/utils/studentAttendanceReport.js';

const sessions = [
  {id:'one',class_id:'a',class_type:'remedial',class_name:'Phụ đạo Toán',subject:'Toán',teacher_name:'GV A',attendance_date:'2026-10-02',session_status:'completed',lesson_periods:2},
  {id:'two',class_id:'b',class_type:'gifted',class_name:'Bồi dưỡng Anh',subject:'Tiếng Anh',teacher_name:'GV B',attendance_date:'2026-10-03',session_status:'completed',lesson_periods:1.5},
  {id:'three',class_id:'a',class_type:'remedial',class_name:'Phụ đạo Toán',subject:'Toán',teacher_name:'GV A',attendance_date:'2026-10-04',session_status:'completed',lesson_periods:.5},
  {id:'cancel',class_id:'a',class_type:'remedial',attendance_date:'2026-10-05',session_status:'cancelled',lesson_periods:2},
  {id:'scheduled',class_id:'a',class_type:'remedial',attendance_date:'2026-10-06',session_status:'scheduled',lesson_periods:2},
];
const person = {student_code:'HS001',student_full_name:'Nguyễn Văn A',school_class_name:'12.6'};
const records = [
  {id:'one-old',session_id:'one',...person,status:'absent',recorded_at:'2026-10-02T10:00:00Z'},
  {id:'one-new',session_id:'one',...person,status:'present',recorded_at:'2026-10-02T11:00:00Z'},
  {id:'two',session_id:'two',...person,status:'late'},
  {id:'three',session_id:'three',...person,status:'absent',absence_reason_code:'unexcused'},
  {id:'cancel',session_id:'cancel',...person,status:'absent'},
  {id:'scheduled',session_id:'scheduled',...person,status:'absent'},
  {id:'other',session_id:'one',student_code:'HS002',student_full_name:'Nguyễn Văn A',school_class_name:'11.2',status:'present'},
];
const report = buildStudentAttendanceReport({sessions,records});
assert.equal(report.students.length,2,'separate students with the same name');
const s=report.students.find(row=>row.studentCode==='HS001');
assert.ok(s);
assert.equal(s.sessionCount,3);
assert.equal(s.classCount,2);
assert.equal(s.totalPeriods,4);
assert.equal(s.presentPeriods,3.5);
assert.equal(s.absentPeriods,.5);
assert.equal(s.lateCount,1);
assert.equal(s.unexcusedCount,1);
assert.equal(s.rate,.875);
assert.equal(s.alert,'watch');
assert.equal(s.subjectRows.length,2);
assert.equal(report.eligibleSessions,3,'cancelled and unconfirmed excluded');
assert.equal(report.detailedRecords,4,'duplicate recorded status consolidated');
assert.equal(report.totals.totalPeriods,6,'second pupil contributes own two lesson periods');
assert.equal(buildStudentAttendanceReport({sessions,records,activityType:'enrichment'}).students.find(row=>row.studentCode==='HS001').presentPeriods,1.5);
assert.equal(buildStudentAttendanceReport({sessions,records,grade:'11'}).students.length,1);
assert.equal(buildStudentAttendanceReport({sessions,records,schoolClass:'12.6'}).students.length,1);
assert.equal(buildStudentAttendanceReport({sessions,records,subject:'Tiếng Anh'}).students.length,1);
assert.equal(buildStudentAttendanceReport({sessions,records,alert:'watch'}).students.length,1);
assert.equal(attendanceAlert({totalPeriods:10,presentPeriods:10,unexcusedCount:2,lateCount:0}),'danger');
assert.equal(attendanceAlert({totalPeriods:10,presentPeriods:10,unexcusedCount:0,lateCount:3}),'watch');
assert.equal(attendanceAlert({totalPeriods:0,presentPeriods:0,unexcusedCount:0,lateCount:0}),'unknown');
assert.notEqual(studentIdentity({student_full_name:'Nguyễn A',school_class_name:'10.1'}),studentIdentity({student_full_name:'Nguyễn A',school_class_name:'10.2'}));
assert.equal(buildStudentAttendanceReport({sessions,records:[{session_id:'scheduled',...person,status:'absent'}]}).totals.students,0);
console.log('Student attendance reporting checks passed.');
