import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const launchCss = read('public/attendance-windows8-launch.css');
const historyCss = read('public/attendance-history-pixel-v6.css');

assert.match(
  historyCss,
  /\.attendance-shell\.ah-history-pixel-v6 \.attendance-title strong\s*\{[\s\S]*?font-size:\s*21px\s*!important/,
  'History page title must remain the approved typography reference',
);
assert.match(
  historyCss,
  /\.attendance-shell\.ah-history-pixel-v6 \.attendance-tabs > button\s*\{[\s\S]*?font-size:\s*12\.5px\s*!important/,
  'History tabs must remain the approved typography reference',
);

for (const [token, value] of [
  ['--att-type-page-title', '21px'],
  ['--att-type-tab', '12.5px'],
  ['--att-type-section-title', '20px'],
  ['--att-type-card-title', '12.8px'],
  ['--att-type-body', '10.8px'],
  ['--att-type-control', '10.5px'],
  ['--att-type-label', '9.5px'],
  ['--att-type-meta', '9px'],
  ['--att-type-stat', '17px'],
]) {
  assert.match(
    launchCss,
    new RegExp(`${token}:\\s*${value.replace('.', '\\.')}`),
    `${token} must match the approved History typography scale`,
  );
}

assert.match(
  launchCss,
  /\.attendance-shell \.attendance-title strong\s*\{[\s\S]*?font-size:\s*var\(--att-type-page-title\)\s*!important/,
  'All Attendance states must use the History page-title size',
);
assert.match(
  launchCss,
  /\.attendance-shell \.attendance-tabs > button\s*\{[\s\S]*?font-size:\s*var\(--att-type-tab\)\s*!important/,
  'All Attendance tabs must use the History tab size',
);
assert.match(
  launchCss,
  /\.attendance-shell \.attendance-rollcall-head h2\s*\{[\s\S]*?font-size:\s*var\(--att-type-section-title\)\s*!important/,
  'Quick Attendance section headings must use the shared section-title size',
);
assert.match(
  launchCss,
  /\.attendance-shell \.attendance-class-list button b\s*\{[\s\S]*?font-size:\s*var\(--att-type-card-title\)\s*!important/,
  'Quick Attendance class cards must use the History card-title size',
);
assert.match(
  launchCss,
  /\.attendance-shell \.attendance-member-manager h2\s*\{[\s\S]*?font-size:\s*var\(--att-type-section-title\)\s*!important/,
  'Manage Classes section headings must use the shared section-title size',
);
assert.match(
  launchCss,
  /\.attendance-shell \.attendance-member-table b\s*\{[\s\S]*?font-size:\s*var\(--att-type-card-title\)\s*!important/,
  'Manage Classes rows must use the History card-title size',
);

console.log('Attendance typography parity with History reference OK');
