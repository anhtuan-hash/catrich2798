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
  'NHẬN XÉT CHUNG',
  'NGƯỜI BÁO CÁO',
]) assert.match(reportExport, new RegExp(copy), `PDF export must contain ${copy}`);
assert.doesNotMatch(reportExport, /1\. THỐNG KÊ THEO GIÁO VIÊN/, 'PDF must remove the teacher-summary section entirely');
assert.doesNotMatch(reportExport, /3\. CHI TIẾT HỌC SINH VẮNG/, 'PDF section numbering must be compact after removing teacher summary');

const pdfSessionHeader = reportExport.match(/<section class="section"><h2>1\. CHI TIẾT BUỔI HỌC<\/h2>[\s\S]*?<\/thead>/)?.[0] || '';
const expectedPdfHeaderOrder = [
  'Ngày', 'Lớp / môn', 'GV / phòng', 'Giờ dạy / chốt', 'Tiết', 'Sĩ số', 'Có mặt', 'Vắng', 'Tỷ lệ',
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
  'row.total_students', 'row.present_count', 'row.absent_count', 'row.attendance_rate', 'row.checked_by_name',
  'row.latest_changed_by_name', 'row.note',
];
let previousDataIndex = -1;
for (const token of expectedSessionDataOrder) {
  const index = sessionTemplate.indexOf(token);
  assert.ok(index > previousDataIndex, `PDF session row must place ${token} in the approved column order`);
  previousDataIndex = index;
}

assert.match(reportExport, /@page\s*\{[^}]*size\s*:\s*A4\s+portrait/i);
assert.match(
  reportExport,
  /@page\s*\{[^}]*margin\s*:\s*(?:18|19|20|21|22)mm\s+(?:9|10|11|12)mm\s+(?:12|13|14|15|16)mm/i,
  'PDF page must reserve a safe physical top margin so the school header cannot collide with browser print headers',
);
assert.match(reportExport, /\.report-page\s*\{[^}]*max-width\s*:\s*100%/i, 'PDF content must stay bounded to portrait page width');
assert.match(reportExport, /table\s*\{[^}]*max-width\s*:\s*100%/i, 'PDF tables must remain within portrait page width');

// The school logo must be completely absent from attendance PDF export.
assert.doesNotMatch(reportExport, /petrus-ky-school-logo\.png/i, 'Attendance PDF must not import the school logo asset');
assert.doesNotMatch(reportExport, /school-logo-box/i, 'Attendance PDF must not render a logo box');
assert.doesNotMatch(reportExport, /data-report-school-logo/i, 'Attendance PDF must not render a report logo image');
assert.doesNotMatch(reportExport, /buildPrintSafeSchoolLogoDataUrl/i, 'Attendance PDF must not run logo conversion code');
assert.doesNotMatch(reportExport, /waitForImageReady/i, 'Attendance PDF must not wait for a removed logo image');
assert.match(reportExport, /export\s+async\s+function\s+printAttendanceReportPdf/i, 'PDF export should keep deterministic print-window readiness handling');
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