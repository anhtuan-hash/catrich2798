import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const indexHtml = read('index.html');
const css = read('public/attendance-history-mockup-v4.css');
const runtime = read('public/attendance-history-mockup-v4.js');

assert.match(indexHtml, /attendance-history-mockup-v4\.css\?v=1/, 'Approved history mockup stylesheet must be loaded');
assert.match(indexHtml, /attendance-history-mockup-v4\.js\?v=2/, 'Approved history mockup runtime must be loaded');

assert.match(css, /--ah-remedial:\s*#f97316/i, 'Remedial sessions must use the approved orange');
assert.match(css, /--ah-gifted:\s*#1677ff/i, 'Gifted sessions must use the approved blue');
assert.match(css, /--ah-supplemental:\s*#16a34a/i, 'Supplemental sessions must use the approved green');
assert.match(css, /grid-template-columns:\s*minmax\(420px,\s*500px\)\s+minmax\(0,\s*1fr\)/, 'Desktop history must use the approved wide session rail');
assert.match(css, /\.ah-history-mockup \.ah-mockup-filterbar/, 'Top activity filter bar must be styled');
assert.match(css, /\.ah-kind-remedial/, 'Remedial cards must receive semantic styling');
assert.match(css, /\.ah-kind-gifted/, 'Gifted cards must receive semantic styling');
assert.match(css, /\.ah-kind-supplemental/, 'Supplemental cards must receive semantic styling');
assert.match(css, /\.ah-mockup-empty-benefits/, 'Empty detail state must expose the three-benefit layout');

for (const kind of ['all', 'remedial', 'gifted', 'supplemental']) {
  assert.match(runtime, new RegExp(`data-history-type=["']${kind}["']`), `Top activity filter must include ${kind}`);
}
assert.match(runtime, /dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/, 'Top chips must drive the existing React history filter');
assert.match(runtime, /Chọn một buổi để xem chi tiết/, 'Empty detail state must retain the approved guidance');
assert.match(runtime, /Xem danh sách học sinh/, 'Empty detail state must explain student-list access');
assert.match(runtime, /Xem chi tiết điểm danh/, 'Empty detail state must explain attendance-detail access');
assert.match(runtime, /Theo dõi trạng thái và lịch sử/, 'Empty detail state must explain history tracking');

console.log('Attendance history approved mockup V4 contract OK');
