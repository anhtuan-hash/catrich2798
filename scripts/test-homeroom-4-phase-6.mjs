import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildHomeroomEngagement} from '../src/utils/homeroom4Engagement.js';
const ws={
 students:[{id:'s1',active:true},{id:'s2',active:true}],
 attendance:{
  '2026-10-12::morning':{s1:{status:'present'},s2:{status:'late'}},
  '2026-10-11::morning':{s1:{status:'unexcused'},s2:{status:'excused'}},
  '2026-10-11::afternoon':{s1:{status:'present'},s2:{status:'absent_one_period'}},
  '2026-10-01::morning':{s1:{status:'present'}},
 },
 attendanceLocks:{'2026-10-12::morning':{locked:true},'2026-10-11::afternoon':{locked:false}},
 correctionRequests:[{status:'pending'},{status:'approved'},{status:'pending'}],
 conductRecords:[
  {id:'c1',status:'confirmed',entryType:'violation'},
  {id:'c2',status:'confirmed',entryType:'reward'},
  {id:'c3',status:'pending',entryType:'violation'},
  {id:'c4',status:'cancelled',entryType:'violation'},
 ],
 conductWeekSummaries:[{weekStart:'2026-10-05',status:'locked'},{weekStart:'2026-09-28',status:'open'}],
};
const data=buildHomeroomEngagement(ws,'2026-10-12');
assert.equal(data.attendance.totals.sessions,4);
assert.equal(data.attendance.totals.recordedRows,7);
assert.equal(data.attendance.totals.pendingCorrections,2);
assert.equal(data.attendance.totals.lockedAttendanceSessions,1);
assert.equal(data.attendance.today.sessionCount,1);
assert.equal(data.attendance.today.present,1);
assert.equal(data.attendance.today.late,1);
assert.equal(data.attendance.days[5].day,'2026-10-11');
assert.equal(data.attendance.days[5].sessionCount,2);
assert.equal(data.attendance.days[5].unexcused,1);
assert.equal(data.attendance.days[5].excused,1);
assert.equal(data.attendance.days[5].otherAbsences,1);
assert.equal(data.attendance.days.length,7);
assert.equal(data.conduct.confirmed,2);
assert.equal(data.conduct.pending,1);
assert.equal(data.conduct.rewards,1);
assert.equal(data.conduct.violations,1);
assert.equal(data.conduct.total,3);
assert.equal(data.conduct.lockedWeeks,1);
assert.equal(data.conduct.recent[0].weekStart,'2026-10-05');
const empty=buildHomeroomEngagement({attendance:{},conductRecords:[],conductWeekSummaries:[]},'2026-10-12');
assert.equal(empty.attendance.hasWeekData,false);
assert.equal(empty.attendance.today.recordedRows,0);
assert.equal(empty.conduct.confirmed,0);
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('src/pages/HomeroomWorkspace.jsx');
const view=read('src/components/homeroom/HomeroomEngagement.jsx');
const css=read('src/components/homeroom/HomeroomEngagement.css');
assert.match(app,/<HomeroomEngagement workspace=\{workspace\} mode="attendance"/);
assert.match(app,/<HomeroomEngagement workspace=\{workspace\} mode="conduct"/);
assert.match(app,/<AttendanceTab workspace=\{workspace\} onCommit=\{commit\}/);
assert.match(app,/<HomeroomConductTab workspace=\{workspace\} onCommit=\{commit\}/);
assert.match(view,/Chỉ tính những lượt điểm danh đã lưu/);
assert.match(view,/mode==='attendance'/);
assert.match(view,/mode==='conduct'/);
assert.doesNotMatch(view,/onCommit\(/,'Analytics cannot mutate grades, locks or attendance');
assert.match(css,/\.page\.hr-page\.hr-v4/);
assert.match(css,/@media\(max-width:620px\)/);
console.log('Homeroom 4.0 Phase 6: recorded attendance and conduct analytics, week locks and existing actions preserved.');
