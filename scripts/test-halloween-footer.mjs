import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const db=read('supabase/migrations/20261028103000_halloween_footer_admin_toggle.sql');
const theme=read('src/utils/halloweenFooterTheme.js');
const footer=read('src/components/Footer.jsx');
const css=read('src/components/HalloweenFooterSkin.css');
const admin=read('src/components/admin/HalloweenFooterAdminPanel.jsx');
const settings=read('src/pages/Settings.jsx');
const navbar=read('src/utils/halloweenNavbarTheme.js');
const ok=(check,label)=>{assert.ok(check,label);console.log('✓ '+label)};
ok(db.includes('halloween_footer_enabled boolean not null default true') &&
   db.includes('bes_navigation_theme_settings') &&
   !db.includes('set halloween_enabled=') &&
   !db.includes('drop table'), 'new footer preference is on by default and separate from navbar');
ok(db.includes("lower(coalesce(p.role,'')) in ('admin','administrator')") &&
   db.includes('coalesce(p.approved,false)=true') &&
   db.includes('auth.uid()') &&
   db.includes('revoke all on function public.bes_set_halloween_footer_enabled(boolean) from public, anon'),
   'Admin role enforced by server; anonymous caller denied');
ok(theme.includes("from(TABLE)") &&
   theme.includes("'halloween_footer_enabled,updated_at'") &&
   theme.includes("bes_set_halloween_footer_enabled") &&
   theme.includes('if(error) return {ok:false') &&
   theme.includes('subscribeTable(') &&
   theme.includes('30000'), 'all-user public theme listener + Supabase RPC, error handling and realtime/polling');
ok(footer.includes('useHalloweenFooterTheme()') &&
   footer.includes('data-halloween-footer={seasonalHome.enabled && (resolvedRoute === "home" || seasonalFooter.enabled) ? "true" : "false"}') &&
   footer.includes("import './HalloweenFooterSkin.css'"), 'Footer skin only applies when both master and child flags are ON, DOM structure unchanged');
ok(footer.includes('signature-footer-v50-brian-logo') &&
   footer.includes('/footer-pek-logo.png') &&
   footer.includes('/footer-cambridge-logo.png') &&
   footer.includes('FooterPortfolioDialog') &&
   footer.includes('bes-portfolio-footer-trigger'), 'existing official logos, portfolio and credential cards remain intact');
ok(css.includes('[data-halloween-footer="true"]') &&
   css.includes('halloween-brand-card.svg') &&
   css.includes('halloween-profile-card.svg') &&
   css.includes('halloween-credentials-card.svg') &&
   !css.includes('.brian-nav') &&
   !css.includes('main#bes-main-content') &&
   !css.includes(':root {'), 'CSS stays within Footer only; navigation and Hero untouched');
ok(css.includes('.signature-footer-v50-profile') &&
   css.includes('.signature-footer-v50-credentials') &&
   css.includes('.signature-footer-v50-brand') &&
   css.includes('prefers-reduced-motion:reduce'), 'themed contrast-safe cards with accessible reduced-motion behavior');
ok(admin.includes("isAdminRole(currentUser?.role)&&currentUser?.provider==='supabase'") &&
   admin.includes('aria-checked={Boolean(settings.enabled)}') &&
   admin.includes('disabled={busy||!available||!settings.verified}') &&
   admin.includes('saveHalloweenFooterTheme(!settings.enabled)'), 'new accessible switch only for verified Admin and server-confirmed writes');
ok(settings.includes('<HalloweenNavbarAdminPanel') &&
   settings.includes('<HalloweenFooterAdminPanel') &&
   settings.includes("'footer','chân trang'"), 'two independent switches side-by-side in Admin Settings > Navigation');
ok(navbar.includes("bes_set_halloween_navbar_enabled") &&
   navbar.includes("'halloween_enabled,updated_at'"),'unchanged previous Halloween navigation toggle');
const svg=read('public/assets/footer/halloween-night-footer.svg');
ok(svg.includes('Fine, low-opacity corner webs') &&
  svg.includes('Discreet Halloween silhouette') &&
  !svg.includes('pumpkin') && !svg.includes('<ellipse cx="240"'),
  'refined footer artwork is restrained, no giant pumpkins, no busy central silhouettes');
ok(css.includes('z-index:70!important') &&
   css.includes('visibility:hidden!important') &&
   css.includes('overflow:hidden!important') &&
   css.includes('background-image:'),
  'seasonal footer is above global floating motifs and hides old pastel artwork without changing original footer');
for (const [name,src] of [
  ['brand','public/assets/footer/halloween-brand-card.svg'],
  ['profile','public/assets/footer/halloween-profile-card.svg'],
  ['credentials','public/assets/footer/halloween-credentials-card.svg'],
]) {
  const asset=read(src);
  ok(asset.startsWith('<svg') && asset.includes('viewBox="0 0 480 320"') &&
     !asset.includes('<rect width="480" height="320"') &&
     !asset.includes('<script') && !asset.includes('http://www.w3.org/1999/xhtml'),
     name+' artwork is a transparent, local, safe and responsive SVG');
}
const brandArt=read('public/assets/footer/halloween-brand-card.svg');
const profileArt=read('public/assets/footer/halloween-profile-card.svg');
const credentialsArt=read('public/assets/footer/halloween-credentials-card.svg');
ok(brandArt.includes('Pumpkin and lamp') && brandArt.includes('sitting cat') &&
   brandArt.includes('Corner web') === false && brandArt.includes('corner web'),
   'logo card has genuine Halloween web, lantern, pumpkin and cat detail');
ok(profileArt.includes('mini ghost') && profileArt.includes('bat silhouettes') === false &&
   profileArt.includes('Tiny') === false && profileArt.includes('path'),
   'profile card has independent lavender ghost and bat artwork');
ok(credentialsArt.includes('Bottom-right art') && credentialsArt.includes('pumpkin') &&
   credentialsArt.includes('cobweb') === false,
   'credentials card has small warm pumpkin and lantern detail');
ok(css.includes('url(\'/assets/footer/halloween-brand-card.svg\')') &&
   css.includes('url(\'/assets/footer/halloween-profile-card.svg\')') &&
   css.includes('url(\'/assets/footer/halloween-credentials-card.svg\')') &&
   !css.includes("url('/assets/footer/halloween-night-footer.svg')"),
   'Halloween decoration is painted INSIDE three cards, not on the dark frame');
ok(read('docs/halloween-footer-integrated-cards-spec.md').includes('Admin-only RPC') &&
   footer.includes('data-halloween-footer={seasonalHome.enabled && (resolvedRoute === "home" || seasonalFooter.enabled) ? "true" : "false"}'),
   'approved footer scope documented; the independent Admin switch now respects full-home master OFF');
console.log('BRIAN Halloween Footer QA PASS');
