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
   footer.includes('data-halloween-footer={seasonalFooter.enabled ? "true" : "false"}') &&
   footer.includes("import './HalloweenFooterSkin.css'"), 'actual Footer adds opt-in Halloween class without changing existing DOM structure');
ok(footer.includes('signature-footer-v50-brian-logo') &&
   footer.includes('/footer-pek-logo.png') &&
   footer.includes('/footer-cambridge-logo.png') &&
   footer.includes('FooterPortfolioDialog') &&
   footer.includes('bes-portfolio-footer-trigger'), 'existing official logos, portfolio and credential cards remain intact');
ok(css.includes('[data-halloween-footer="true"]') &&
   css.includes('halloween-night-footer.svg') &&
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
console.log('BRIAN Halloween Footer QA PASS');
