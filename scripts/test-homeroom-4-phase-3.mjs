import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildHomeroomDashboard } from '../src/utils/homeroom4Dashboard.js';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const date = '2026-10-12';
const result = buildHomeroomDashboard({
 classProfile:{className:'12.6',grade:'12'},
 students:[{id:'s1',active:true},{id:'s2',active:true},{id:'s3',active:false}],
 studentRecords:{
  s1:{checklist:{completionCertificate:'complete',birthCertificate:'complete',grade10Admission:'complete',transcript:'complete'}},
  s2:{checklist:{completionCertificate:'complete',birthCertificate:'missing',grade10Admission:'complete',transcript:'complete'}},
 },
 attendance:{
  '2026-10-12::morning::':{s1:{status:'present'},s2:{status:'excused'}},
  '2026-10-11::morning::':{s1:{status:'present'}},
 },
 conductRecords:[{status:'pending'},{status:'confirmed'},{status:'cancelled'}],
 correctionRequests:[{status:'pending'},{status:'approved'}],
 conductWeekSummaries:[{status:'locked'},{status:'draft'}],
},date);
assert.equal(result.studentCount,2,'Inactive student must not count');
assert.equal(result.todaySessionCount,1);
assert.equal(result.todayPresent,1,'Count actual present rows only');
assert.equal(result.todayAbsent,1,'Count actual absent rows only');
assert.equal(result.completePaperCount,1);
assert.equal(result.missingPaperCount,1);
assert.equal(result.pendingConductCount,1);
assert.equal(result.confirmedConductCount,1);
assert.equal(result.pendingCorrectionCount,1);
assert.equal(result.lockedWeeksCount,1);
assert.equal(result.days.length,7);
assert.equal(result.days[6].date,date);
assert.equal(result.days[6].count,1);
assert.equal(result.days[5].count,1);
assert.deepEqual(result.tasks.map(x=>x.id),['corrections','conduct','paper']);
assert.deepEqual(result.tasks.map(x=>x.tab),['attendance','conduct','studentRecords']);

const noAttendance = buildHomeroomDashboard({
 classProfile:{className:'10.5',grade:'10'},
 students:[{id:'s1',active:true}],
 studentRecords:{s1:{checklist:{completionCertificate:'complete',birthCertificate:'complete',transcript:'complete'}}},
},date);
assert.equal(noAttendance.todayPresent,null,'No attendance rows must display unavailable, not zero');
assert.equal(noAttendance.todayAbsent,null);
assert.equal(noAttendance.maxSessions,0,'Do not manufacture timeline bars');
assert.equal(noAttendance.missingPaperCount,0,'Grade 10 does not require grade-10 admission paper by rule');
assert.deepEqual(noAttendance.tasks,[],'No false urgent tasks from blank dates');
const empty = buildHomeroomDashboard({},date);
assert.equal(empty.studentCount,0);
assert.ok(empty.tasks.some(x=>x.id==='roster'),'Empty roster should have a concrete action');

const jsx=read('src/components/homeroom/HomeroomOverviewCompactTab.jsx');
const css=read('src/components/homeroom/HomeroomCommandCenter.css');
const page=read('src/pages/HomeroomWorkspace.jsx');
assert.match(jsx,/buildHomeroomDashboard\(workspace, date\)/);
assert.match(jsx,/goTab\(item\.tab\)/);
assert.match(jsx,/goTab\(key\)/);
assert.match(jsx,/data\.maxSessions > 0/,'Show chart only for saved sessions');
assert.match(jsx,/Chưa có phiên điểm danh nào/);
assert.doesNotMatch(jsx,/Math\.min\(100|learningCount \* 4|metrics\.students\.length \* 4/,'Retire synthetic percentages');
assert.match(page,/<HomeroomOverviewCompactTab workspace=\{workspace\}/);
assert.match(css,/\.page\.hr-page\.hr-v4/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/data-tone="violet"/);
assert.match(css,/@media \(max-width:650px\)/);
console.log('Homeroom 4.0 Phase 3: 2 active students, real records, accurate tasks, seven-day chart and no fabricated data OK');
