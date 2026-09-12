import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../public/attendance-history-v5.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/attendance-history-v5.css', import.meta.url), 'utf8');

assert.match(index, /attendance-history-mockup-v4\.css[\s\S]*attendance-history-v5\.css/, 'v5 CSS must load after v4');
assert.match(index, /attendance-history-mockup-v4\.js[\s\S]*attendance-history-v5\.js/, 'v5 JS must load after v4');

assert.match(js, /data-ah-v5-duplicate-filter/, 'runtime must mark duplicate activity bars');
assert.match(js, /Loại hoạt động/, 'duplicate detection must be scoped to the activity filter');
assert.match(js, /Phụ đạo/, 'duplicate detection must recognize remedial activity');
assert.match(js, /Bồi dưỡng/, 'duplicate detection must recognize gifted activity');
assert.match(js, /Học bổ sung/, 'duplicate detection must recognize supplemental activity');
assert.match(js, /ah-mockup-filterbar/, 'runtime must preserve the approved colored filter bar');
assert.match(js, /ah-history-v5/, 'runtime must enable the v5 scoped visual layer');

assert.match(css, /\[data-ah-v5-duplicate-filter="true"\]/, 'duplicate bar must be force-hidden');
assert.match(css, /grid-template-columns:\s*minmax\(440px,\s*520px\)/, 'desktop history layout should reserve a compact list column');
assert.match(css, /--ah-remedial:\s*#f97316/, 'remedial must stay orange');
assert.match(css, /--ah-gifted:\s*#1677ff/, 'gifted must stay blue');
assert.match(css, /--ah-supplemental:\s*#16a34a/, 'supplemental must stay green');
assert.match(css, /\.ahv3__hero/, 'selected-session hero must receive v5 refinement');
assert.match(css, /\.ahv3__stat-grid/, 'attendance summary must receive v5 refinement');

console.log('attendance-history-v5 contract: ok');
