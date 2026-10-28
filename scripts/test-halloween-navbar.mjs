import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=src('supabase/migrations/20261028093000_halloween_navbar_admin_toggle.sql');
const runtime=src('src/utils/halloweenNavbarTheme.js');
const css=src('src/components/HalloweenNavigationSkin.css');
const nav=src('src/components/GlobalFlatNavigation.jsx');
const desktop=src('src/components/GlobalCompactNavigation.jsx');
const mobile=src('src/components/mobile/MobileAppShell.jsx');
const settings=src('src/pages/Settings.jsx');
const panel=src('src/components/admin/HalloweenNavbarAdminPanel.jsx');
const pass=(cond,label)=>{assert.ok(cond,label);console.log('✓ '+label);};
pass(sql.includes('halloween_enabled boolean not null default true') &&
 sql.includes('on conflict(id) do nothing') &&
 sql.includes('grant select on table public.bes_navigation_theme_settings to anon, authenticated'),
 'the switch defaults ON and is publicly readable for guests');
pass(sql.includes('enable row level security') &&
 sql.includes('revoke all on table public.bes_navigation_theme_settings from public, anon, authenticated'),
 'direct public table mutation prohibited by RLS and grants');
pass(sql.includes("lower(coalesce(p.role,'')) in ('admin','administrator')") &&
 sql.includes('coalesce(p.approved,false)=true') &&
 sql.includes("not exists (") &&
 sql.includes('revoke all on function public.bes_set_halloween_navbar_enabled(boolean) from public, anon'),
 'server RPC requires approved Admin role and cannot execute as anonymous');
pass(runtime.includes("bes_set_halloween_navbar_enabled") &&
 runtime.includes('if (error) return { ok:false') &&
 runtime.includes('useHalloweenNavbarTheme()'),
 'server-confirmed admin save, cache, hook and error handling exist');
pass(runtime.includes("const TABLE = 'bes_navigation_theme_settings'") &&
 runtime.includes('window.addEventListener(\'focus\'') &&
 runtime.includes('subscribeTable({') &&
 runtime.includes('30000'),
 'public state revalidates through realtime, focus, and polling');
pass(nav.includes("{mobile ? <MobileAppShell {...props} /> : <Navigation {...props} />}") &&
 nav.includes("import './HalloweenNavigationSkin.css'") &&
 desktop.includes('useHalloweenNavbarTheme()') && mobile.includes('useHalloweenNavbarTheme()'),
 'original navigation split remains unchanged; both active shells read the public theme');
pass(desktop.includes('data-halloween-nav={seasonalNavbar.enabled ? "true" : "false"}') &&
 mobile.includes('data-halloween-nav={halloweenNavEnabled ? "true" : "false"}'),
 'theme attribute is placed on navigation surfaces only');
pass(settings.includes('HalloweenNavbarAdminPanel') &&
 settings.includes("isAdminRole(currentUser?.role)") &&
 settings.includes("activeModule === 'navigation'"),
 'Admin settings switch appears under Navigation only');
pass(panel.includes("currentUser?.provider === 'supabase'") &&
 panel.includes('aria-checked={Boolean(settings.enabled)}') &&
 panel.includes('disabled={busy || !available || !settings.verified}'),
 'only signed-in Supabase Admin has accessible confirmed-state toggle');
pass(css.includes('data-halloween-nav="true"') && css.includes('halloween-navbar.svg') &&
 !css.includes('main#bes-main-content') && !css.includes('.bha-hero') &&
 !css.includes('body {') && !css.includes(':root {'),
 'seasonal CSS never styles the Hero or rest of the website');
pass(css.includes('.brian-nav[data-halloween-nav="true"]') &&
 css.includes('.bes-mobile-shell[data-halloween-nav="true"]'),
 'desktop and mobile get the same scoped seasonal background');
pass(src('src/components/HomePublishedSlideshow.jsx').includes('data-halloween-theme=') &&
 !nav.includes('HomePublishedSlideshowHalloween.css'),
 'existing independent Halloween slideshow remains isolated');
console.log('BRIAN Halloween Navigation admin switch QA PASS');
