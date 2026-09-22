import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const flatNav = await readFile(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const chrome = await readFile(new URL('../src/components/DashboardTopChromeMockup.css', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../src/styles/teacher-dashboard-google-colorful.css', import.meta.url), 'utf8');
const footerComponent = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');

for (const token of [
  "chrome.dataset.dashboardStaticChrome = 'true'",
  "style.setProperty('position', 'static', 'important')",
  "style.setProperty('top', 'auto', 'important')",
  "style.setProperty('transform', 'none', 'important')",
]) {
  assert.ok(flatNav.includes(token), `Runtime static chrome guard missing: ${token}`);
}

for (const token of [
  'Mockup Parity V10',
  '[data-dashboard-static-chrome="true"]',
  'position: static !important',
  'width: min(1520px, calc(100% - clamp(32px, 6vw, 96px))) !important',
  'will-change: auto !important',
]) {
  assert.ok(chrome.includes(token), `Dashboard chrome visual contract missing: ${token}`);
}

const marker = '/* Dashboard Mockup Parity V8 · section-by-section 100-point refinement · 2026-09-22 */';
const start = dashboard.indexOf(marker);
assert.ok(start >= 0, 'Dashboard Mockup Parity V8 layer must exist.');
const v8 = dashboard.slice(start);

for (const token of [
  '.editorial-hero-art',
  '.gd-calendar',
  '.dnh-grid',
  'grid-template-columns: repeat(6, minmax(0, 1fr)) !important',
  '.gd-quick-action',
  'padding-bottom: 6px !important',
]) {
  assert.ok(v8.includes(token), `Dashboard V8 section refinement missing: ${token}`);
}

for (const token of [
  'function DashboardFooterArtwork()',
  'function FooterCardDoodle({ type })',
  'signature-footer-dashboard-landscape',
  'signature-footer-dashboard-plane',
  'signature-footer-dashboard-signoff',
  'Teach Better Together ♡',
]) {
  assert.ok(footerComponent.includes(token), `Footer V8 artwork markup missing: ${token}`);
}

for (const token of [
  'Dashboard footer — Mockup Parity V10',
  'content: none !important',
  '.signature-footer-card-doodle',
  '.signature-footer-dashboard-artwork',
  '.signature-footer-dashboard-landscape',
  '.signature-footer-dashboard-signoff',
]) {
  assert.ok(footer.includes(token), `Footer visual contract missing: ${token}`);
}

for (const className of ['brand', 'profile', 'credentials']) {
  const match = footer.match(new RegExp('\\.signature-footer-v50-' + className + '\\s*\\{([^}]*)\\}', 'i'));
  assert.ok(match, `Footer V8 card style missing: ${className}`);
  assert.ok(!/radial-gradient/i.test(match[1]), `Footer V8 card ${className} must not use radial-gradient artwork.`);
}

assert.ok(!/font-family\s*:/i.test(v8), 'Dashboard V8 must preserve custom/regional font authority.');
assert.ok(!/font-family\s*:/i.test(footer), 'Footer V8 must preserve custom/regional font authority.');

for (const [name, source] of [['dashboard V8', v8], ['footer V8', footer], ['chrome V8', chrome]]) {
  const opens=(source.match(/{/g)||[]).length;
  const closes=(source.match(/}/g)||[]).length;
  assert.equal(opens, closes, `${name} CSS braces must be balanced.`);
}

console.log('PASS: Dashboard V8 hard-stops sticky capture, refines every visual section and rebuilds the footer as real editorial artwork.');
