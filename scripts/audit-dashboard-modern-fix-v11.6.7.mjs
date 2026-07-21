import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const page = read('src/pages/WorkDashboard.jsx');
const aggregator = read('src/utils/dashboardAggregator.js');
const css = read('src/styles/work-dashboard-v1167.css');
const main = read('src/main.jsx');

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

add('Dashboard always renders a shell instead of a blocking blank loader', page.includes('createEmptyDashboardSnapshot') && !page.includes('return <div className="wd5-loading"'));
add('Initial loading uses skeleton cards', page.includes('LoadingRows') && page.includes('wd5-skeleton-list'));
add('Source loading has a visible compact status strip', page.includes('wd5-sync-strip') && page.includes('initialLoading'));
add('Partial source failure keeps available data visible', page.includes('partialErrors') && page.includes('wd5-partial-error'));
add('Retry action is present', page.includes('onClick={() => refresh()}') && page.includes('t.retry'));
add('Every data source has a timeout', aggregator.includes('SOURCE_TIMEOUT_MS = 4500') && aggregator.includes('withSourceTimeout'));
add('Data sources resolve independently', aggregator.includes('Promise.allSettled'));
add('Timeout and source errors have fallbacks', aggregator.includes('settledValue') && aggregator.includes('sourceErrors'));
add('Empty snapshot is role aware', aggregator.includes('createEmptyDashboardSnapshot') && aggregator.includes("role: leader ? 'leader' : 'teacher'"));
add('No hard dependency on removed workspace module', !aggregator.includes("from './workspace.js'"));
add('Dashboard uses full available width', css.includes('width:calc(100% - clamp(20px,2.2vw,48px))') && css.includes('max-width:none'));
add('Modern graphic hero is retained and enlarged', css.includes('min-height:258px') && css.includes('.wd5-hero-illustration'));
add('Five metric widgets remain equal in one grid', css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
add('Main cards have equal fixed row height', css.includes('grid-auto-rows:560px'));
add('Three management cards stay aligned', css.includes('grid-auto-rows:410px'));
add('Card content scrolls independently', css.includes('.wd5-scroll-list{height:100%;overflow:auto'));
add('Large readable typography is applied', css.includes('font-size:17px') && css.includes('font-size:1.55rem'));
add('Loading skeleton has shimmer animation', css.includes('@keyframes wd5-shimmer'));
add('Data source error/loading pills are styled', css.includes('.wd5-source-pill.tone-loading') && css.includes('.wd5-source-pill.tone-error'));
add(
  'Dashboard keeps 2/3 column layout at large font scale on wide screens',
  css.includes('Dashboard V2.7 — Preserve multi-column layouts at 130–140%')
    && css.includes('html[data-font-scale="130"] .wd5-main-grid')
    && css.includes('html[data-font-scale="140"] .wd5-triple-grid')
);
const contentTransferIndex = main.indexOf('<ContentTransferHub');
const contentTransferContext = contentTransferIndex >= 0
  ? main.slice(Math.max(0, contentTransferIndex - 1200), contentTransferIndex + 500)
  : '';
add(
  'Dashboard hides unrelated content-transfer overlay',
  contentTransferIndex >= 0
    && contentTransferContext.includes('dashboard')
    && contentTransferContext.includes('.includes(currentRoute)')
);
const utilityRailIndex = main.indexOf('<UnifiedUtilityRail');
const utilityRailContext = utilityRailIndex >= 0
  ? main.slice(Math.max(0, utilityRailIndex - 900), utilityRailIndex + 500)
  : '';
add(
  'Dashboard hides the global utility rail',
  utilityRailIndex >= 0
    && utilityRailContext.includes('dashboard')
    && utilityRailContext.includes('.includes(currentRoute)')
);
add('Dashboard hides global footer/music section', main.includes("!['homeroom-portal', 'dashboard'].includes(currentRoute)"));
add('Responsive single-column fallback remains', css.includes('@media(max-width:1120px)') && css.includes('.wd5-main-grid{grid-template-columns:1fr'));
add('Dark mode covers dashboard background and loading states', css.includes('html[data-theme="dark"] main[data-route="dashboard"]') && css.includes('html[data-theme="dark"] .wd5-skeleton-row'));

const failed = checks.filter((item) => !item.pass);
checks.forEach((item) => console.log(`${item.pass ? '✓' : '✗'} ${item.name}`));

if (failed.length) {
  console.error(`\n❌ Dashboard modern fix audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}

console.log(`\n✅ Dashboard modern fix audit PASS (${checks.length}/${checks.length})`);
