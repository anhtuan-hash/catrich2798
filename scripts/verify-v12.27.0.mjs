import fs from 'node:fs';
const checks = [
  ['keyword mode', /sourceInputMode:\s*'manual'/, 'src/pages/WorksheetFactory.jsx'],
  ['source modes', /SOURCE_INPUT_MODES/, 'src/pages/WorksheetFactory.jsx'],
  ['AI source action', /generateSourceFromKeywords/, 'src/pages/WorksheetFactory.jsx'],
  ['no silent fallback', /Nội dung cũ được giữ nguyên/, 'src/pages/WorksheetFactory.jsx'],
  ['provider hub link', /Mở AI Provider Hub/, 'src/pages/WorksheetFactory.jsx'],
  ['source provenance', /wf2-source-provenance/, 'src/pages/WorksheetFactory.jsx'],
  ['keyword UI CSS', /wf2-keyword-source/, 'src/pages/WorksheetFactory.css'],
  ['full width source card', /wf2-source-card\{grid-column:1\/-1/, 'src/pages/WorksheetFactory.css'],
];
let failed = false;
for (const [label, pattern, file] of checks) {
  const text = fs.readFileSync(file,'utf8');
  if (!pattern.test(text)) { console.error(`✗ ${label}`); failed = true; }
  else console.log(`✓ ${label}`);
}
if (failed) process.exit(1);
console.log('V12.27.0 source verification passed.');
