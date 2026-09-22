import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rail = await readFile(new URL('../src/components/GlobalQuickAccessRail.jsx', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');
const footerComponent = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');

assert.ok(
  rail.includes("currentRoute === 'dashboard'"),
  'Dashboard must not render the global Quick Access rail in the approved mockup composition.',
);

assert.ok(
  footerComponent.includes('data-footer-route={resolvedRoute || undefined}'),
  'Footer must expose the resolved route for Dashboard-only authority.',
);

for (const token of [
  'approved mockup authority',
  '[data-footer-route="dashboard"]',
  "content: 'Teach Better Together ♡'",
  'padding: 18px 18px 92px !important',
  'No large radial discs',
  '.signature-footer-v50-brand',
  '.signature-footer-v50-profile',
  '.signature-footer-v50-credentials',
]) {
  assert.ok(footer.includes(token), `Dashboard footer V7 token missing: ${token}`);
}

assert.equal(
  (footer.match(/Dashboard footer — approved mockup authority/g) || []).length,
  1,
  'Dashboard footer must have one visual authority layer only.',
);

assert.ok(
  !footer.includes('Dashboard footer V5 fallback authority') &&
  !footer.includes('Dashboard footer V6 direct route refinement'),
  'Legacy stacked Dashboard footer authorities must be removed.',
);

assert.ok(
  !/\.signature-footer-v50-(?:brand|profile|credentials)[^{]*\{[\s\S]*?radial-gradient/i.test(footer),
  'Footer cards must not use radial-gradient artwork that can create oversized circles.',
);

assert.ok(
  !/font-family\s*:/i.test(footer),
  'Dashboard footer V7 must preserve custom/regional font authority.',
);

const opens=(footer.match(/{/g)||[]).length;
const closes=(footer.match(/}/g)||[]).length;
assert.equal(opens, closes, 'Dashboard footer V7 CSS braces must be balanced.');

console.log('PASS: Dashboard V7 removes the left rail, collapses footer CSS to one authority, removes giant circle artifacts and protects font authority.');
