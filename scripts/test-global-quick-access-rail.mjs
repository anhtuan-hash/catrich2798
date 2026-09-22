import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const rail = await readFile(new URL('../src/components/GlobalQuickAccessRail.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/components/GlobalQuickAccessRail.css', import.meta.url), 'utf8');
const prefs = await readFile(new URL('../src/utils/quickAccessPreferences.js', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/quick_access_settings_v11_9_6.sql', import.meta.url), 'utf8');

assert.ok(main.includes("GlobalQuickAccessRail = lazy"), 'Quick Access must be lazy-loaded by the app shell.');
assert.ok(main.includes("currentRoute !== 'home'"), 'Quick Access must not render on Home.');
assert.ok(main.includes('scope="quick-access-rail"'), 'Quick Access must be protected by the global error boundary.');
assert.ok(main.includes('appVisibility={appVisibility}'), 'Quick Access must receive app visibility state.');
assert.ok(!rail.includes("currentRoute === 'dashboard'"), 'Dashboard must not be filtered out by the Quick Access component.');

for (const token of [
  'QUICK_ACCESS_MAX_ITEMS',
  'loadQuickAccessConfigFromCloud',
  'saveQuickAccessConfigToCloud',
  'subscribeQuickAccessConfig',
  'bes_quick_access_settings',
]) {
  assert.ok(prefs.includes(token), `Preference contract missing: ${token}`);
}

assert.match(prefs, /QUICK_ACCESS_MAX_ITEMS\s*=\s*10/, 'Quick Access must cap shortcuts at 10.');
assert.ok(prefs.includes("storageKey(user)"), 'Local fallback must be scoped per account.');
assert.ok(prefs.includes('updatedAt: 0'), 'New-device defaults must not outrank an existing cloud configuration.');
assert.ok(prefs.includes('hasExplicitItems'), 'An explicitly empty shortcut list must remain empty instead of resetting to defaults.');

for (const token of [
  'bqa-edge-trigger',
  'is-pinned',
  'onPointerEnter',
  'onPointerLeave',
  'onOutsidePointerDown',
  'inert={expanded ? undefined : true}',
  'bes-navigation-start',
  'event.altKey',
  'customizerQuery',
  'bqa-customizer-search',
  'data-route={currentRoute}',
  'draggable',
  'Tùy chỉnh thanh truy cập nhanh',
  "document.querySelector('.brian-nav__attendance-tab')",
  "document.querySelector('.brian-nav__ttcm-tab')",
]) {
  assert.ok(rail.includes(token), `Quick Access behavior missing: ${token}`);
}

for (const token of [
  'position: fixed',
  'pointer-events: none',
  'translate3d',
  '318px',
  '@media (max-width: 760px), (hover: none)',
  '@media (prefers-reduced-motion: reduce)',
  '.app-shell[data-route="dashboard"] .bqa-root',
  '.bqa-customizer-search',
  '.bqa-shortcut-hint',
]) {
  assert.ok(css.includes(token), `Quick Access visual contract missing: ${token}`);
}

assert.ok(!/font-family\s*:/i.test(css), 'Quick Access CSS must not override Brian custom fonts.');
assert.ok(!/\.app-shell\s*\{/.test(css), 'Quick Access CSS must not mutate global app-shell layout.');
assert.ok(!/body\s*\{/.test(css), 'Quick Access CSS must remain component-scoped.');

for (const token of [
  'create table if not exists public.bes_quick_access_settings',
  'enable row level security',
  'auth.uid() = user_id',
  'to authenticated',
]) {
  assert.ok(migration.toLowerCase().includes(token.toLowerCase()), `Quick Access migration missing: ${token}`);
}

const cssOpen = (css.match(/{/g) || []).length;
const cssClose = (css.match(/}/g) || []).length;
assert.equal(cssOpen, cssClose, 'Quick Access CSS braces must be balanced.');

console.log('PASS: global Quick Access rail is Dashboard-visible, account-aware, searchable, keyboard-accessible, permission-aware, font-safe, responsive, overlay-only and capped at 10 shortcuts.');
