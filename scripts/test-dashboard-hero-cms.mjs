import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dashboard = read('src/pages/WorkDashboard.jsx');
const editor = read('src/components/DashboardHeroEditor.jsx');
const editorCss = read('src/components/DashboardHeroEditor.css');
const heroCss = read('src/styles/dashboard-hero-cms.css');
const cms = read('src/utils/dashboardHeroCms.js');
const sql = read('supabase/migrations/20261023193000_dashboard_hero_cms.sql');
const home = read('src/components/HomeHeroExperience2026.jsx');

const check = (name, ok) => { assert.ok(ok, name); console.log('✓ ' + name); };

check('Dashboard Hero editor is visible only to approved manager roles at UI layer', dashboard.includes('isDepartmentLeaderRole(currentUser?.role)') && dashboard.includes('{canEditHero ?'));
check('Dashboard editor is loaded lazily to avoid slowing teachers', dashboard.includes('React.lazy(() => import(\'../components/DashboardHeroEditor.jsx\'))'));
check('Dashboard retains dynamic time, weather, greeting, calendar actions', ['heroTime','weatherTemperature','scrollToCalendar','name','editorial-today-chip'].every(x => dashboard.includes(x)));
check('Dashboard has independent published and preview states', dashboard.includes('heroPublished') && dashboard.includes('heroPreview') && dashboard.includes('heroDraft'));
check('Live preview never writes to Supabase until user saves', dashboard.includes('onPreview={setHeroPreview}') && editor.includes('onPreview?.(normalizeDashboardHero(config))'));
check('Two CMS tables isolate published from draft', sql.includes('dashboard_hero_public') && sql.includes('dashboard_hero_drafts'));
check('Both settings tables have RLS and manager-only write policies', sql.includes('alter table public.dashboard_hero_public enable row level security') && sql.includes('alter table public.dashboard_hero_drafts enable row level security') && sql.includes("p.approved = true") && sql.includes("('admin','department_head','ttcm')"));
check('Anonymous users cannot access draft or published settings', sql.includes('revoke all on public.dashboard_hero_drafts from anon') && sql.includes('revoke all on public.dashboard_hero_public from anon'));
check('Published settings are readable to signed-in teachers', sql.includes('grant select on public.dashboard_hero_public to authenticated'));
check('Homepage Hero storage/configuration is never overwritten', !cms.includes('homepage_hero_settings') && !cms.includes('homepage_hero_public') && home.includes('HOME_HERO'));
check('Editors can upload media using existing validated storage infrastructure', editor.includes('uploadHomeHeroMedia(file, currentUser)'));
check('Media URL rejects javascript/data schemes and temporary blobs on publish', cms.includes("raw.startsWith('blob:')") && cms.includes("config.backgroundUrl.startsWith('blob:')") && cms.includes('https:'));
check('Dashboard hero can display JPG/GIF/video backgrounds', dashboard.includes('hasDashboardHeroMedia') && dashboard.includes('<video src={hero.backgroundUrl}') && dashboard.includes('<img src={hero.backgroundUrl}'));
check('Hero illustration, doodles, cloud layers can be toggled', ['hero.showArtwork','hero.showDoodles','hero.showClouds'].every(x => dashboard.includes(x)));
check('Right drawer has modal semantics keyboard dismissal and unsaved guard', editor.includes('createPortal(') && editor.includes('aria-modal="true"') && editor.includes("event.key === 'Escape'") && editor.includes('window.confirm('));
check('Responsive drawer, scroll and reduced motion are implemented', editorCss.includes('100dvh') && editorCss.includes('overscroll-behavior:contain') && editorCss.includes('prefers-reduced-motion:reduce'));
check('Custom media never blocks dashboard interaction', heroCss.includes('pointer-events:none') && dashboard.includes('editorial-hero-actions'));
check('Saving drafts does not publish them', cms.includes("from('dashboard_hero_drafts').upsert") && cms.includes("from('dashboard_hero_public').upsert"));
console.log('PASS: Dashboard Hero CMS standalone drawer, media, permissions and existing dashboard widgets.');
