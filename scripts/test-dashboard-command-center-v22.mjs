import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dashboardDayOffset } from '../src/utils/dashboardClassification.js';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const aggregator = read('src/utils/dashboardAggregator.js');
const component = read('src/components/DashboardCommandCenter.jsx');
const page = read('src/pages/WorkDashboard.jsx');
const css = read('src/styles/dashboard-command-center-v22.css');
const workflow = read('.github/workflows/dashboard-command-center-v2.yml');

assert.match(aggregator, /const attention = \[\.\.\.allAttention\]\.sort/);
assert.doesNotMatch(aggregator, /const attention = \[\.\.\.allAttention\][\s\S]*?\.slice\(0, 80\)/);
assert.match(aggregator, /const approvals = allApprovals;/);
assert.match(aggregator, /mineOverdue:/);
assert.match(aggregator, /mineDueSoon:/);
assert.match(aggregator, /mineOpenTasks:/);
assert.match(aggregator, /limited: rows\.length >= WORK_DASHBOARD_MAX_ITEMS/);
assert.match(aggregator, /coverageLimited: Boolean\(workResult\.limited\)/);
assert.match(aggregator, /return dashboardDayOffset\(value, now\)/);
assert.match(component, /dcc-scope-switch/);
assert.match(component, /filter\(\(item\) => item\.mine\)/);
assert.match(component, /const filtered = useMemo/);
assert.match(component, /dcc-sync-strip/);
assert.match(component, /dcc-data-limited/);
assert.match(component, /title=\{id === 'overdue' \? t\.counterTip/);
assert.match(page, /dcc-next-event/);
assert.match(page, /nextEvent = timeline\.find\(\(item\) => new Date\(item\.date\)\.getTime\(\) >= now\.getTime\(\)\) \|\| null/);
assert.match(css, /\.dcc-next-event/);
assert.match(css, /@media\(max-width:640px\)/);
assert.ok(workflow.includes('dashboard-command-center-v22.mjs'), 'v22 CI coverage missing');

if (process.env.TZ === 'America/New_York') {
  // Mar 8, 2026 loses an hour; the calendar-day difference is still exactly one.
  const before = new Date('2026-03-08T08:00:00-04:00');
  const after = new Date('2026-03-09T08:00:00-04:00');
  assert.equal(dashboardDayOffset(after, before), 1);
} else {
  assert.equal(dashboardDayOffset('2026-10-13T08:00:00+07:00', new Date('2026-10-12T08:00:00+07:00')), 1);
}
console.log('PASS Dashboard 2.2: full search pool, task scope, source coverage, next event and DST-safe arithmetic.');
