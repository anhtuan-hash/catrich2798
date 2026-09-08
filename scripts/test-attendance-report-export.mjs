import fs from 'node:fs';
import assert from 'node:assert/strict';

const exportUrl = new URL('../src/utils/attendanceReportExport.js', import.meta.url);
const xlsxUrl = new URL('../src/utils/simpleXlsx.js', import.meta.url);
const reportExport = fs.existsSync(exportUrl) ? fs.readFileSync(exportUrl, 'utf8') : '';
const xlsx = fs.existsSync(xlsxUrl) ? fs.readFileSync(xlsxUrl, 'utf8') : '';

assert.ok(reportExport, 'attendanceReportExport.js must exist');
assert.ok(xlsx, 'simpleXlsx.js must exist');
for (const sheetName of ['Tong quan','Theo giao vien','Chi tiet buoi hoc','Chi tiet vang']) {
  assert.match(reportExport, new RegExp(sheetName), `Excel export must include sheet ${sheetName}`);
}
assert.match(reportExport, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
assert.match(reportExport, /\.xlsx/);
assert.match(reportExport, /window\.open/);
assert.match(reportExport, /\.print\s*\(/);
assert.match(reportExport, /Xuất PDF|Bao cao diem danh|Báo cáo điểm danh/);
assert.match(xlsx, /PK|0x04034b50|67324752/, 'XLSX writer must emit ZIP local file headers');

console.log('Attendance report export contract OK');
