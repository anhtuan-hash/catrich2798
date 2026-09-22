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

for (const token of [
  'data-route={currentRoute}',
  'route={currentRoute}',
]) {
  assert.ok(main.includes(token), `Main route exposure missing: ${token}`);
}

assert.ok(
  footer.includes('data-footer-route={route || undefined}'),
  'Footer must expose route for direct dashboard styling.',
);

for (const token of [
  'Dashboard V6 static top chrome authority',
  '.app-shell[data-route="dashboard"] > .bes-top-chrome',
  'position: relative !important',
  '[data-bes-pinned-hub-spacer]',
]) {
  assert.ok(navCss.includes(token), `Navigation V6 token missing: ${token}`);
}

for (const token of [
  'Dashboard V6 direct route authority',
  '.bes-top-chrome[data-route="dashboard"]',
  '.brian-newswire',
]) {
  assert.ok(chromeCss.includes(token), `Top chrome V6 token missing: ${token}`);
}

for (const token of [
  'Dashboard footer V6 direct route refinement',
  '[data-footer-route="dashboard"]',
  'padding: 18px 18px 112px !important',
  "content: 'Teach Better Together ♡'",
  'linear-gradient(180deg, #f8fcff 0%, #f7fcff 55%, #eef8ff 100%)',
]) {
  assert.ok(footerCss.includes(token), `Footer V6 token missing: ${token}`);
}

assert.ok(
  !/Dashboard V6 direct route authority[\s\S]*font-family\s*:/i.test(chromeCss),
  'Dashboard top chrome V6 must not override custom/regional font authority.',
);

console.log('PASS: Dashboard V6 removes pinned chrome runtime, hard-stops sticky overlay and refines footer/signoff geometry.');
