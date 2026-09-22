import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rail = await readFile(new URL('../src/components/GlobalQuickAccessRail.css', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../src/styles/teacher-dashboard-google-colorful.css', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');
const chrome = await readFile(new URL('../src/components/DashboardTopChromeMockup.css', import.meta.url), 'utf8');

for (const token of [
  'Dashboard V9 mockup-safe edge-peek',
  '.bqa-root.is-collapsed:not(.is-pinned) .bqa-rail',
  'translate3d(-44px, 0, 0)',
  '.bqa-root.is-open .bqa-rail',
  '.bqa-root.is-pinned .bqa-rail',
]) {
  assert.ok(rail.includes(token), `Quick Access V9 token missing: ${token}`);
}

const marker = '/* Dashboard Mockup Parity V9 · final pixel-density refinement · 2026-09-22 */';
const start = dashboard.indexOf(marker);
assert.ok(start >= 0, 'Dashboard Mockup Parity V9 layer must exist.');
const v9 = dashboard.slice(start);

for (const token of [
  '.editorial-hero',
  '.gd-calendar-header',
  '.dnh-grid',
  'minmax(330px, .95fr)',
  '.gd-quick-actions',
  'minmax(0, 1.40fr)',
  'white-space: nowrap !important',
]) {
  assert.ok(v9.includes(token), `Dashboard V9 refinement missing: ${token}`);
}

for (const token of [
  'Dashboard footer — Mockup Parity V11',
  'padding: 14px 14px 64px !important',
  'min-height: 258px !important',
  'min-height: 35px !important',
  '.signature-footer-dashboard-artwork',
  'height: 62px !important',
]) {
  assert.ok(footer.includes(token), `Footer final refinement missing: ${token}`);
}

for (const token of [
  'Mockup Parity V11',
  'min-height: 52px !important',
  'min-height: 41px !important',
  'margin: 8px auto 0 !important',
]) {
  assert.ok(chrome.includes(token), `Top chrome final token missing: ${token}`);
}

assert.ok(!/font-family\s*:/i.test(v9), 'Dashboard V9 must preserve custom/regional font authority.');

for (const [name, source] of [['rail V9', rail], ['dashboard V9', v9], ['footer V9', footer], ['chrome V9', chrome]]) {
  const opens=(source.match(/{/g)||[]).length;
  const closes=(source.match(/}/g)||[]).length;
  assert.equal(opens, closes, `${name} CSS braces must be balanced.`);
}

console.log('PASS: Dashboard V9 keeps Quick Access available but visually quiet at rest, improves all section spacing, footer air, and top-chrome density.');
