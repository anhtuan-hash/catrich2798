import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/pages/WorkDashboard.jsx');
const historical = [
  'teacher-dashboard-google-authentic.css',
  'teacher-dashboard-calendar-split.css',
  'teacher-dashboard-compact-layout.css',
  'teacher-dashboard-google-colorful.css',
  'teacher-dashboard-editorial-hero.css',
  'teacher-dashboard-timeline-v2.css',
];

const imports = [...page.matchAll(/import '\.\.\/styles\/([^']+\.css)';/g)].map((m) => m[1]);
assert.deepEqual(imports, [...historical, 'dashboard-newsroom-editorial-20261023.css'],
  'Keep the six original October 10 editorial layers, then load the isolated Newsroom authority');
assert.match(page, /<header className="editorial-hero">/);
assert.match(page, /<DashboardHeroCloudscape\s*\/>/);
assert.match(page, /<DashboardHeroIllustration\s*\/>/);
assert.match(page, /id="dashboard-calendar"/);
assert.match(page, /gd-calendar-today gd-calendar-timeline-v2/);
assert.match(page, /<DashboardNewsHub language=\{language\} \/>/);
assert.equal((page.match(/id="dashboard-calendar"/g) || []).length, 1, 'There must be one schedule');
assert.ok(page.indexOf('<header className="editorial-hero">') < page.indexOf('id="dashboard-calendar"'));
assert.ok(page.indexOf('id="dashboard-calendar"') < page.indexOf('<DashboardNewsHub language={language} />'));

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
console.log('PASS: October 10 Dashboard restored to Hero + one Today agenda + full Newsroom, modern data safety preserved.');
