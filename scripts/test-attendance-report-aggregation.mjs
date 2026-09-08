import assert from 'node:assert/strict';
import { buildAttendanceMonthlyReport, buildAttendanceReport } from '../src/utils/attendanceReport.js';

const sessions = [
  { id:'s1', class_id:'c1', class_type:'gifted', class_name:'Lớp A', subject:'Tiếng Anh', teacher_name:'GV A', attendance_date:'2026-09-02', checked_at:'2026-09-02T07:10:00Z', teaching_room:'P.201', teaching_time_range:'14:00–15:30', session_status:'completed', lesson_periods:1, total_students:10, present_count:9, absent_count:1, note:'Ôn từ vựng' },
  { id:'s2', class_id:'c1', class_type:'gifted', class_name:'Lớp A', subject:'Tiếng Anh', teacher_name:'GV A', attendance_date:'2026-09-09', checked_at:'2026-09-09T07:10:00Z', teaching_room:'P.201', teaching_time_range:'14:00–15:30', session_status:'completed', lesson_periods:1.5, total_students:10, present_count:10, absent_count:0 },
  { id:'s3', class_id:'c2', class_type:'remedial', class_name:'Lớp B', subject:'Toán', teacher_name:'GV B', attendance_date:'2026-09-10', checked_at:'2026-09-10T08:15:00Z', teaching_room:'P.203', teaching_time_range:'15:45–17:15', session_status:'completed', lesson_periods:2, total_students:8, present_count:7, absent_count:1 },
  { id:'s4', class_id:'c2', class_type:'remedial', class_name:'Lớp B', subject:'Toán', teacher_name:'', attendance_date:'2026-09-11', checked_at:'2026-09-11T08:15:00Z', teaching_room:'P.203', teaching_time_range:'15:45–17:15', session_status:'cancelled', lesson_periods:0, total_students:0, present_count:0, absent_count:0, cancellation_reason:'Mưa lớn' },
  { id:'legacy', class_id:'c1', class_type:'gifted', class_name:'Lớp A', subject:'Tiếng Anh', teacher_name:'GV A', attendance_date:'2026-08-31', checked_at:'2026-08-31T07:00:00Z', total_students:10, present_count:10, absent_count:0 },
];
const records = [
  { session_id:'s1', status:'absent', student_code:'001', student_full_name:'HS 1', school_class_name:'11.1', absence_reason_code:'sick', absence_note:'Sốt' },
  { session_id:'s1', status:'present', student_full_name:'HS 2', absence_reason_code:'', absence_note:'' },
  { session_id:'s3', status:'absent', student_code:'003', student_full_name:'HS 3', school_class_name:'12.3', absence_reason_code:'family', absence_note:'Việc gia đình' },
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

const day = buildAttendanceReport({ sessions, records, classes:[], mode:'day', date:'2026-09-10', classId:'all', teacherName:'all' });
assert.equal(day.sessionRows.length, 1);
assert.equal(day.sessionRows[0].attendance_date, '2026-09-10');
assert.equal(day.sessionRows[0].class_type, 'remedial');
assert.equal(day.sessionRows[0].teaching_room, 'P.203');
assert.equal(day.sessionRows[0].teaching_time_range, '15:45–17:15');
assert.equal(day.sessionRows[0].checked_at, '2026-09-10T08:15:00Z');
assert.equal(day.absenceRows.length, 1);
assert.equal(day.absenceRows[0].reason_code, 'family');
assert.equal(day.absenceRows[0].reason_label, 'Việc gia đình');
assert.equal(day.absenceRows[0].absence_note, 'Việc gia đình');
assert.equal(day.absenceRows[0].teaching_room, 'P.203');
assert.equal(day.metrics.completedSessions, 1);
assert.equal(day.metrics.totalPeriods, 2);

const legacyMonth = buildAttendanceReport({ sessions, records:[], classes:[], mode:'month', month:'2026-08', classId:'all', teacherName:'all' });
assert.equal(legacyMonth.sessionRows[0].teaching_room, '');
assert.equal(legacyMonth.sessionRows[0].teaching_time_range, '');

console.log('Attendance day/month aggregation OK');
