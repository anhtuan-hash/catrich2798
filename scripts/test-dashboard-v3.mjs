import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterDashboardTasks, sortDashboardTasks, getDashboardMonthGrid, buildDashboardBrief } from '../src/utils/dashboardV3Selectors.js';
import { defaultDashboardLayout, normalizeDashboardLayout, applyDashboardLayoutPreset, moveDashboardWidget, resizeDashboardWidget, DASHBOARD_BOARD_IDS } from '../src/utils/dashboardLayoutPreferences.js';

const date = new Date('2026-10-12T12:00:00+07:00');
const tasks=[
 {id:'late',title:'Late urgent', date:'2026-10-09T08:00:00+07:00',done:false,priority:'urgent',mine:true,updatedAt:'2026-10-10T12:00:00+07:00'},
 {id:'normal',title:'Regular task',date:'2026-10-15T10:00:00+07:00',done:false,priority:'normal',mine:false,updatedAt:'2026-10-11T12:00:00+07:00'},
 {id:'today',title:'Today important',date:'2026-10-12T08:00:00+07:00',done:false,priority:'high',mine:true,updatedAt:'2026-10-12T08:00:00+07:00'},
];
assert.deepEqual(sortDashboardTasks(tasks,'urgency',date).map(x=>x.id),['late','today','normal']);
assert.deepEqual(sortDashboardTasks(tasks,'date',date).map(x=>x.id),['late','today','normal']);
assert.deepEqual(filterDashboardTasks(tasks,{group:'overdue',priority:'urgent'},date).map(x=>x.id),['late']);
assert.deepEqual(filterDashboardTasks(tasks,{group:'all',owner:'mine'},date).map(x=>x.id),['late','today']);
assert.deepEqual(filterDashboardTasks(tasks,{query:'regular',sort:'recent'},date).map(x=>x.id),['normal']);
assert.deepEqual(sortDashboardTasks(tasks,'recent',date).map(x=>x.id),['today','normal','late']);
const brief=buildDashboardBrief({attention:tasks,timeline:[
 {id:'event1',title:'Meeting',date:'2026-10-13T07:00:00+07:00'},
 {id:'event2',title:'Later meeting',date:'2026-10-21T07:00:00+07:00'},
]},date);
assert.equal(brief.urgent,2);
assert.equal(brief.overdue,1);
assert.equal(brief.today,1);
assert.equal(brief.next.id,'event1');
assert.equal(brief.focus[0].id,'late');
const grid=getDashboardMonthGrid(date,0,[{id:'event',date:'2026-10-20T10:00:00+07:00'}]);
assert.equal(grid.filter(x=>x.inMonth).length,31);
assert.equal(grid.find(x=>x.key==='2026-10-20')?.events?.length,1);
assert.equal(grid[0].date.getDay(),1,'Month grid must begin on Monday');
assert.ok(grid.length===35 || grid.length===42);
assert.equal(getDashboardMonthGrid(date,1,[]).find(x=>x.inMonth).date.getMonth(),10);

const base=defaultDashboardLayout();
assert.deepEqual(base.boardOrder,[...DASHBOARD_BOARD_IDS]);
assert.equal(base.widgetSizes.calendar,'wide');
assert.equal(normalizeDashboardLayout({version:1,cardOrder:base.cardOrder, hiddenCards:[],hiddenSections:[],density:'comfortable'}).boardOrder.length,4,'2.3 layout should migrate');
const teacher=applyDashboardLayoutPreset('teacher');
assert.equal(teacher.preset,'teacher');
assert.equal(teacher.boardOrder[0],'quickActions');
assert.equal(teacher.density,'compact');
const homeroom=applyDashboardLayoutPreset('homeroom');
assert.equal(homeroom.widgetSizes.dropZone,'wide');
const moved=moveDashboardWidget(base,'quickActions',-1);
assert.equal(moved.boardOrder[0],'quickActions');
assert.equal(moved.preset,'default');
assert.equal(resizeDashboardWidget(moved,'calendar','tall').widgetSizes.calendar,'tall');
assert.equal(resizeDashboardWidget(moved,'calendar','not-allowed').widgetSizes.calendar,'wide');

const read = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/WorkDashboard.jsx');
const aggregator=read('src/utils/dashboardAggregator.js');
const editor=read('src/components/DashboardLayoutEditor.jsx');
const css=read('src/styles/dashboard-v3.css');
const board=read('src/components/DashboardWidgetBoard.jsx');
const center=read('src/components/DashboardCommandCenter.jsx');
for (const name of ['DashboardDailyBrief','DashboardInsights','DashboardMonthCalendar','DashboardWidgetBoard']) {
 assert.ok(page.includes('<'+name) || name==='DashboardMonthCalendar' && page.includes('<'+name),'Missing '+name);
}
assert.ok(page.includes("calendarRange === 'month'"),'Month mode');
assert.ok(page.includes('coverage={snapshot.calendarCoverage}'),'Calendar coverage disclaimer');
assert.ok(aggregator.includes('calendarWindow(now)'),'Monthly backend window');
assert.ok(aggregator.includes("item.schedule || !item.done"),'Completed calendar events remain visible');
assert.match(aggregator,/coverageLimited: Boolean\(workResult\.limited\)/);
assert.match(editor,/onDragStart/);
assert.match(editor,/moveDashboardWidget/);
assert.match(editor,/resizeDashboardWidget/);
assert.match(editor,/applyDashboardLayoutPreset/);
assert.match(board,/layout\.boardOrder\.map/);
assert.match(center,/filterDashboardTasks/);
assert.match(center,/gd-v3-task-controls/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/gd-v3-month-grid/);
assert.match(css,/gd-v3-brief/);
assert.match(css,/gd-v3-widget-board/);
assert.ok(!/\n(?:body|html|\.app-shell)\s*\{/.test(css),'Dashboard v3 CSS must remain route-scoped');
console.log('PASS Dashboard 3.0: schedule month, action prioritization, layout migration, presets and runtime contracts.');
