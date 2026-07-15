import fs from 'node:fs';
const jsx = fs.readFileSync('src/pages/WorksheetFactory.jsx','utf8');
const css = fs.readFileSync('src/pages/WorksheetFactory.css','utf8');
const version = fs.readFileSync('src/config/version.js','utf8');
const checks = [
  ['modern hero component', jsx.includes('function WorksheetHero') && jsx.includes('<WorksheetHero')],
  ['full-width hero styling', css.includes('.wf3-hero') && css.includes('.wf3-hero-art')],
  ['no worksheet sidebar', !jsx.includes('wf3-sidebar') && css.includes('worksheetSidebar:false') === false],
  ['hero actions preserved', jsx.includes('Tiếp tục thiết kế') && jsx.includes('Blueprint') && jsx.includes('AI Copilot') && jsx.includes('Xuất bản')],
  ['version updated', version.includes("12.28.0")],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`All ${checks.length} V12.28.0 checks passed.`);
