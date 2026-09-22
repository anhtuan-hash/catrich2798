import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const nav = await readFile(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const chrome = await readFile(new URL('../src/components/DashboardTopChromeMockup.css', import.meta.url), 'utf8');
const dashboardStyles = await readFile(new URL('../src/styles/teacher-dashboard-google-colorful.css', import.meta.url), 'utf8');
const footerStyles = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');
const footerComponent = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');

assert.ok(
  nav.includes("import './DashboardTopChromeMockup.css';"),
  'Dashboard top-chrome mockup authority must be loaded.',
);

for (const token of [
  'body:has(.app-shell[data-route="dashboard"]) .bes-top-chrome',
  'position: relative !important',
  'top: auto !important',
  '.brian-newswire',
  '.gd-page',
  'padding-top: 16px !important',
]) {
  assert.ok(chrome.includes(token), `Dashboard top chrome V5 token missing: ${token}`);
}

const marker = '/* Dashboard Mockup Parity V5 · final visual convergence · 2026-09-22 */';
const start = dashboardStyles.indexOf(marker);
assert.ok(start >= 0, 'Dashboard Mockup Parity V5 layer must exist.');
const v5 = dashboardStyles.slice(start);

for (const token of [
  '.editorial-hero-stage::before',
  '.editorial-hero-art',
  '-webkit-text-stroke',
  '.gd-calendar-title h2',
  '.dnh::before',
  '.gd-quick-surface .gd-surface-header',
  'padding-bottom: 10px !important',
]) {
  assert.ok(v5.includes(token), `Dashboard V5 visual convergence token missing: ${token}`);
}

for (const token of [
  'Mockup Parity V8',
  '[data-footer-route="dashboard"]',
  '.signature-footer-v50-brand',
  '.signature-footer-v50-profile',
  '.signature-footer-v50-credentials',
  '.signature-footer-dashboard-artwork',
]) {
  assert.ok(footerStyles.includes(token), `Dashboard footer visual contract missing: ${token}`);
}
assert.ok(footerComponent.includes('Teach Better Together ♡'), 'Dashboard footer sign-off must remain in the real DOM artwork.');

assert.ok(!/font-family\s*:/i.test(v5), 'Dashboard V5 must not override custom/regional font authority.');
assert.ok(!/font-family\s*:/i.test(chrome), 'Dashboard top chrome V5 must not override custom/regional font authority.');

for (const [name, source] of [['chrome', chrome], ['dashboard', v5], ['footer', footerStyles]]) {
  const opens=(source.match(/{/g)||[]).length;
  const closes=(source.match(/}/g)||[]).length;
  assert.equal(opens, closes, `${name} CSS braces must be balanced.`);
}

console.log('PASS: Dashboard V5 removes sticky chrome overlap, restores top-page rhythm, deepens mockup artwork, footer decoration and font safety.');
