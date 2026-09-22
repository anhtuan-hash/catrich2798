import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rail = await readFile(new URL('../src/components/GlobalQuickAccessRail.jsx', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');
const footerComponent = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');

assert.ok(
  !rail.includes("currentRoute === 'dashboard'"),
  'Dashboard must render the global Quick Access rail; only Home excludes it.',
);
assert.ok(
  rail.includes('data-route={currentRoute}'),
  'Quick Access must expose the active route so Dashboard can apply its own safe offset/stacking authority.',
);

assert.ok(
  footerComponent.includes('data-footer-route={resolvedRoute || undefined}'),
  'Footer must expose the resolved route for Dashboard-only authority.',
);

for (const token of [
  'Mockup Parity V11',
  '[data-footer-route="dashboard"]',
  'padding: 14px 14px 64px !important',
  '.signature-footer-v50-brand',
  '.signature-footer-v50-profile',
  '.signature-footer-v50-credentials',
  '.signature-footer-dashboard-artwork',
]) {
  assert.ok(footer.includes(token), `Dashboard footer V7+ token missing: ${token}`);
}

assert.equal(
  (footer.match(/Dashboard footer — Mockup Parity V11/g) || []).length,
  1,
  'Dashboard footer must have one visual authority layer only.',
);
assert.ok(footerComponent.includes('Teach Better Together ♡'), 'Dashboard footer sign-off must remain in real DOM artwork.');

assert.ok(
  !footer.includes('Dashboard footer V5 fallback authority') &&
  !footer.includes('Dashboard footer V6 direct route refinement'),
  'Legacy stacked Dashboard footer authorities must be removed.',
);

for (const className of ['brand', 'profile', 'credentials']) {
  const match = footer.match(new RegExp('\\.signature-footer-v50-' + className + '\\s*\\{([^}]*)\\}', 'i'));
  assert.ok(match, `Footer card style missing: ${className}`);
  assert.ok(!/radial-gradient/i.test(match[1]), `Footer card ${className} must not use radial-gradient artwork.`);
}

assert.ok(
  !/font-family\s*:/i.test(footer),
  'Dashboard footer V7 must preserve custom/regional font authority.',
);

const opens=(footer.match(/{/g)||[]).length;
const closes=(footer.match(/}/g)||[]).length;
assert.equal(opens, closes, 'Dashboard footer V7 CSS braces must be balanced.');

console.log('PASS: Dashboard V7 preserves footer authority while allowing the global Quick Access rail with route-scoped positioning and font safety.');
