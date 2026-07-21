import fs from 'node:fs';
const home = fs.readFileSync('src/pages/HomeroomWorkspace.jsx', 'utf8');
const panel = fs.readFileSync('src/components/StudentRosterImportPanel.jsx', 'utf8');
const css = fs.readFileSync('src/styles/student-roster-import.css', 'utf8');
const checks = [
  ['component imported', home.includes('StudentRosterImportPanel')],
  ['offline import button', home.includes('Nhập nhanh từ file')],
  ['no AI roster copy', !home.includes('Nhập danh sách bằng AI') && !home.includes('AI nhập danh sách')],
  ['template download', panel.includes('mau-danh-sach-hoc-sinh.csv')],
  ['xlsx reader', panel.includes("read-excel-file/browser")],
  ['header aliases', panel.includes('ALIASES') && panel.includes('Họ và tên')],
  ['preview table', panel.includes('sri-table')],
  ['duplicate update', panel.includes('__duplicate')],
  ['no AI call', !panel.includes('callAI') && !panel.includes('OpenRouter')],
  ['responsive styles', css.includes('@media')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${label}`); if (!ok) failed += 1; }
if (failed) process.exit(1);
console.log(`All ${checks.length} student roster import checks passed.`);
