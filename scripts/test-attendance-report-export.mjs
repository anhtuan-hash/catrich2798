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
  '1. THỐNG KÊ THEO GIÁO VIÊN',
  '2. CHI TIẾT BUỔI HỌC',
  '3. CHI TIẾT HỌC SINH VẮNG',
  'NHẬN XÉT CHUNG',
  'NGƯỜI BÁO CÁO',
]) assert.match(reportExport, new RegExp(copy), `PDF export must contain ${copy}`);
assert.match(reportExport, /petrus-ky-school-logo\.png/);
assert.match(reportExport, /@page\s*\{[^}]*size\s*:\s*A4\s+portrait/i);
assert.match(
  reportExport,
  /@page\s*\{[^}]*margin\s*:\s*(?:18|19|20|21|22)mm\s+(?:9|10|11|12)mm\s+(?:12|13|14|15|16)mm/i,
  'PDF page must reserve a safe physical top margin so the school logo/header cannot collide with browser print headers',
);
assert.match(reportExport, /class=["']school-logo-box["']/i, 'PDF school logo must live in a dedicated bounded logo box');
assert.match(
  reportExport,
  /\.school-logo-box\s*\{[^}]*(?:width|inline-size)\s*:\s*(?:16|17|18|19|20)mm[^}]*(?:height|block-size)\s*:\s*(?:16|17|18|19|20)mm/i,
  'PDF logo box must use bounded physical dimensions appropriate for A4 printing',
);
assert.match(
  reportExport,
  /\.school-head img\s*\{[^}]*(?:max-width\s*:\s*100%|width\s*:\s*(?:14|15|16|17|18)mm)[^}]*(?:max-height\s*:\s*100%|height\s*:\s*(?:14|15|16|17|18)mm)/i,
  'PDF school logo image must be constrained inside its box',
);
assert.match(reportExport, /\.report-page\s*\{[^}]*max-width\s*:\s*100%/i, 'PDF content must stay bounded to portrait page width');
assert.match(reportExport, /table\s*\{[^}]*max-width\s*:\s*100%/i, 'PDF tables must remain within portrait page width');

// Cross-browser print hardening: Safari must never receive the indexed PNG directly.
assert.match(reportExport, /export\s+async\s+function\s+printAttendanceReportPdf/i, 'PDF export must wait for print-safe logo preparation');
assert.match(reportExport, /canvas\.getContext\(['"]2d['"]/i, 'PDF export must rasterize the school logo before printing');
assert.match(reportExport, /toDataURL\(['"]image\/jpeg['"]/i, 'Print-safe logo must be flattened to true-color JPEG for Safari/Chromium consistency');
assert.match(reportExport, /fillStyle\s*=\s*['"]#(?:fff|ffffff)['"]/i, 'Print-safe logo must be flattened on an opaque white background');
assert.match(reportExport, /\.decode\s*\(/i, 'PDF export must wait for image decode instead of a fixed timer');
assert.doesNotMatch(reportExport, /setTimeout\s*\(\s*\(\)\s*=>\s*window\.print\(\)\s*,\s*300\s*\)/i, 'Legacy 300ms print timer must be removed');
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

console.log('Attendance branded PDF and styled Excel export contract OK');
