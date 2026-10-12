import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dashboard = read('src/pages/WorkDashboard.jsx');
const board = read('src/components/DashboardCommandCenter.jsx');
const css = read('src/styles/dashboard-command-center-v2.css');
const aggregator = read('src/utils/dashboardAggregator.js');
const dropZone = read('src/components/BrianDashboardDropZone.jsx');

const assertIncludes = (source, needle, label) => assert.ok(source.includes(needle), 'Missing ' + label);

for (const [needle, label] of [
  ['<DashboardCommandCenter', 'Dashboard 2.0 mount'],
  ['<BrianDashboardDropZone language={language}', 'original drop zone'],
  ['<DashboardNewsHub language={language}', 'news hub'],
  ['IntersectionObserver', 'deferred news load'],
  ['dashboardRequestRef.current', 'refresh race guard'],
  ['weatherRequestRef.current', 'weather race guard'],
  ['bes-dashboard-weather-location-v2', 'persisted location selection'],
  ['Bình Dương', 'weather location'],
  ['TP.HCM', 'weather fallback location'],
]) assertIncludes(dashboard, needle, label);

for (const [needle, label] of [
  ['getDashboardDueState', 'due state filter'],
  ['isLeader', 'permission-aware approval card'],
  ["jumpToQueue('approvals')", 'approvals card filter'],
  ['dcc-notification-panel', 'notification details'],
  ['snapshot?.homeroom', 'homeroom summary'],
  ['snapshot?.recentResources', 'resource quick links'],
  ['snapshot?.continueItems', 'recent workflow'],
]) assertIncludes(board, needle, label);

assert.match(aggregator, /todayEvents: timeline\.filter\(/, 'Today event stat must use timeline');
assert.match(aggregator, /overdue: allAttention\.filter\(/, 'Overdue stats must count full attention list');
assert.match(aggregator, /pendingApproval: allApprovals\.length/, 'Approval stats must count all items');
assert.match(aggregator, /const iso = dashboardLocalDayKey\(now\)/, 'Attendance must use local school date');
assert.match(css, /\.dcc-stats\s*\{/, 'Dashboard stats CSS');
assert.match(css, /@media\(max-width:640px\)/, 'Mobile layout CSS');
assert.match(css, /prefers-reduced-motion/, 'Reduced motion');
assert.match(dropZone, /consumeDashboardDropPacket|setDashboardDropPacket/, 'Drop-zone handoff must remain intact');

// Dashboard 3.0 declares reordered widgets before the main JSX return.
assertIncludes(dashboard, '<DashboardCommandCenter', 'Command Center mount');
assertIncludes(dashboard, '<DashboardWidgetBoard', 'Accessible widget DOM order');
assertIncludes(dashboard, 'calendar: (isDashboardSectionVisible', 'Calendar widget');
assertIncludes(dashboard, 'dropZone: (isDashboardSectionVisible', 'Drop Zone widget');
console.log('PASS dashboard-command-center-v2: data, interactions, location, loading, regressions and layout.');
