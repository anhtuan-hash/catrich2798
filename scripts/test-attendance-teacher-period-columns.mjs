import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildAttendanceReport, normalizeSupplementalReportData } from '../src/utils/attendanceReport.js';

const baseSession = {
  teacher_name: 'Giáo viên kiểm thử',
  attendance_date: '2026-09-12',
  session_status: 'completed',
  total_students: 10,
  present_count: 9,
  absent_count: 1,
};

const supplemental = normalizeSupplementalReportData([{
  id: 'supp-1',
  groupId: 'supp-group-1',
  groupName: 'Bổ sung kiến thức 11',
  subject: 'Tiếng Anh',
  teacherName: 'Giáo viên kiểm thử',
  date: '2026-09-12',
  status: 'confirmed',
  lessonPeriods: 2,
  totalStudents: 10,
  presentCount: 9,
  absentCount: 1,
  participants: [],
}]);

assert.equal(
  supplemental.sessions[0]?.lesson_periods,
  2,
  'Học bổ sung must preserve its persisted 1 / 1.5 / 2 lesson-period value in reports.',
);

const report = buildAttendanceReport({
  month: '2026-09',
  sessions: [
    {
      ...baseSession,
      id: 'gifted-1',
      class_id: 'gifted-class',
      class_type: 'gifted',
      class_name: 'Bồi dưỡng Anh 12',
      lesson_periods: 2,
    },
    {
      ...baseSession,
      id: 'remedial-1',
      class_id: 'remedial-class',
      class_type: 'remedial',
      class_name: 'Phụ đạo Anh 12',
      lesson_periods: 1.5,
    },
    ...supplemental.sessions,
  ],
});

assert.equal(report.teacherRows.length, 1, 'The fixture should aggregate to one teacher row.');
const teacher = report.teacherRows[0];
assert.equal(teacher.gifted_periods, 2, 'Teacher summary must total Bồi dưỡng periods separately.');
assert.equal(teacher.remedial_periods, 1.5, 'Teacher summary must total Phụ đạo periods separately.');
assert.equal(teacher.supplemental_periods, 2, 'Teacher summary must total Học bổ sung periods separately for the Bù bài export column.');
assert.equal(teacher.total_periods, 5.5, 'The existing all-source total must remain available for compatibility.');

const exportSource = fs.readFileSync(new URL('../src/utils/attendanceReportExport.js', import.meta.url), 'utf8');
assert.match(
  exportSource,
  /['"]Giáo viên['"]\s*,\s*['"]Số buổi đã dạy['"]\s*,\s*['"]Tổng số tiết bồi dưỡng['"]\s*,\s*['"]Tổng số tiết phụ đạo['"]\s*,\s*['"]Tổng số tiết bù bài['"]/,
  'The teacher XLSX sheet must replace the old total-period column with the three requested period columns.',
);
assert.doesNotMatch(
  exportSource,
  /['"]Giáo viên['"]\s*,\s*['"]Số buổi đã dạy['"]\s*,\s*['"]Tổng số tiết['"]\s*,/,
  'The teacher XLSX sheet must not keep the old single Tổng số tiết column.',
);
assert.match(exportSource, /row\.gifted_periods/, 'The teacher XLSX rows must export Bồi dưỡng periods.');
assert.match(exportSource, /row\.remedial_periods/, 'The teacher XLSX rows must export Phụ đạo periods.');
assert.match(exportSource, /row\.supplemental_periods/, 'The teacher XLSX rows must export Bù bài periods from Học bổ sung data.');
assert.match(exportSource, /merges:\s*\[['"]A1:I1['"],\s*['"]A2:I2['"],\s*['"]A3:I3['"]\]/, 'Teacher sheet title merges must span all nine columns.');
assert.match(exportSource, /autoFilter:\s*`A5:I\$\{5 \+ teacherBodyCount\}`/, 'Teacher sheet filter must span all nine columns.');

console.log('Attendance teacher period columns contract OK');
