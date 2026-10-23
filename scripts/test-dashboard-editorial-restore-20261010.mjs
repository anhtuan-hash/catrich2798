import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/WorkDashboard.jsx');
const planner = read('src/components/DashboardWorkPlanner.jsx');
const historical = [
  'teacher-dashboard-google-authentic.css',
  'teacher-dashboard-calendar-split.css',
  'teacher-dashboard-compact-layout.css',
  'teacher-dashboard-google-colorful.css',
  'teacher-dashboard-editorial-hero.css',
  'teacher-dashboard-timeline-v2.css',
];

const imports = [...page.matchAll(/import '\.\.\/styles\/([^']+\.css)';/g)].map((m) => m[1]);
assert.deepEqual(imports.slice(0, 7), [...historical, 'dashboard-newsroom-editorial-20261023.css'],
  'Preserve the original October 10 CSS foundations then load the Newsroom authority');
assert.deepEqual(imports.slice(7),
  ['dashboard-hero-cms.css', 'dashboard-hero-minimal-20261023.css', 'dashboard-hero-typography.css'],
  'Keep independent Hero CMS, seasonal masking and single typography system after historical styles');
assert.match(page, /editorial-hero is-minimal/, 'Keep the approved quiet Dashboard Hero');
assert.match(page, /editorial-hero-hello/, 'Keep the personalized greeting');
assert.match(page, /editorial-status-weather/, 'Keep the dynamic weather');
assert.match(page, /<DashboardWorkPlanner\s/, 'Calendar is now owned by the modern Work Planner');
assert.match(planner, /id="dashboard-calendar"/, 'Keep the schedule deep-link target');
assert.match(planner, /onOpenItem/, 'Keep clickable calendar entries');
assert.match(page, /<DashboardNewsHub language=\{language\} \/>/, 'Keep the Newsroom');
assert.equal((page.match(/<DashboardWorkPlanner\s/g) || []).length, 1, 'There must be one schedule');
assert.ok(page.indexOf('editorial-hero is-minimal') < page.indexOf('<DashboardWorkPlanner'),
  'Hero precedes calendar');
assert.ok(page.indexOf('<DashboardWorkPlanner') < page.indexOf('<DashboardNewsHub language={language} />'),
  'Calendar precedes Newsroom');

for (const retired of [
  'DashboardCommandCenter', 'DashboardDailyBrief', 'DashboardInsights',
  'DashboardWeeklyPlanner', 'DashboardWidgetBoard', 'DashboardCommandPalette',
  'BrianDashboardDropZone', 'dashboard-unified-v33.css', 'dashboard-v34-wide-news.css',
  'gd-v31-toolbar', 'dcc-next-event', '<Surface title={t.quickActions}',
]) assert.ok(!page.includes(retired), 'Unwanted command-center element: ' + retired);

assert.match(page, /loadDashboardSnapshot\(currentUser\)/, 'Keep live Work Hub data');
assert.match(page, /DASHBOARD_SOURCE_EVENTS\.forEach/, 'Refresh on source changes');
assert.match(page, /dashboardRequestRef\.current/, 'Ignore stale calendar responses');
assert.match(page, /weatherRequestRef\.current/, 'Ignore stale weather responses');
assert.match(page, /isDashboardTeachingPeriod\(item\)/, 'Keep current schedule classification');
assert.match(page, /dashboardLocalDayKey/, 'Keep improved date handling');
assert.match(page, /bes-dashboard-focus/, 'Keep schedule deep links');
assert.match(read('src/components/DashboardNewsHub.jsx'), /role="tablist"/, 'Keep VN and English news channels');
console.log('PASS: Dashboard Hero, standalone Work Planner and Newsroom remain intact with original style foundations.');
