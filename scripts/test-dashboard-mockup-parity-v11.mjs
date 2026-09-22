import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const flatNav = await readFile(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const chrome = await readFile(new URL('../src/components/DashboardTopChromeMockup.css', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');
const footerComponent = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');

for (const token of [
  'Dashboard top chrome — Mockup Parity V11',
  '--dashboard-shell-width: min(1520px, calc(100% - clamp(32px, 6vw, 96px)))',
  'width: var(--dashboard-shell-width) !important',
  'margin: 8px auto 0 !important',
]) {
  assert.ok(chrome.includes(token), `Dashboard V11 top chrome token missing: ${token}`);
}

for (const token of [
  "style.setProperty('width', 'var(--dashboard-shell-width)', 'important')",
  "style.setProperty('margin', '8px auto 0', 'important')",
]) {
  assert.ok(flatNav.includes(token), `Dashboard V11 runtime alignment missing: ${token}`);
}

for (const token of [
  'Dashboard footer — Mockup Parity V11',
  'width: var(--dashboard-shell-width) !important',
  'padding: 14px 14px 64px !important',
  '.signature-footer-dashboard-landscape',
  '.signature-footer-dashboard-signoff',
]) {
  assert.ok(footer.includes(token), `Dashboard V11 footer token missing: ${token}`);
}

assert.ok(footerComponent.includes('Teach Better Together ♡'), 'Footer V11 sign-off must remain.');
assert.ok(!footerComponent.includes('FooterCardDoodle'), 'Footer V11 must remove hidden card doodle DOM.');
assert.ok(!footerComponent.includes('signature-footer-dashboard-plane'), 'Footer V11 must remove hidden paper-plane DOM.');
assert.ok(!footer.includes('.signature-footer-card-doodle'), 'Footer V11 must remove dead card-doodle CSS.');
assert.ok(!footer.includes('.signature-footer-dashboard-plane'), 'Footer V11 must remove dead paper-plane CSS.');

assert.ok(!/font-family\s*:/i.test(chrome), 'Top chrome V11 must preserve global/custom font authority.');
assert.ok(!/font-family\s*:/i.test(footer), 'Footer V11 must preserve global/custom font authority.');

for (const [name, source] of [['chrome V11', chrome], ['footer V11', footer]]) {
  const opens=(source.match(/{/g)||[]).length;
  const closes=(source.match(/}/g)||[]).length;
  assert.equal(opens, closes, `${name} CSS braces must be balanced.`);
}

console.log('PASS: Dashboard V11 uses one shared shell width and removes hidden footer decoration from markup and CSS.');
