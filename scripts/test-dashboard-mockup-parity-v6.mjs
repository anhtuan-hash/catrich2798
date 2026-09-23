import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const flatNav = await readFile(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const navCss = await readFile(new URL('../src/components/GlobalCompactNavigation.css', import.meta.url), 'utf8');
const chromeCss = await readFile(new URL('../src/components/DashboardTopChromeMockup.css', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const footer = await readFile(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');
const footerCss = await readFile(new URL('../src/components/FooterDashboardMockup.css', import.meta.url), 'utf8');

assert.ok(
  flatNav.includes("!mobile && props.route !== 'dashboard' ? <GlobalPinnedNavigationHub"),
  'Dashboard must not mount the pinned navigation runtime.',
);

assert.ok(
  main.includes("!['homeroom-portal', 'classroom-join'].includes(currentRoute) ? <div className=\"bes-top-chrome\">"),
  'Canonical top-chrome mount must remain intact for public-route contracts.',
);

assert.ok(
  footer.includes('data-footer-route={resolvedRoute || undefined}'),
  'Footer must expose its resolved route for direct dashboard styling.',
);

for (const token of [
  'Dashboard V6 static top chrome authority',
  '.app-shell[data-route="dashboard"] > .bes-top-chrome',
  'position: relative !important',
  'overflow: visible !important',
  '[data-bes-pinned-hub-spacer]',
]) {
  assert.ok(navCss.includes(token), `Navigation V6 token missing: ${token}`);
}

for (const token of [
  'Mockup Parity V11',
  '.app-shell[data-route="dashboard"] > .bes-top-chrome',
  'position: relative !important',
  '.brian-newswire',
  'width: 100% !important',
]) {
  assert.ok(chromeCss.includes(token), `Top chrome visual contract missing: ${token}`);
}

for (const token of [
  'Mockup Parity V11',
  '[data-footer-route="dashboard"]',
  'padding: 14px 14px 64px !important',
  '.signature-footer-dashboard-landscape',
  '.signature-footer-dashboard-signoff',
]) {
  assert.ok(footerCss.includes(token), `Footer visual contract missing: ${token}`);
}
assert.ok(footer.includes('Teach Better Together ♡'), 'Dashboard footer sign-off must remain in the real DOM artwork.');

assert.ok(
  !/Mockup Parity V11[\s\S]*font-family\s*:/i.test(chromeCss),
  'Dashboard top chrome V6 must not override custom/regional font authority.',
);

console.log('PASS: Dashboard V6 removes pinned chrome runtime, hard-stops sticky overlay and refines footer/signoff geometry.');
