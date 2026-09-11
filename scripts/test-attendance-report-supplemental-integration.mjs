import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as reportUtils from '../src/utils/attendanceReport.js';

const supplementalRows = [{
  id: 'sup-1',
  groupId: 'group-1',
  groupName: 'Học bổ sung Toán 12',
  title: 'Học bổ sung Toán 12',
  date: '2026-09-11',
  subject: 'Toán',
  teacherName: 'GV Bổ sung',
  room: 'A105',
  timeRange: '16:45–17:30',
  status: 'confirmed',
  totalStudents: 2,
  presentCount: 1,
  absentCount: 0,
  tardyCount: 1,
  checkedByName: 'Admin',
  sessionNote: 'Ôn tập',
  participants: [
    { studentId: 'st-1', canonicalStudentKey: 'st-1', studentCode: '001', fullName: 'Học sinh A', schoolClassName: '12.1', status: 'present', absenceReasonCode: '', absenceNote: '' },
    { studentId: 'st-2', canonicalStudentKey: 'st-2', studentCode: '002', fullName: 'Học sinh B', schoolClassName: '12.2', status: 'tardy', absenceReasonCode: '', absenceNote: '' },
  ],
}];

assert.equal(
  typeof reportUtils.normalizeSupplementalReportData,
  'function',
  'Report utilities must expose a supplemental-to-native report normalizer.',
);

const normalized = reportUtils.normalizeSupplementalReportData(supplementalRows);
assert.equal(normalized.sessions.length, 1);
assert.equal(normalized.records.length, 2);
assert.equal(normalized.classes.length, 1);
assert.equal(normalized.sessions[0].class_type, 'supplemental');
assert.equal(normalized.sessions[0].class_name, 'Học bổ sung Toán 12');
assert.equal(normalized.sessions[0].present_count, 2, 'Tardy students count as present for attendance-rate semantics.');
assert.equal(normalized.records[1].status, 'late');
assert.equal(normalized.classes[0].class_type, 'supplemental');

const extraSessions = [
  { id: 'gifted-1', class_id: 'gifted-class', class_type: 'gifted', class_name: 'Bồi dưỡng Anh 12', subject: 'Tiếng Anh', teacher_name: 'GV A', attendance_date: '2026-09-11', session_status: 'completed', lesson_periods: 2, total_students: 10, present_count: 9, absent_count: 1 },
  { id: 'remedial-1', class_id: 'remedial-class', class_type: 'remedial', class_name: 'Phụ đạo Toán 12', subject: 'Toán', teacher_name: 'GV B', attendance_date: '2026-09-11', session_status: 'completed', lesson_periods: 2, total_students: 8, present_count: 7, absent_count: 1 },
];
const merged = reportUtils.buildAttendanceReport({
  sessions: [...extraSessions, ...normalized.sessions],
  records: normalized.records,
  classes: normalized.classes,
  mode: 'day',
  date: '2026-09-11',
  classId: 'all',
  teacherName: 'all',
});
assert.equal(merged.metrics.completedSessions, 3, 'All report totals must include gifted, remedial and supplemental sessions together.');
assert.ok(merged.sessionRows.some((row) => row.class_type === 'supplemental'));
assert.ok(merged.teacherRows.some((row) => row.teacher_name === 'GV Bổ sung'));

const reportComponent = fs.readFileSync(new URL('../src/components/attendance/AttendanceMonthlyReport.jsx', import.meta.url), 'utf8');
assert.match(reportComponent, /bes_list_supplemental_history/, 'The native report surface must load supplemental history from the authoritative RPC.');
assert.match(reportComponent, /bes-attendance-activity-filter-change/, 'The native report must react to the shared activity filter pills.');
assert.match(reportComponent, /supplemental/i, 'The native report must expose supplemental rows/classes in its unified filters and table.');

const attendanceShell = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
assert.match(
  attendanceShell,
  /includeSupplemental=\{canSeeSupplementalHistory\}/,
  'The native report must only request supplemental data for the dedicated supplemental managers.',
);

const bootstrap = fs.readFileSync(new URL('../src/supplementalAttendanceReportingBootstrap.js', import.meta.url), 'utf8');
assert.doesNotMatch(
  bootstrap,
  /loadSupplementalStudentReport[\s\S]*renderPanel\(reportHtml\(rows\),\s*'Báo cáo Học bổ sung'\)/,
  'Học bổ sung must no longer render a separate report panel.',
);

console.log('Unified supplemental attendance report contract OK');
