import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dashboardHeroNameLines } from '../src/utils/dashboardHeroName.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dashboard = read('src/pages/WorkDashboard.jsx');
const layout = read('src/styles/dashboard-hero-minimal-20261023.css');
const typography = read('src/styles/dashboard-hero-typography.css');
const editor = read('src/components/DashboardHeroEditor.jsx');
const cms = read('src/utils/dashboardHeroCms.js');
const verify = (message, condition) => { assert.ok(condition, message); console.log('✓ ' + message); };

const begin = dashboard.indexOf('<section className="gd-top-grid db-hero-minimal-frame">');
const end = dashboard.indexOf('</section>', begin);
const hero = dashboard.slice(begin, end + 10);
verify('minimal Dashboard hero remains available', begin >= 0 && hero.includes('editorial-hero is-minimal'));
verify('both accounts render the SAME single h1 text node with newline separators',
  hero.includes("<h1 aria-label={String(name)}>{heroNameLines.join('\\n')}</h1>") &&
  !hero.includes('heroNameLines.map(') &&
  !hero.includes('db-hero-name-line'));
verify('two teacher names retain their original text and deterministic layout',
  dashboardHeroNameLines('Tuấn Nguyễn Anh').join('\n') === 'Tuấn Nguyễn Anh' &&
  dashboardHeroNameLines('Nguyễn Đăng Minh Hoa').join('\n') === 'Nguyễn Đăng\nMinh Hoa');
verify('live name, greeting, weather and manager edit button are preserved',
  hero.includes('{t.hello},') && hero.includes('aria-label={String(name)}') &&
  hero.includes('weatherDescription') && hero.includes('weatherTemperature') &&
  hero.includes('refreshWeather') && hero.includes('TP.HCM') &&
  hero.includes('db-hero-edit-button--inside') && hero.includes('onClick={openHeroEditor}'));
verify('custom image or video remains and the work planner is still mounted',
  hero.includes('hasDashboardHeroMedia') && hero.includes('db-hero-media-shade') &&
  dashboard.includes('<DashboardWorkPlanner') &&
  read('src/components/DashboardWorkPlanner.jsx').includes('id="dashboard-calendar"'));
verify('only greeting and weather remain within Hero',
  !['editorial-hero-meta','editorial-hero-actions','editorial-hero-links',
     'editorial-hero-lead','<DashboardHeroIllustration','<DashboardHeroCloudscape',
     '<DashboardHeroDoodles'].some(part => hero.includes(part)));
verify('font and gradient are centralized in one dedicated stylesheet, imported last',
  dashboard.includes("import '../styles/dashboard-hero-typography.css';") &&
  dashboard.indexOf("import '../styles/dashboard-hero-typography.css';") >
  dashboard.indexOf("import '../styles/dashboard-hero-minimal-20261023.css';") &&
  typography.includes('single authoritative system') &&
  !layout.includes('GRADIENT LETTERING · Dashboard greeting only') &&
  !layout.includes('ROOT FIX: make long teacher names'));
verify('consistent typeface/weight across name lengths, no descendant styling differences',
  typography.includes('font-weight: 500 !important;') &&
  typography.includes('font-family: "Google Sans"') &&
  typography.includes('white-space: pre-line !important;') &&
  !typography.includes('.db-hero-name-line') &&
  typography.includes('font-synthesis: none !important'));
verify('one gradient runs across whole h1, using only main text node',
  typography.includes('-webkit-background-clip: text !important;') &&
  typography.includes('background-clip: text !important;') &&
  typography.includes('var(--db-heading-color, #102c49) 0%') &&
  typography.includes('-webkit-text-fill-color: transparent !important;'));
verify('short, medium and long sizes adapt without changing font family/weight',
  typography.includes('.editorial-hero-heading.is-medium-name h1') &&
  typography.includes('.editorial-hero-heading.is-long-name h1') &&
  typography.includes('@media (max-width: 900px)') &&
  typography.includes('@media (max-width: 620px)'));
verify('seasonal masking remains isolated to Dashboard only',
  layout.includes('mask-composite: add') && layout.includes('bes-halloween-atmosphere') &&
  hero.includes('ref={heroExclusionRef}') &&
  dashboard.includes('delete root.dataset.dashboardHeroExclusion'));
verify('disabled motion and forced colors remain accessible',
  typography.includes('@media (prefers-reduced-motion: reduce)') &&
  typography.includes('@media (forced-colors: active)') &&
  typography.includes('-webkit-text-fill-color: CanvasText !important'));
verify('Dashboard CMS remains independent from Homepage',
  cms.includes("from('dashboard_hero_public')") &&
  cms.includes("from('dashboard_hero_drafts')") &&
  !cms.includes('homepage_hero_settings') &&
  editor.includes("set('headingColor'"));
console.log('PASS: unified greeting DOM + typography system, preserving Dashboard Hero and weather.');
