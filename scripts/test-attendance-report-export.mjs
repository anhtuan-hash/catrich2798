import fs from 'node:fs';
import assert from 'node:assert/strict';

const exportUrl = new URL('../src/utils/attendanceReportExport.js', import.meta.url);
const xlsxUrl = new URL('../src/utils/simpleXlsx.js', import.meta.url);
const reportExport = fs.existsSync(exportUrl) ? fs.readFileSync(exportUrl, 'utf8') : '';
const xlsx = fs.existsSync(xlsxUrl) ? fs.readFileSync(xlsxUrl, 'utf8') : '';
const excelPipeline = `${reportExport}\n${xlsx}`;

assert.ok(reportExport, 'attendanceReportExport.js must exist');
assert.ok(xlsx, 'simpleXlsx.js must exist');
for (const sheetName of ['Tong quan','Theo giao vien','Chi tiet buoi hoc','Chi tiet vang']) {
  assert.match(reportExport, new RegExp(sheetName), `Excel export must include sheet ${sheetName}`);
}
assert.match(excelPipeline, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
assert.match(reportExport, /\.xlsx/);
assert.match(reportExport, /window\.open/);
assert.match(reportExport, /\.print\s*\(/);
assert.match(xlsx, /PK|0x04034b50|67324752/, 'XLSX writer must emit ZIP local file headers');

for (const copy of [
  'SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH',
  'TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ',
  'BÁO CÁO ĐIỂM DANH THEO THÁNG',
  'BÁO CÁO ĐIỂM DANH THEO NGÀY',
  '1. CHI TIẾT BUỔI HỌC',
  '2. CHI TIẾT HỌC SINH VẮNG',
  '3. CHI TIẾT HỌC SINH ĐI TRỄ',
  'NHẬN XÉT CHUNG',
  'NGƯỜI BÁO CÁO',
]) assert.match(reportExport, new RegExp(copy), `PDF export must contain ${copy}`);
assert.doesNotMatch(reportExport, /1\. THỐNG KÊ THEO GIÁO VIÊN/, 'PDF must remove the teacher-summary section entirely');
assert.doesNotMatch(reportExport, /3\. CHI TIẾT HỌC SINH VẮNG/, 'PDF section numbering must keep absence details as section 2');

const pdfSessionHeader = reportExport.match(/<section class="section"><h2>1\. CHI TIẾT BUỔI HỌC<\/h2>[\s\S]*?<\/thead>/)?.[0] || '';
const expectedPdfHeaderOrder = [
  'Ngày', 'Lớp / môn', 'GV / phòng', 'Giờ dạy / chốt', 'Tiết', 'Sĩ số', 'Có mặt', 'Đi trễ', 'Vắng', 'Tỷ lệ',
  'Người điểm danh', 'Người điều chỉnh gần nhất', 'Trạng thái / ghi chú',
];
let previousHeaderIndex = -1;
for (const header of expectedPdfHeaderOrder) {
  const index = pdfSessionHeader.indexOf(`>${header}<`);
  assert.ok(index > previousHeaderIndex, `PDF session header must place “${header}” in the approved order`);
  previousHeaderIndex = index;
}

const sessionTemplate = reportExport.match(/const sessionHtml = report\.sessionRows\.map[\s\S]*?\)\.join\(''\);/)?.[0] || '';
const expectedSessionDataOrder = [
  'row.attendance_date', 'row.class_name', 'row.teacher_name', 'row.teaching_time_range', 'row.lesson_periods',
  'row.total_students', 'row.present_count', 'row.late_count', 'row.absent_count', 'row.attendance_rate', 'row.checked_by_name',
  'row.latest_changed_by_name', 'row.note',
];
let previousDataIndex = -1;
for (const token of expectedSessionDataOrder) {
  const index = sessionTemplate.indexOf(token);
  assert.ok(index > previousDataIndex, `PDF session row must place ${token} in the approved column order`);
  previousDataIndex = index;
}

assert.match(reportExport, /@page\s*\{[^}]*size\s*:\s*A4\s+landscape/i, 'Wide attendance detail tables should print on A4 landscape for readability.');
assert.match(
  reportExport,
  /@page\s*\{[^}]*margin\s*:\s*12mm\s+10mm\s+23mm/i,
  'PDF page must reserve a safe footer zone in the landscape page margin.',
);
assert.match(reportExport, /\.report-page\s*\{[^}]*max-width\s*:\s*100%/i, 'PDF content must stay bounded to portrait page width');
assert.match(reportExport, /table\s*\{[^}]*max-width\s*:\s*100%/i, 'PDF tables must remain within portrait page width');

// The official school logo is inlined into the about:blank print document and decoded before printing.
assert.match(reportExport, /petrus-ky-school-logo\.png\?inline/i, 'Attendance PDF must inline the official school logo asset.');
assert.match(reportExport, /class="school-logo"/i, 'Attendance PDF must render the school logo in the header.');
assert.match(reportExport, /PETRUS_KY_SCHOOL_LOGO_DATA_URI/, 'Attendance PDF must use the inlined logo data URI.');
assert.match(reportExport, /waitForReportImages/i, 'Attendance PDF must wait for the logo to decode before printing.');
assert.match(reportExport, /export\s+async\s+function\s+printAttendanceReportPdf/i, 'PDF export should keep deterministic print-window readiness handling');
assert.match(reportExport, /Kỳ báo cáo:/, 'PDF must present the reporting period as formal metadata.');
assert.match(reportExport, /Phạm vi:/, 'PDF must present class/teacher scope as formal metadata.');
assert.doesNotMatch(reportExport, /SẢN PHẨM CÔNG NGHỆ SỐ · Phục vụ công tác quản lý/,
  'Approved mockup uses a restrained purpose line without the extra product-label prefix.');

assert.match(reportExport, /class="print-footer"/,
  'Printed PDF must include the approved rich creator-signature footer.');
assert.match(reportExport, /\.print-footer\s*\{[\s\S]*?position:fixed[\s\S]*?bottom:-18\.4mm/s,
  'Creator signature must repeat as a fixed footer inside the reserved print margin.');
assert.match(reportExport, /\.print-footer__mark\{[^}]*width:6\.6mm[^}]*height:6\.6mm/s,
  'Approved footer must retain the compact green system icon.');
assert.match(reportExport, /\.print-footer__title\{[^}]*font-size:7\.45pt/s,
  'Approved footer title must use print-point sizing rather than tiny screen pixels.');
assert.match(reportExport, /@bottom-right\s*\{[\s\S]*?counter\(page\)\s*"\/"\s*counter\(pages\)/,
  'Printed footer must show its page number and total pages.');
assert.match(reportExport, /Thiết kế &amp; phát triển: (?:<strong>)?Nguyễn Anh Tuấn(?:<\/strong>)? · Tổ trưởng chuyên môn Tiếng Anh/,
  'Every-page author attribution must explicitly identify the creator.');
assert.match(reportExport, /class="print-footer__credit"[^>]*>Thiết kế &amp; phát triển: <strong>Nguyễn Anh Tuấn<\/strong>/,
  'Printed footer must emphasize the creator subtly, matching the approved mockup.');
assert.match(reportExport, /Phục vụ công tác quản lý và theo dõi chuyên cần nội bộ/,
  'Approved footer must retain the understated internal-management purpose line.');
assert.match(reportExport, /reportExportTimestamp\(/,
  'Report must use a consistent export timestamp.');
assert.match(reportExport, /return `\$\{value\.day\}\/\$\{value\.month\}\/\$\{value\.year\} \$\{value\.hour\}:\$\{value\.minute\}`/,
  'Footer timestamp must match the approved compact date-time format without extra punctuation.');
assert.match(reportExport, /\.footer\s*\{\s*display:none!important\s*\}/,
  'In-flow preview footer must not duplicate the repeated printed signature.');
assert.doesNotMatch(reportExport, /Chủ trì xây dựng và thực hiện: Tổ trưởng chuyên môn Nguyễn Anh Tuấn/,
  'Ambiguous project leadership wording must be replaced with direct designer/developer credit.');
assert.doesNotMatch(reportExport, /setTimeout\s*\(\s*\(\)\s*=>\s*window\.print\(\)\s*,\s*300\s*\)/i, 'Legacy 300ms print timer must remain removed');
assert.match(
  reportExport,
  /th,td\s*\{[^}]*text-align\s*:\s*center[^}]*vertical-align\s*:\s*middle/i,
  'All PDF table headers and data cells must be centered horizontally and vertically',
);
assert.match(reportExport, /font-variant-numeric\s*:\s*tabular-nums/i, 'PDF table numbers should use stable tabular alignment');

assert.match(reportExport, /teaching_time_range/);
assert.match(reportExport, /teaching_room/);
assert.match(reportExport, /checked_at/);
assert.match(reportExport, /reason_label/);
assert.match(reportExport, /absence_note/);
assert.match(reportExport, /reporterName/);
assert.match(reportExport, /reporterTitle/);
assert.match(reportExport, /generalRemarks/);

assert.match(xlsx, /mergeCells/i, 'XLSX writer must support merged cells');
assert.match(xlsx, /<cols>/i, 'XLSX writer must emit column widths');
assert.match(xlsx, /autoFilter/i, 'XLSX writer must support autofilter');
assert.match(xlsx, /state="frozen"/i, 'XLSX writer must support frozen panes');
assert.match(xlsx, /cellXfs count="[2-9]/i, 'XLSX writer must define multiple cell styles');
assert.match(xlsx, /patternFill/i, 'XLSX styles must include fills');
assert.match(xlsx, /<border>/i, 'XLSX styles must include borders');
assert.match(reportExport, /merges\s*:/i);
assert.match(reportExport, /columnWidths\s*:/i);
assert.match(reportExport, /autoFilter\s*:/i);
assert.match(reportExport, /freezeRows\s*:/i);

console.log('Attendance streamlined PDF and styled Excel export contract OK');