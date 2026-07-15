import fs from 'node:fs';
const checks = [
  ['source length ranges', /\['medium', '250–350 từ', 300, 900, 250, 370\]/],
  ['minimum word guard', /actualWords < minWords/],
  ['automatic expansion retry', /Worksheet Factory đang mở rộng nội dung nguồn/],
  ['continuation retry', /Worksheet Factory đang hoàn thiện độ dài nguồn/],
  ['worksheet governance profile', /governanceProfile: 'worksheet'/],
];
const source = fs.readFileSync('src/pages/WorksheetFactory.jsx','utf8');
let failed = false;
for (const [label, pattern] of checks) {
  const ok = pattern.test(source);
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('V12.27.1 source verification passed.');
