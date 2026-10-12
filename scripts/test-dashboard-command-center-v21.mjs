import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isDashboardSchedule, isDashboardActionableTask,
  isDashboardTeachingPeriod, dashboardLocalDayKey, dashboardDayOffset,
} from '../src/utils/dashboardClassification.js';

const oldSchedule = {
  id: 'calendar-1', source: 'work', status: 'assigned', done: false,
  date: '2026-07-20T08:00:00+07:00',
  raw: { item_type: 'schedule', status: 'assigned', metadata: { schedule_event: true } },
};
const oldTask = {
  id: 'work-1', source: 'work', status: 'assigned', done: false,
  date: '2026-07-20T08:00:00+07:00',
  raw: { item_type: 'task', status: 'assigned', metadata: {} },
};
const metaSchedule = { id: 'calendar-2', source: 'work', done: false, raw: { item_type: 'task', metadata: { schedule_event: true } } };
const pendingResource = { id: 'resource-1', source: 'resource', done: false, status: 'pending' };
assert.equal(isDashboardSchedule(oldSchedule), true, 'Calendar item must be a schedule');
assert.equal(isDashboardActionableTask(oldSchedule), false, 'Historic calendar event must not count as overdue work');
assert.equal(isDashboardActionableTask(metaSchedule), false, 'Metadata schedule flag must be respected');
assert.equal(isDashboardActionableTask(oldTask), true, 'Genuine unfinished task must stay visible');
assert.equal(isDashboardActionableTask({ ...oldTask, done: true }), false, 'Completed work must not count');
assert.equal(isDashboardActionableTask(pendingResource), false, 'Pending resources belong to approvals, not overdue');
assert.equal(isDashboardTeachingPeriod({ title: 'Tiết dạy 3 - tiếng Anh' }), true);
assert.equal(isDashboardTeachingPeriod({ title: 'Họp tổ chuyên môn' }), false);
assert.equal(dashboardLocalDayKey(new Date('2026-10-11T18:00:00.000Z')), '2026-10-12', 'Vietnam-local school day');
assert.equal(dashboardDayOffset('2026-10-13T08:00:00+07:00', new Date('2026-10-12T08:00:00+07:00')), 1);

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const aggregator = read('src/utils/dashboardAggregator.js');
const page = read('src/pages/WorkDashboard.jsx');
const center = read('src/components/DashboardCommandCenter.jsx');
const css = read('src/styles/dashboard-command-center-v21.css');
assert.match(aggregator, /relevantWork\.filter\(isDashboardActionableTask\)/);
assert.match(aggregator, /!isDashboardSchedule\(item\) && item\.status === 'submitted'/);
assert.match(aggregator, /openTasks: allAttention\.length/);
assert.match(aggregator, /!isDashboardTeachingPeriod\(item\)/);
assert.match(page, /todayEventCount=\{todayEvents\.length\}/, 'Card must share displayed schedule count');
assert.match(page, /weekDays\.map\(/, 'Week calendar must render groups');
assert.match(page, /setCalendarRange\('week'\)/);
assert.match(page, /setNewsExpanded\(\(v\) => !v\)/);
assert.match(center, /type="search"/);
assert.match(center, /visibleLimit/);
assert.match(center, /approval=\{filter === 'approvals'\}/);
assert.match(css, /\.gd-week-mode/);
assert.match(css, /\.dcc-task-search/);
console.log('PASS: 2.1 schedule/task classification, Vietnam dates, visible-day counts, search and collapsible UI.');
