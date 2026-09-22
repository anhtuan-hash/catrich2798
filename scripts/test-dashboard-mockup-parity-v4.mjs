import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile(new URL('../src/pages/WorkDashboard.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles/teacher-dashboard-google-colorful.css', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');
const footerStyles = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');

const marker = '/* Dashboard Mockup Parity V4 · production screenshot convergence · 2026-09-22 */';
const start = styles.indexOf(marker);
assert.ok(start >= 0, 'Dashboard Mockup Parity V4 layer must exist.');
const v4 = styles.slice(start);

for (const token of [
  '.editorial-hero-cloudscape',
  '.editorial-hero-heading.is-medium-name h1',
  'white-space: nowrap !important',
  '.gd-today-date-mark strong',
  'writing-mode: horizontal-tb !important',
  '.dnh-featured-media > img',
  'position: absolute !important',
  '.gd-quick-action',
  '@media (max-width: 640px)',
]) {
  assert.ok(v4.includes(token), `V4 screenshot convergence token missing: ${token}`);
}

for (const token of [
  'DashboardHeroCloudscape',
  'editorial-hero-cloudscape',
  'is-medium-name',
  'is-long-name',
]) {
  assert.ok(dashboard.includes(token), `Dashboard V4 structure missing: ${token}`);
}

assert.ok(
  footer.indexOf("import './FooterDashboardMockup.css';") > footer.indexOf("import './FooterIntegrity.css';"),
  'Dashboard footer authority must load after the global FooterIntegrity guard.',
);

for (const token of [
  '.app-shell[data-route="dashboard"] > footer.footer.signature-footer-collapsible',
  "content: 'Teach Better Together ♡'",
  '.signature-footer-v50-brand',
  '.signature-footer-v50-profile',
  '.signature-footer-v50-credentials',
  '@media (max-width: 720px)',
]) {
  assert.ok(footerStyles.includes(token), `Dashboard footer V4 token missing: ${token}`);
}

assert.ok(!/font-family\s*:/i.test(v4), 'V4 dashboard layer must not override regional/custom fonts.');
assert.ok(!/font-family\s*:/i.test(footerStyles), 'Dashboard footer layer must not override regional/custom fonts.');

for (const [name, source] of [['dashboard V4', v4], ['footer V4', footerStyles]]) {
  const opens = (source.match(/{/g) || []).length;
  const closes = (source.match(/}/g) || []).length;
  assert.equal(opens, closes, `${name} CSS braces must be balanced.`);
}

console.log('PASS: Dashboard mockup parity V4 fixes hero wrapping, date stacking, lead-image crop, footer spacing/artwork and font safety.');
