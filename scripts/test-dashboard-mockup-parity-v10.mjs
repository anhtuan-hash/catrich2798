import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const flatNav = await readFile(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const chrome = await readFile(new URL('../src/components/DashboardTopChromeMockup.css', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');
const footerComponent = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');

for (const token of [
  "style.setProperty('width', 'var(--dashboard-shell-width)', 'important')",
  "style.setProperty('max-width', '1520px', 'important')",
  "style.setProperty('margin', '8px auto 0', 'important')",
]) {
  assert.ok(flatNav.includes(token), `Dashboard top chrome runtime alignment missing: ${token}`);
}

for (const token of [
  'Dashboard top chrome — Mockup Parity V11',
  '--dashboard-shell-width: min(1520px, calc(100% - clamp(32px, 6vw, 96px)))',
  'width: var(--dashboard-shell-width) !important',
  'margin: 8px auto 0 !important',
  '.brian-nav',
  '.brian-newswire',
  'width: 100% !important',
]) {
  assert.ok(chrome.includes(token), `Dashboard top chrome V11 token missing: ${token}`);
}

for (const token of [
  'Dashboard footer — Mockup Parity V11',
  'width: var(--dashboard-shell-width) !important',
  'padding: 14px 14px 64px !important',
  'min-height: 258px !important',
  '.signature-footer-dashboard-artwork',
  'height: 62px !important',
]) {
  assert.ok(footer.includes(token), `Dashboard footer V11 token missing: ${token}`);
}

assert.ok(!footerComponent.includes('FooterCardDoodle'), 'Footer V11 must not ship hidden card doodle markup.');
assert.ok(!footerComponent.includes('signature-footer-dashboard-plane'), 'Footer V11 must not ship hidden paper-plane markup.');

assert.ok(
  footerComponent.includes('Teach Better Together ♡'),
  'Footer sign-off must remain in the real DOM artwork.',
);

for (const className of ['brand', 'profile', 'credentials']) {
  const match = footer.match(new RegExp('\\.signature-footer-v50-' + className + '\\s*\\{([^}]*)\\}', 'i'));
  assert.ok(match, `Footer V11 card style missing: ${className}`);
  assert.ok(!/radial-gradient/i.test(match[1]), `Footer V11 card ${className} must stay free of radial artifacts.`);
}

assert.ok(!/font-family\s*:/i.test(footer), 'Footer V11 must preserve custom/regional font authority.');

for (const [name, source] of [['chrome V11', chrome], ['footer V11', footer]]) {
  const opens=(source.match(/{/g)||[]).length;
  const closes=(source.match(/}/g)||[]).length;
  assert.equal(opens, closes, `${name} CSS braces must be balanced.`);
}

console.log('PASS: Dashboard V11 uses one shared shell width and removes hidden footer decoration from the DOM.');
