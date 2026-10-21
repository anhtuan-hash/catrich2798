import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { absenceReasonLabel } from '../src/utils/attendanceReport.js';

const studentPdf = readFileSync('src/utils/studentAttendanceExport.js', 'utf8');
const teacherPdf = readFileSync('src/utils/attendanceReportExport.js', 'utf8');
const studentUi = readFileSync('src/components/attendance/StudentAttendanceReport.jsx', 'utf8');
const parent = readFileSync('src/components/attendance/AttendanceMonthlyReport.jsx', 'utf8');

for (const [code, expected] of Object.entries({
  unexcused: 'Không phép',
  excused: 'Có phép',
  sick: 'Ốm',
  family: 'Việc gia đình',
  other: 'Khác',
  unspecified: 'Chưa ghi lý do',
})) {
  assert.equal(absenceReasonLabel(code), expected, 'Translate reason ' + code);
}

assert.match(studentUi, /d\.status === 'absent' \? absenceReasonLabel\(d\.absenceReason\)/);
assert.match(studentPdf, /const absenceReasonText =/);
assert.match(studentPdf, /d\.periods,statusName\(d\.status\),absenceReasonText\(d\)/, 'Excel must localize reasons');
assert.match(studentPdf, /esc\(absenceReasonText\(d\)\)/, 'PDF must localize reasons');
assert.match(studentPdf, /PETRUS_KY_SCHOOL_LOGO_DATA_URI/, 'Reuse exact school logo asset');
assert.match(studentPdf, /attendanceFooterSignatureDataUri\(\)/, 'Reuse teacher footer SVG');
assert.match(studentPdf, /@bottom-left\{/);
assert.match(studentPdf, /@bottom-right\{/);
assert.match(studentPdf, /counter\(page\)/);
assert.match(studentPdf, /counter\(pages\)/);
assert.match(studentPdf, /SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH/);
assert.match(studentPdf, /TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ/);
assert.match(studentPdf, /reportSchoolHeading\(\)/);
assert.match(studentPdf, /reportFooterHtml\(exportedAt\)/);
assert.match(studentPdf, /waitForReportImages\(popup\)/, 'Logo must load before print');
assert.match(studentPdf, /NGƯỜI BÁO CÁO/, 'Teacher reporter signature parity');
assert.match(studentPdf, /reporterName/, 'Report author must be printable');
assert.match(studentPdf, /reporterTitle/, 'Reporter title must be printable');
assert.match(studentPdf, /\.report-sheet:last-of-type\{break-after:auto;/, 'No blank trailing page');
assert.match(parent, /reporterName=\{reporterName\}/);
assert.match(parent, /reporterTitle=\{reporterTitle\}/);
assert.match(teacherPdf, /export function attendanceFooterSignatureDataUri\(/);
assert.match(teacherPdf, /export async function waitForReportImages\(/);
console.log('Student report Vietnamese reasons and school PDF chrome parity passed.');
