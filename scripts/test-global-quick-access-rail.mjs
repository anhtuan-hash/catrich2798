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
assert.ok(main.includes('data-quick-access-layout={quickAccessEnabled'), 'App shell must expose the global Quick Access layout contract.');
assert.ok(main.includes('data-quick-access-safe-frame={quickAccessEnabled'), 'Routed content must use the shell-level Quick Access safe frame.');
assert.ok(!rail.includes("currentRoute === 'dashboard'"), 'Dashboard must not be filtered out by the Quick Access component.');
assert.ok(rail.includes('createPortal(quickAccessUi, document.body)'), 'Quick Access must be portaled above route stacking contexts.');
assert.ok(rail.includes("root.style.fontFamily = shellStyle.fontFamily"), 'Portaled Quick Access must inherit the active Brian custom font.');

for (const token of [
  'QUICK_ACCESS_MAX_ITEMS',
  'loadQuickAccessConfigFromCloud',
  'saveQuickAccessConfigToCloud',
  'subscribeQuickAccessConfig',
  'bes_quick_access_settings',
  'QUICK_ACCESS_MODES',
  'loadQuickAccessRecent',
  'pushQuickAccessRecent',
]) {
  assert.ok(prefs.includes(token), `Preference contract missing: ${token}`);
}

assert.match(prefs, /QUICK_ACCESS_MAX_ITEMS\s*=\s*10/, 'Quick Access must cap shortcuts at 10.');
assert.ok(prefs.includes('version: 2'), 'Quick Access V2 config must use version 2.');
assert.ok(prefs.includes("mode: 'auto'"), 'Quick Access V2 must default to Auto mode.');
assert.ok(prefs.includes("storageKey(user)"), 'Local fallback must be scoped per account.');
assert.ok(prefs.includes('updatedAt: 0'), 'New-device defaults must not outrank an existing cloud configuration.');
assert.ok(prefs.includes('hasExplicitItems'), 'An explicitly empty shortcut list must remain empty instead of resetting to defaults.');

for (const token of [
  'bqa-edge-trigger',
  'is-pinned',
  'onPointerEnter',
  'onPointerLeave',
  'onOutsidePointerDown',
  'bqa-hover-bridge',
  'inert={expanded ? undefined : true}',
  'bes-navigation-start',
  'event.altKey',
  'customizerQuery',
  'bqa-customizer-search',
  'data-route={currentRoute}',
  'QUICK_ACCESS_SAFE_AREA_MIN_WIDTH',
  'measureQuickAccessContentBaseline',
  'quickAccessSafeShift',
  'shell.dataset.quickAccessSafeShift',
  'quickAccessState',
  'ResizeObserver',
  'MutationObserver',
  'is-collapsing',
  'data-motion={collapsing ?',
  'collapseRail',
  'openRail',
  'QUICK_ACCESS_BADGE_EVENT',
  'commandQuery',
  'recentIds',
  'peekItemId',
  'actionMenuItemId',
  'bqa-command-search',
  'bqa-recent',
  'bqa-peek-card',
  'bqa-mode-switch',
  'is-focus-mode',
  'pushQuickAccessRecent',
  'event.metaKey || event.ctrlKey',
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
  '.bqa-root[data-route="dashboard"]',
  '.bqa-customizer-search',
  '.bqa-shortcut-hint',
  'body > .bqa-root',
  'Quick Access Apple Pencil Smooth Morph V2',
  'Brian Global Quick Access Safe Area V1',
  'Collapsed-panel final-state guard',
  '.bqa-root.is-collapsed:not(.is-collapsing) .bqa-panel',
  '[data-quick-access-layout="true"] > #bes-main-content > .bqa-content-safe-frame',
  'translate: var(--bqa-content-safe-shift, 0px) 0',
  '[data-quick-access-state="pinned"] > #bes-main-content > .bqa-content-safe-frame',
  'width: calc(var(--bqa-rail-width) + 8px + var(--bqa-panel-width))',
  '.bqa-hover-bridge',
  'width: 8px',
  'z-index: 2147483647 !important',
  'z-index: 2147482600',
  'footer[data-app-shell-footer="true"]',
  'data-quick-access-safe-mode="overlay"',
  '@media (max-width: 767px)',
  'transform-origin: 0 30px',
  '.bqa-root.is-collapsing .bqa-panel',
  '.bqa-root.is-collapsing .bqa-brand',
  'scale3d(.14, .70, 1)',
  'transition:',
  'Brian Quick Access V2 · command center',
  '.bqa-badge',
  '.bqa-command-search',
  '.bqa-recent-chips',
  '.bqa-peek-card',
  '.bqa-action-popover',
  '.bqa-mode-switch',
  '.bqa-root.is-focus-mode.is-collapsed',
]) {
  assert.ok(css.includes(token), `Quick Access visual contract missing: ${token}`);
}

assert.ok(!css.includes('clip-path: inset(0 89%'), 'Quick Access open/close motion must not animate expensive clip-path geometry.');
assert.ok(!rail.includes('openSettled'), 'Quick Access must not use a timer-based post-animation snap state.');
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

console.log('PASS: Brian Quick Access V2 has smooth motion, Auto/Pin/Focus modes, command search, recents, badges, Quick Peek, quick actions, account sync, permission filtering and a 10-shortcut cap.');
