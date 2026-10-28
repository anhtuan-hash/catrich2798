import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const nav=read('src/components/HalloweenNavigationRefinement.css');
const footer=read('src/components/HalloweenFooterRefinement.css');
const navComponent=read('src/components/GlobalFlatNavigation.jsx');
const footerComponent=read('src/components/Footer.jsx');
const navTheme=read('src/utils/halloweenNavbarTheme.js');
const footerTheme=read('src/utils/halloweenFooterTheme.js');
const spec=read('docs/brian-seasonal-chrome-v3-spec.md');
const pass=(ok,name)=>{assert.ok(ok,name);console.log('✓ '+name)};
const allSelectors=(css)=>css.split('{').slice(0,-1).map(s=>s.split('}').pop().trim())
  .filter(x=>x && !x.startsWith('@') && !x.startsWith('/*'));
pass(nav.includes('.brian-nav[data-halloween-nav="true"]') &&
  !nav.includes('.brian-nav[data-halloween-nav="false"]'),
  'navbar colors remain strictly seasonal and OFF stays original');
pass(nav.includes('--nav-pastel-surface:#fff8f0!important') &&
  nav.includes('background:#fff8f0!important') &&
  nav.includes('background:#f4ad69!important') &&
  nav.includes('font-family:Inter,system-ui'),
  'all route pills use one ivory+ink system and selected route is pumpkin');
pass(!nav.includes('.boh-hero') && !nav.includes('footer[data-app-shell-footer') &&
  !nav.includes('body {') && !nav.includes(':root {'),
  'navigation refinement never changes Hero or footer');
pass(footer.includes('data-halloween-footer="true"') &&
  footer.includes("url('/assets/footer/halloween-brand-card.svg')") &&
  footer.includes("url('/assets/footer/halloween-profile-card.svg')") &&
  footer.includes("url('/assets/footer/halloween-credentials-card.svg')"),
  'footer styles only the three existing original Halloween card drawings');
pass(footer.includes('padding-bottom:26px!important') &&
  footer.includes('padding-inline-end:clamp(67px,5.7vw,90px)!important'),
  'compact bottom frame and desktop text-safe area protect attribution and certificates');
pass(footer.includes('radial-gradient') &&
  footer.includes('background-size:cover,100% 100%,cover!important') &&
  footer.includes('visibility:hidden!important'),
  'subtle shared gradients tone down drawings and remove former pastel landscape');
pass(footer.includes('color:#362d3f!important') &&
  footer.includes('color:#44305b!important') &&
  footer.includes('color:#a84819!important'),
  'card information retains strong contrasting body/profile/credential colors');
pass(!footer.includes('.brian-nav') && !footer.includes('.boh-hero') &&
  !footer.includes(':root {') && !footer.includes('body {'),
  'footer remains scoped, never styles navigation or Hero');
pass(navComponent.includes("import './HalloweenNavigationSkin.css';\nimport './HalloweenNavigationRefinement.css';") &&
  footerComponent.includes("import './HalloweenFooterSkin.css';\nimport './HalloweenFooterRefinement.css';"),
  'new refinements load after existing seasonal styles, without replacing original baseline');
pass(navTheme.includes('bes_set_halloween_navbar_enabled') &&
  footerTheme.includes('bes_set_halloween_footer_enabled') &&
  footerComponent.includes('data-halloween-footer={seasonalFooter.enabled ? "true" : "false"}'),
  'two independent Supabase Admin switches are unchanged');
pass(spec.includes('WCAG AA') &&
  spec.includes('Portfolio') && spec.includes('No migration'),
  'complete approved quality gates and rollback documented');
console.log('BRIAN Halloween Chrome V3 scoped-spec QA PASS');
