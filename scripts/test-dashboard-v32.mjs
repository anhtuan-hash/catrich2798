import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDashboardWeek, buildDashboardWeekText, buildDashboardWeekICS } from '../src/utils/dashboardV32Planning.js';

const now = new Date(2026, 9, 12, 12, 0, 0);
const moment = new Date(2026, 9, 12, 8, 30, 0).toISOString();
const timeline = [
  { id:'e1', title:'Họp, tổ; English\\Planning', date:moment, sourceLabel:'Work Hub', description:'Line one\nLine two' },
  { id:'e1', title:'Duplicate meeting', date:moment },
  { id:'e2', title:'Báo cáo tuần',date:'2026-10-14',sourceLabel:'Calendar',allDay:true },
  { id:'past', title:'Old event',date:'2026-10-11' },
  { id:'future', title:'Out of 7 days',date:'2026-10-21' },
  { id:'invalid', title:'Invalid event',date:'invalid date' },
];
const attention = [
  { id:'t1',title:'Chuẩn bị học liệu',date:'2026-10-14',done:false,priority:'high' },
  { id:'t2',title:'Đã xử lý',date:'2026-10-15',done:true },
  { id:'t3',title:'Review this week',date:new Date(2026,9,18,8).toISOString(),done:false },
  { id:'t3',title:'Duplicate task',date:new Date(2026,9,18,8).toISOString() },
];
const timelineCopy=JSON.stringify(timeline);
const tasksCopy=attention.map(item=>item.id);
const days=buildDashboardWeek(timeline,attention,now);
assert.equal(days.length,7,'Fixed seven-day horizon');
assert.equal(days[0].key,'2026-10-12');
assert.equal(days[6].key,'2026-10-18');
assert.equal(days[0].events.length,1);
assert.equal(days[2].events.length,1,'Date-only event belongs to its calendar day in all timezones');
assert.equal(days[2].tasks.length,1);
assert.equal(days[6].tasks.length,1);
assert.equal(days.reduce((sum,day)=>sum+day.events.length,0),2);
assert.equal(days.reduce((sum,day)=>sum+day.tasks.length,0),2);
assert.equal(JSON.stringify(timeline),timelineCopy,'Must not mutate source events');
assert.deepEqual(attention.map(x=>x.id),tasksCopy,'Must not mutate source tasks');
const brief=buildDashboardWeekText(days,'vi');
assert.match(brief,/BRIAN — LỊCH 7 NGÀY/);
assert.match(brief,/Họp, tổ/);
assert.match(brief,/Chuẩn bị học liệu/);
const english=buildDashboardWeekText(days,'en');
assert.match(english,/SEVEN-DAY PLAN/);
assert.match(english,/Task: Review this week/);
const ics=buildDashboardWeekICS(days,new Date('2026-10-12T00:00:00.000Z'));
assert.match(ics,/BEGIN:VCALENDAR\r\nVERSION:2.0/);
assert.equal(ics.split('BEGIN:VEVENT').length-1,2,'Export events only; no invented task invitations');
assert.match(ics,/DTSTART;VALUE=DATE:20261014/);
assert.match(ics,/SUMMARY:Họp\\, tổ\\; English\\\\Planning/);
assert.match(ics,/DESCRIPTION:Line one\\nLine two/);
assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
for(const line of ics.split('\r\n')){
  assert.ok(Buffer.byteLength(line,'utf8')<=75,'ICS folded line exceeds 75 octets: '+line.slice(0,100));
}
const empty=buildDashboardWeek([],[],now);
assert.equal(empty.every(day=>!day.events.length&&!day.tasks.length),true);
const longTitle='Chương trình hội thảo tiếng Anh – '.repeat(16);
const longICS=buildDashboardWeekICS(buildDashboardWeek([{id:'very-long',title:longTitle,date:moment}],[],now),now);
assert.ok(longICS.includes('\r\n '),'ICS must fold long Unicode content');
for(const line of longICS.split('\r\n')){
  assert.ok(Buffer.byteLength(line,'utf8')<=75,'Folded Unicode line too long');
}

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/WorkDashboard.jsx');
const component=read('src/components/DashboardWeeklyPlanner.jsx');
const css=read('src/styles/dashboard-v32.css');
assert.match(page,/<DashboardWeeklyPlanner/);
assert.match(page,/timeline=\{timeline\}/);
assert.match(page,/attention=\{snapshot\.attention \|\| \[\]\}/);
assert.match(page,/dashboard-unified-v33\\.css/,'Unified stylesheet must replace individual page CSS imports');
const unified = read('src/styles/dashboard-unified-v33.css');
assert.ok(unified.includes('@import "./dashboard-v32.css";'), 'Legacy v3.2 appearance remains present through consolidated entrypoint');
assert.match(component,/data-dashboard-weekly-planner="true"/);
assert.match(component,/buildDashboardWeekICS/);
assert.match(component,/new Blob/);
assert.match(component,/navigator\.clipboard\.writeText/);
assert.match(component,/aria-pressed=\{selectedDay\}/);
assert.match(component,/snapshot\?\.sourceErrors/);
assert.match(css,/gd-v32-planner-day\.is-selected/);
assert.match(css,/gd-v31-midnight/);
assert.match(css,/gd-v31-focus/);
assert.match(css,/prefers-reduced-motion/);
assert.doesNotMatch(css,/\nbody\s*\{/,'Styles must not affect other routes');
console.log('PASS Dashboard 3.2: seven-day grouping, date-only localization, ICS escape/folding, clipboard and scoped Bento UI.');
