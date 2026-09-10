import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildAttendanceReport } from '../src/utils/attendanceReport.js';

const exportSource = fs.readFileSync(new URL('../src/utils/attendanceReportExport.js', import.meta.url), 'utf8');

const report = buildAttendanceReport({
  month: '2026-09',
  sessions: [{
    id: 'session-1',
    class_id: 'class-1',
    class_type: 'gifted',
    class_name: 'Bồi dưỡng Tiếng Anh 11',
    subject: 'Tiếng Anh',
    teacher_name: 'Nguyễn Đặng Minh Hoa',
    attendance_date: '2026-09-10',
    checked_at: '2026-09-10T10:29:16.000Z',
    checked_by_name: 'Nguyễn Thị Hồng Thắm',
    total_students: 12,
    present_count: 8,
    absent_count: 4,
    lesson_periods: 2,
    teaching_room: 'A202',
    teaching_time_range: '16h45 đến 18h15',
    session_status: 'completed',
  }],
  records: [{
    id: 'record-late-1',
    session_id: 'session-1',
    class_id: 'class-1',
    member_key: 'student-1',
    student_code: 'HS001',
    student_full_name: 'Nguyễn Văn An',
    school_class_name: '11.3',
    status: 'late',
  }],
  classes: [{ id: 'class-1', class_type: 'gifted', class_name: 'Bồi dưỡng Tiếng Anh 11', subject: 'Tiếng Anh' }],
});

assert.equal(report.sessionRows[0].late_count, 1, 'Session summary must count tardy students');
assert.equal(report.lateRows?.length, 1, 'Report model must expose one detail row for each tardy student');
assert.equal(report.lateRows?.[0]?.student_full_name, 'Nguyễn Văn An');
assert.equal(report.lateRows?.[0]?.school_class_name, '11.3');
assert.equal(report.lateRows?.[0]?.class_name, 'Bồi dưỡng Tiếng Anh 11');
assert.equal(report.lateRows?.[0]?.teacher_name, 'Nguyễn Đặng Minh Hoa');
assert.equal(report.lateRows?.[0]?.teaching_room, 'A202');

const pdfHeader = exportSource.match(/<section class="section"><h2>1\. CHI TIẾT BUỔI HỌC<\/h2>[\s\S]*?<\/thead>/)?.[0] || '';
for (const header of ['Có mặt', 'Đi trễ', 'Vắng']) {
  assert.ok(pdfHeader.includes(`>${header}<`), `PDF session table must contain the “${header}” column`);
}
assert.ok(
  pdfHeader.indexOf('>Có mặt<') < pdfHeader.indexOf('>Đi trễ<')
    && pdfHeader.indexOf('>Đi trễ<') < pdfHeader.indexOf('>Vắng<'),
  'PDF session columns must be ordered Có mặt → Đi trễ → Vắng',
);

const sessionTemplate = exportSource.match(/const sessionHtml = report\.sessionRows\.map[\s\S]*?\)\.join\(''\);/)?.[0] || '';
assert.ok(sessionTemplate.includes('row.late_count'), 'PDF session rows must render the tardy count');
assert.ok(
  sessionTemplate.indexOf('row.present_count') < sessionTemplate.indexOf('row.late_count')
    && sessionTemplate.indexOf('row.late_count') < sessionTemplate.indexOf('row.absent_count'),
  'PDF row data must be ordered present → tardy → absent',
);

assert.match(exportSource, /const\s+lateHtml\s*=\s*report\.lateRows\.map/, 'PDF export must build student-level tardy detail rows');
assert.match(exportSource, /3\. CHI TIẾT HỌC SINH ĐI TRỄ/, 'PDF must contain a dedicated tardy-student section');
assert.match(exportSource, /Không có học sinh đi trễ/, 'PDF must have a clear empty state for the tardy section');

console.log('Attendance PDF tardy-student detail contract OK');
