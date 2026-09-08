import assert from 'node:assert/strict';
import { buildAttendanceMonthlyReport } from '../src/utils/attendanceReport.js';

const sessions = [
  { id:'s1', class_id:'c1', class_name:'Lớp A', subject:'Anh', teacher_name:'GV A', attendance_date:'2026-09-02', session_status:'completed', lesson_periods:1, total_students:10, present_count:9, absent_count:1 },
  { id:'s2', class_id:'c1', class_name:'Lớp A', subject:'Anh', teacher_name:'GV A', attendance_date:'2026-09-09', session_status:'completed', lesson_periods:1.5, total_students:10, present_count:10, absent_count:0 },
  { id:'s3', class_id:'c2', class_name:'Lớp B', subject:'Toán', teacher_name:'GV B', attendance_date:'2026-09-10', session_status:'completed', lesson_periods:2, total_students:8, present_count:7, absent_count:1 },
  { id:'s4', class_id:'c2', class_name:'Lớp B', subject:'Toán', teacher_name:'', attendance_date:'2026-09-11', session_status:'cancelled', lesson_periods:0, total_students:0, present_count:0, absent_count:0, cancellation_reason:'Mưa lớn' },
  { id:'legacy', class_id:'c1', class_name:'Lớp A', subject:'Anh', teacher_name:'GV A', attendance_date:'2026-08-31', total_students:10, present_count:10, absent_count:0 },
];
const records = [
  { session_id:'s1', status:'absent', student_full_name:'HS 1' },
  { session_id:'s1', status:'present', student_full_name:'HS 2' },
  { session_id:'s3', status:'absent', student_full_name:'HS 3' },
];

const report = buildAttendanceMonthlyReport({ sessions, records, classes:[], month:'2026-09', classId:'all', teacherName:'all' });
assert.equal(report.metrics.completedSessions, 3);
assert.equal(report.metrics.cancelledSessions, 1);
assert.equal(report.metrics.totalPeriods, 4.5);
assert.equal(report.metrics.presentInstances, 26);
assert.equal(report.metrics.absentInstances, 2);
assert.equal(report.metrics.attendanceRate, 26 / 28);
assert.equal(report.teacherRows.find((x) => x.teacher_name === 'GV A').total_periods, 2.5);
assert.equal(report.teacherRows.find((x) => x.teacher_name === 'GV B').total_periods, 2);
assert.equal(report.filteredSessions.find((x) => x.session_status === 'cancelled').lesson_periods, 0);
assert.equal(report.absenceRows.length, 2);
assert.ok(report.absenceRows.every((x) => x.session_status !== 'cancelled'));

const filtered = buildAttendanceMonthlyReport({ sessions, records, classes:[], month:'2026-09', classId:'all', teacherName:'GV A' });
assert.equal(filtered.metrics.completedSessions, 2);
assert.equal(filtered.metrics.totalPeriods, 2.5);

console.log('Attendance monthly aggregation OK');
