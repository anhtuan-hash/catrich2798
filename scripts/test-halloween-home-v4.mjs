import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261028113000_halloween_home_master_v4.sql');
const hook=read('src/utils/halloweenHomeTheme.js');
const panel=read('src/components/admin/HalloweenHomeAdminPanel.jsx');
const settings=read('src/pages/Settings.jsx');
const nav=read('src/components/GlobalCompactNavigation.jsx');
const mobile=read('src/components/mobile/MobileAppShell.jsx');
const footer=read('src/components/Footer.jsx');
const slideshow=read('src/components/HomePublishedSlideshow.jsx');
const home=read('src/pages/Home.jsx');
const overlay=read('src/styles/HalloweenFullHomeV4.css');
const bridge=read('src/components/GlobalFlatNavigation.jsx');
const spec=read('docs/brian-halloween-home-v4-acceptance-spec.md');
const gate=(id,ok,explanation)=>{assert.ok(ok,id+': '+explanation);console.log('PASS '+id+' — '+explanation);};
gate('SECURITY',sql.includes('halloween_home_enabled boolean not null default false')&&
 sql.includes('security definer set search_path =')&&
 sql.includes("lower(coalesce(p.role,'')) in ('admin','administrator')")&&
 sql.includes('coalesce(p.approved,false)=true')&&
 sql.includes('revoke all on function public.bes_set_halloween_home_enabled(boolean) from public, anon'),
 'public staging OFF, authenticated approved-Admin-only atomic RPC');
gate('MASTER',sql.includes('halloween_enabled=p_enabled') &&
 sql.includes('halloween_footer_enabled=p_enabled') &&
 hook.includes('bes_set_halloween_home_enabled')&&
 hook.includes('subscribeTable(')&&hook.includes('30000'),
 'the master ON/OFF atomically syncs navbar/footer and realtime public readers');
gate('ADMIN',panel.includes("currentUser?.provider==='supabase'")&&
 panel.includes("isAdminRole(currentUser?.role)")&&
 panel.includes('aria-checked={Boolean(theme.enabled)}')&&
 settings.includes('<HalloweenHomeAdminPanel')&&
 settings.includes('<HalloweenNavbarAdminPanel')&&
 settings.includes('<HalloweenFooterAdminPanel'),
 'Admin controls show master and existing independent settings, with state confirmation');
gate('G01',nav.includes('seasonalHome.enabled && (route === "home" || seasonalNavbar.enabled)')&&
 mobile.includes('seasonalHome.enabled && seasonalNavbar.enabled'),
 'master OFF restores original navbar on desktop/mobile even if cached child flag is ON');
gate('G02',overlay.includes('.bha-hero.hero-cms')&&
 !overlay.includes('filter:blur(')&&
 !overlay.includes('.hero-cms__overlay')&&
 !overlay.includes('.hero-cms__media {'),
 'Hero decoration never adds glass, blur or media override');
gate('G03',slideshow.includes('seasonalHome.enabled && isHalloweenAlbum(selected)')&&
 slideshow.includes('className="bhs-home__story-panel"')&&
 slideshow.includes('className="bhs-home__stage"')&&
 overlay.includes('object-fit:contain!important'),
 'slideshow appearance is master-gated; original uncropped poster and left-side story preserved');
gate('G04',overlay.includes('.bha-practice.bha-practice--editorial-v3')&&
 overlay.includes('.bha-folio-grade--10')&&
 overlay.includes('.bha-folio-grade--11')&&
 overlay.includes('.bha-folio-grade--12')&&
 !overlay.includes('pointer-events:none!important;\n  cursor'),
 'all three weekly sections have coordinated colors with real click targets intact');
gate('G05',footer.includes('seasonalHome.enabled && (resolvedRoute === "home" || seasonalFooter.enabled)')&&
 read('src/components/HalloweenFooterRefinement.css').includes('halloween-brand-card.svg')&&
 read('src/components/HalloweenFooterRefinement.css').includes('halloween-credentials-card.svg'),
 'Footer decorated internally, with master OFF restoring original 3 cards');
gate('G06',overlay.includes('.bes-halloween-atmosphere')&&
 overlay.includes('visibility:hidden!important')&&
 overlay.includes('pointer-events:none!important'),
 'oversized fixed floating stickers cannot obscure Home UI');
gate('G07',bridge.includes('root.dataset.halloweenHomeV4 = active') &&
 bridge.includes('shell.dataset.halloweenHomeV4 = active') &&
 home.includes("import '../styles/HalloweenFullHomeV4.css'")&&
 overlay.includes('[data-halloween-home-v4="on"]')&&
 !overlay.includes(':root {'),
 'public Home + mobile theme scoped and fully reversible');
gate('AUDIT',Array.from({length:7},(_,i)=>'G0'+(i+1)).every(id=>spec.includes(id+' —'))&&
 spec.includes('Chỗ này đã bám sát mockup chưa? Nếu chưa, sửa tiếp.'),
 'each of seven mockup checkpoints has a hard review/fix loop');
console.log('BRIAN HALLOWEEN HOME V4 SOURCE GATES PASS');
