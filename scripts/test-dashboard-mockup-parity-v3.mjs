import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile(new URL('../src/pages/WorkDashboard.jsx', import.meta.url), 'utf8');
const newsroom = await readFile(new URL('../src/components/DashboardNewsHub.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles/teacher-dashboard-google-colorful.css', import.meta.url), 'utf8');

const marker = '/* Dashboard Mockup Parity V3 · preserve full approved graphic language · 2026-09-22 */';
const start = styles.indexOf(marker);
assert.ok(start >= 0, 'Dashboard Mockup Parity V3 layer must exist.');
const v3 = styles.slice(start);

for (const token of [
  '.editorial-hero-doodles',
  '.editorial-plane-doodle',
  '.editorial-sun-doodle',
  '.editorial-swoosh-doodle',
  '.editorial-hero-note',
  '.gd-calendar-doodle',
  '.gd-surface-note',
  '.dnh-icon svg',
  "content: 'Teach Better Together ♡'",
  '.footer::before',
  '@media (prefers-reduced-motion: reduce)',
]) {
  assert.ok(v3.includes(token), `Mockup parity style missing: ${token}`);
}

for (const token of [
  'DashboardHeroDoodles',
  'DashboardCalendarDoodle',
  'Teach today.',
  'Mỗi ngày',
  'TEACH',
  'INSPIRE',
  'GROW',
  'icon="bolt"',
]) {
  assert.ok(dashboard.includes(token), `Dashboard mockup graphic/behavior missing: ${token}`);
}

for (const token of [
  'NewsroomMegaphoneIcon',
  '<NewsroomMegaphoneIcon />',
]) {
  assert.ok(newsroom.includes(token), `Dashboard Newsroom graphic missing: ${token}`);
}

assert.ok(
  !/font-family\s*:/i.test(v3),
  'Mockup Parity V3 must not override the regional/custom font authority.',
);

const opens = (v3.match(/{/g) || []).length;
const closes = (v3.match(/}/g) || []).length;
assert.equal(opens, closes, 'Mockup Parity V3 CSS braces must be balanced.');

console.log('PASS: Dashboard mockup parity graphics, palette, footer artwork, responsiveness and font safety.');
