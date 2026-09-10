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
assert.match(
  reportExport,
  /headers:\s*\[\s*'Ngày',\s*'Lớp \/ môn',\s*'GV \/ phòng',\s*'Giờ dạy \/ chốt',\s*'Tiết',\s*'Sĩ số',\s*'Có mặt',\s*'Vắng',\s*'Tỷ lệ',\s*'Người điểm danh',\s*'Người điều chỉnh gần nhất',\s*'Trạng thái \/ ghi chú',\s*\]/,
  'Session-detail PDF columns must place audit actors after Tỷ lệ and before Trạng thái / ghi chú',
);
assert.match(
  reportExport,
  /columns:\s*\[\s*'date',\s*'class_subject',\s*'teacher_room',\s*'time_checked',\s*'periods',\s*'total_students',\s*'present_count',\s*'absent_count',\s*'attendance_rate',\s*'checked_by',\s*'last_adjustment',\s*'status_note',\s*\]/,
  'Session-detail data keys must follow the visible PDF column order',
);
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