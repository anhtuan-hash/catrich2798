import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dash = read('src/pages/WorkDashboard.jsx');
const style = read('src/styles/dashboard-hero-minimal-20261023.css');
const editor = read('src/components/DashboardHeroEditor.jsx');
const cms = read('src/utils/dashboardHeroCms.js');
const verify = (name, result) => { assert.ok(result, name); console.log('✓ ' + name); };

const begin = dash.indexOf('<section className="gd-top-grid db-hero-minimal-frame">');
const end = dash.indexOf('</section>', begin);
const hero = dash.slice(begin, end + 10);
verify('hero section exists and is minimal', begin >= 0 && hero.includes('editorial-hero is-minimal'));
verify('greeting remains personalized and localized', hero.includes('{t.hello},') && hero.includes('<h1>{name}</h1>'));
verify('live weather is preserved with city, condition and temperature', hero.includes('weatherDescription') && hero.includes('weatherTemperature') && hero.includes('refreshWeather') && hero.includes('TP.HCM'));
verify('weather is the only remaining status widget', hero.includes('editorial-status-weather') && !hero.includes('editorial-status-time'));
verify('no hero date or eyebrow', !hero.includes('editorial-hero-meta') && !hero.includes('heroDate'));
verify('no hero body description, calendar buttons or quick links', !hero.includes('editorial-hero-lead') && !hero.includes('editorial-hero-actions') && !hero.includes('editorial-hero-links'));
verify('no large artwork, doodles or cloudscape in visible Hero', !hero.includes('<DashboardHeroIllustration') && !hero.includes('<DashboardHeroDoodles') && !hero.includes('<DashboardHeroCloudscape'));
verify('no edition chip or date widget', !hero.includes('editorial-today-chip') && !hero.includes('editorial-hero-stage'));
verify('custom background retained', hero.includes('hasDashboardHeroMedia') && hero.includes('backgroundType') && hero.includes('db-hero-media-shade'));
verify('editor remains accessible to the manager outside Hero', hero.includes('db-hero-edit-button--outside') && hero.indexOf('db-hero-edit-button--outside') < hero.indexOf('<header'));
verify('dashboard calendar itself is preserved', dash.includes('id="dashboard-calendar"') && dash.includes('gd-calendar-today'));
verify('decorative pseudo-elements are disabled', style.includes('editorial-hero.is-minimal::after') && style.includes('content: none !important'));
verify('greeting is readable at mobile widths', style.includes('@media (max-width: 620px)') && style.includes('overflow-wrap: break-word'));
verify('seasonal particles are kept off hero, not deleted globally', style.includes('z-index: 47 !important') && style.includes('z-index: 50 !important'));
verify('old editor dead controls are removed', !editor.includes("['content', Settings2") && !editor.includes('<Switch label="Hiển thị'));
verify('editor still supports background, shade and typography', editor.includes("['background', Image") && editor.includes("['appearance', Paintbrush") && editor.includes("set('headingColor'"));
verify('settings and media persist independently', cms.includes("from('dashboard_hero_public')") && cms.includes('dashboard_hero_drafts'));
verify('minimal CSS loads after base CSS', dash.indexOf("import '../styles/dashboard-hero-minimal-20261023.css'") > dash.indexOf("import '../styles/dashboard-hero-cms.css'"));
verify('gradient applies only to the two personal greeting lines', style.includes('GRADIENT LETTERING · Dashboard greeting only') &&
  style.includes('editorial-hero.is-minimal .editorial-hero-hello') && style.includes('editorial-hero.is-minimal .editorial-hero-heading h1') &&
  !style.includes('db-hero-weather .editorial-status-weather { background-image: linear-gradient'));
verify('text-clipped gradient handles Chromium and Safari', style.includes('-webkit-background-clip: text !important') &&
  style.includes('background-clip: text !important') && style.includes('-webkit-text-fill-color: transparent !important'));
verify('text gradient retains configurable teacher-name base hue', style.includes('var(--db-heading-color, #0e263e) 0%'));
verify('soft shimmer respects reduced motion, low performance and forced color modes',
  style.includes('bes-dashboard-greeting-gradient-flow 30s') &&
  style.includes('@media (prefers-reduced-motion: reduce)') &&
  style.includes('data-performance="minimal"') &&
  style.includes('@media (forced-colors: active)') &&
  style.includes('-webkit-text-fill-color: CanvasText !important'));
verify('long teacher names use lower proportional text sizes and balanced lines',
  style.includes('.editorial-hero-heading.is-long-name h1') &&
  style.includes('.editorial-hero-heading.is-medium-name h1') &&
  style.includes('text-wrap: balance !important') &&
  style.includes('font-size: clamp(30px, 7vw, 40px) !important'));
verify('gradient remains dark enough for complex photo backgrounds',
  style.includes('#183b60 34%') && style.includes('#344c70 67%') &&
  style.includes('filter: drop-shadow(0 2px 3px rgba(255,255,255,.95)) !important'));
verify('seasonal atmosphere is masked from Hero plus margin on the Dashboard only',
  hero.includes('ref={heroExclusionRef}') &&
  dash.includes('root.dataset.dashboardHeroExclusion') &&
  dash.includes('const margin = 38') &&
  style.includes('html[data-dashboard-hero-exclusion="on"]') &&
  ['.bes-halloween-atmosphere', '.bes-november-atmosphere', '.bes-vn-atmosphere'].every(s => style.includes(s)));
verify('mask dynamically follows viewport scroll and resize and cleans up on route change',
  dash.includes("window.addEventListener('scroll', schedule") &&
  dash.includes("window.addEventListener('resize', schedule") &&
  dash.includes('new ResizeObserver(schedule)') &&
  dash.includes('delete root.dataset.dashboardHeroExclusion') &&
  dash.includes('properties.forEach((key) => root.style.removeProperty(key))'));
verify('seasonal overlay masking uses additive CSS alpha masks rather than disabling the themes',
  style.includes('mask-composite: add') &&
  style.includes('-webkit-mask-composite: source-over') &&
  style.includes('--db-hero-exclusion-left') &&
  style.includes('--db-hero-exclusion-bottom'));
console.log('PASS: Dashboard personalized greeting + weather minimal design.');
