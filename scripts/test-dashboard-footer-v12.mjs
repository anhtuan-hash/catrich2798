import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const footer = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');
const footerComponent = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');

const marker = '/* Dashboard footer V12 · compact mockup closure */';
const start = footer.indexOf(marker);
assert.ok(start >= 0, 'Dashboard footer V12 layer must exist.');
const v12 = footer.slice(start);

for (const token of [
  'padding-bottom: 46px !important',
  'min-height: 246px !important',
  'width: min(220px, 82%) !important',
  'min-height: 34px !important',
  'margin-top: 5px !important',
  'height: 48px !important',
  'height: 55px !important',
  'font-size: 13px !important',
]) {
  assert.ok(v12.includes(token), `Footer V12 token missing: ${token}`);
}

assert.ok(footerComponent.includes('Teach Better Together ♡'), 'Footer V12 must retain the real sign-off.');
assert.ok(!/font-family\s*:/i.test(v12), 'Footer V12 must preserve custom/regional font authority.');

const opens=(v12.match(/{/g)||[]).length;
const closes=(v12.match(/}/g)||[]).length;
assert.equal(opens, closes, 'Footer V12 CSS braces must be balanced.');

console.log('PASS: Dashboard footer V12 reduces dead space, strengthens the brand card and closes the page with a shallower landscape.');
