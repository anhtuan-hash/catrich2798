import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const flatNav = await readFile(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const chrome = await readFile(new URL('../src/components/DashboardTopChromeMockup.css', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');
const footerComponent = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');

for (const token of [
  "style.setProperty('width', 'min(1520px, calc(100% - clamp(32px, 6vw, 96px)))', 'important')",
  "style.setProperty('max-width', '1520px', 'important')",
  "style.setProperty('margin', '8px auto 0', 'important')",
]) {
  assert.ok(flatNav.includes(token), `Dashboard top chrome runtime alignment missing: ${token}`);
}

for (const token of [
  'Dashboard top chrome — Mockup Parity V10',
  'width: min(1520px, calc(100% - clamp(32px, 6vw, 96px))) !important',
  'margin: 8px auto 0 !important',
  '.brian-nav',
  '.brian-newswire',
  'width: 100% !important',
]) {
  assert.ok(chrome.includes(token), `Dashboard top chrome V10 token missing: ${token}`);
}

for (const token of [
  'Dashboard footer — Mockup Parity V10',
  'width: min(1520px, calc(100% - clamp(32px, 6vw, 96px))) !important',
  'padding: 14px 14px 64px !important',
  'min-height: 258px !important',
  '.signature-footer-card-doodle',
  'display: none !important',
  '.signature-footer-dashboard-artwork',
  'height: 62px !important',
  '.signature-footer-dashboard-plane',
]) {
  assert.ok(footer.includes(token), `Dashboard footer V10 token missing: ${token}`);
}

assert.ok(
  footer.includes('.signature-footer-dashboard-plane {\n  display: none !important;'),
  'Footer V10 must suppress the extra paper-plane decoration.',
);

assert.ok(
  footerComponent.includes('Teach Better Together ♡'),
  'Footer sign-off must remain in the real DOM artwork.',
);

for (const className of ['brand', 'profile', 'credentials']) {
  const match = footer.match(new RegExp('\\.signature-footer-v50-' + className + '\\s*\\{([^}]*)\\}', 'i'));
  assert.ok(match, `Footer V10 card style missing: ${className}`);
  assert.ok(!/radial-gradient/i.test(match[1]), `Footer V10 card ${className} must stay free of radial artifacts.`);
}

assert.ok(!/font-family\s*:/i.test(footer), 'Footer V10 must preserve custom/regional font authority.');

for (const [name, source] of [['chrome V10', chrome], ['footer V10', footer]]) {
  const opens=(source.match(/{/g)||[]).length;
  const closes=(source.match(/}/g)||[]).length;
  assert.equal(opens, closes, `${name} CSS braces must be balanced.`);
}

console.log('PASS: Dashboard V10 aligns top chrome to the Dashboard grid and rebuilds the footer to clean mockup proportions.');
