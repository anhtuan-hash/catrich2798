import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile(new URL('../src/pages/WorkDashboard.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles/teacher-dashboard-google-colorful.css', import.meta.url), 'utf8');

const marker = '/* Dashboard Colorful V2 · approved pastel editorial direction · 2026-09-22 */';
const start = styles.indexOf(marker);
assert.ok(start >= 0, 'Approved Dashboard Colorful V2 layer must exist.');
const v2 = styles.slice(start);

for (const token of [
  '--gd-v2-sky',
  '.editorial-hero',
  '.gd-calendar-header',
  '.gd-agenda-list-today .gd-event:nth-child(4n + 3)',
  '.dnh::before',
  '.dnh-tabs button.is-active',
  '.gd-quick-action:nth-child(5)',
  '.signature-footer-v50-credentials',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(v2.includes(token), `Dashboard Colorful V2 missing contract token: ${token}`);
}

for (const token of [
  'DashboardHeroIllustration',
  'editorial-status-weather',
  'gd-calendar-today',
  'DashboardNewsHub',
  'gd-quick-surface',
]) {
  assert.ok(dashboard.includes(token), `Dashboard must preserve existing behavior/section: ${token}`);
}

assert.ok(
  !/font-family\s*:/i.test(v2),
  'Dashboard Colorful V2 must not set font-family; regional/custom font authority must remain untouched.',
);

assert.ok(
  !/display\s*:\s*none[^}]*signature-footer-v50/i.test(v2),
  'Dashboard Colorful V2 must not hide footer identity/credential content.',
);

const opens = (v2.match(/{/g) || []).length;
const closes = (v2.match(/}/g) || []).length;
assert.equal(opens, closes, 'Dashboard Colorful V2 CSS braces must be balanced.');

console.log('PASS: approved Dashboard Colorful V2 palette, sections, footer treatment and font-safety contract.');
