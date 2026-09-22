import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const footer = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');
const footerCss = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');

for (const token of [
  'signature-footer-dashboard-global',
  'data-footer-mode="full"',
  '<DashboardFooterArtwork />',
  'Teach Better Together ♡',
]) {
  assert.ok(footer.includes(token), `Global Dashboard footer markup missing: ${token}`);
}

assert.ok(!footer.includes('compactMode'), 'Global footer must not switch to a compact route-specific presentation.');
assert.ok(!footer.includes("resolvedRoute === 'dashboard' ? <DashboardFooterArtwork"), 'Dashboard artwork must render on every route.');

for (const token of [
  'Global footer V13 · Dashboard footer becomes canonical site-wide',
  '.app-shell.metro-clean-system > footer.footer.signature-footer-collapsible.signature-footer-dashboard-global',
  'grid-template-columns: .95fr 1.08fr 1.07fr !important',
  'padding: 14px 14px 46px !important',
  'height: 48px !important',
  'font-size: 13px !important',
]) {
  assert.ok(footerCss.includes(token), `Global Dashboard footer style missing: ${token}`);
}

assert.ok(!/font-family\s*:/i.test(footerCss.slice(footerCss.indexOf('Global footer V13'))), 'Global Dashboard footer must preserve custom/regional font authority.');

const v13 = footerCss.slice(footerCss.indexOf('Global footer V13'));
const opens=(v13.match(/{/g)||[]).length;
const closes=(v13.match(/}/g)||[]).length;
assert.equal(opens, closes, 'Global footer V13 CSS braces must be balanced.');

console.log('PASS: Dashboard footer design is now the canonical full footer on every website route.');
