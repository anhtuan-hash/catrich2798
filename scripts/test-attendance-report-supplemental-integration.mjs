import assert from 'node:assert/strict';

const reportModule = await import('../src/utils/attendanceReport.js');
const normalizeSupplementalAttendanceReportData = reportModule.normalizeSupplementalAttendanceReportData;
const { buildAttendanceReport } = reportModule;

assert.equal(
  typeof normalizeSupplementalAttendanceReportData,
  'function',
  'attendanceReport must expose a real supplemental-to-native report normalizer.',
);

const supplemental = normalizeSupplementalAttendanceReportData([
  {
    id: 'supp-session-1',
    groupId: 'supp-group-1',
    groupName: 'Lớp bổ sung Toán 12',
    title: 'Lớp bổ sung Toán 12',
    date: '2026-09-11',
    subject: 'Toán',
    teacherName: 'Trần Nguyễn Dự',
    room: 'A103',
    timeRange: '16:45–17:30',
    status: 'confirmed',
    totalStudents: 3,
    presentCount: 1,
    tardyCount: 1,
    absentCount: 1,
    checkedByName: 'Admin',
    sessionNote: 'Buổi bổ sung',
    participants: [
      { studentId: 's1', studentCode: '1000', fullName: 'Nguyễn Anh Tuấn', schoolClassName: '12.3', status: 'present' },
      { studentId: 's2', studentCode: '1001', fullName: 'Đặng Ngọc Hưng', schoolClassName: '12.4', status: 'tardy' },
      { studentId: 's3', studentCode: '1002', fullName: 'Trần Minh An', schoolClassName: '12.5', status: 'absent', absenceReasonCode: 'excused', absenceNote: 'Có phép' },
    ],
  },
]);

assert.equal(supplemental.sessions.length, 1);
assert.equal(supplemental.records.length, 3);
assert.equal(supplemental.classes.length, 1);
assert.equal(supplemental.sessions[0].class_type, 'supplemental');
assert.equal(supplemental.sessions[0].present_count, 2, 'Đi trễ counts as present for the attendance denominator, matching the native report model.');
assert.equal(supplemental.sessions[0].absent_count, 1);
assert.deepEqual(supplemental.records.map((row) => row.status), ['present', 'late', 'absent']);
assert.equal(supplemental.classes[0].class_name, 'Lớp bổ sung Toán 12');

const regularSession = {
  id: 'extra-1',
  class_id: 'extra-class-1',
  class_type: 'remedial',
  class_name: 'Phụ đạo Tiếng Anh 12',
  subject: 'Tiếng Anh',
  teacher_name: 'Đào Ngọc Nhân',
  attendance_date: '2026-09-11',
  session_status: 'completed',
  lesson_periods: 1,
  total_students: 1,
  present_count: 1,
  absent_count: 0,
};

const combined = buildAttendanceReport({
  sessions: [regularSession, ...supplemental.sessions],
  records: supplemental.records,
  classes: [{ id: 'extra-class-1', class_type: 'remedial', class_name: 'Phụ đạo Tiếng Anh 12' }, ...supplemental.classes],
  mode: 'day',
  date: '2026-09-11',
  activityType: 'all',
});

assert.equal(combined.metrics.completedSessions, 2, 'Tất cả must include native and supplemental sessions in one report.');
assert.equal(combined.metrics.presentInstances, 3);
assert.equal(combined.metrics.lateInstances, 1);
assert.equal(combined.metrics.absentInstances, 1);
assert.equal(combined.sessionRows.some((row) => row.class_type === 'supplemental'), true);

const supplementalOnly = buildAttendanceReport({
  sessions: [regularSession, ...supplemental.sessions],
  records: supplemental.records,
  classes: [{ id: 'extra-class-1', class_type: 'remedial', class_name: 'Phụ đạo Tiếng Anh 12' }, ...supplemental.classes],
  mode: 'day',
  date: '2026-09-11',
  activityType: 'supplemental',
});

assert.equal(supplementalOnly.metrics.completedSessions, 1, 'Học bổ sung filter must keep only supplemental sessions.');
assert.equal(supplementalOnly.sessionRows.every((row) => row.class_type === 'supplemental'), true);

console.log('Attendance report supplemental integration contract OK');
