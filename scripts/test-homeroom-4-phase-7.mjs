import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildHomeroomReport,homeroomReportCsvRows,localDateIso,safeSpreadsheetCell,summarizeHomeroomTasks,validReportRange} from '../src/utils/homeroom4Operations.js';

const fullDocs={checklist:{completionCertificate:'complete',birthCertificate:'complete',grade10Admission:'complete',transcript:'complete'},
  sources:{vnedu:{fields:{fullName:'Nguyen Anh',citizenId:'000001'}},moet:{fields:{fullName:'Nguyen Anh',citizenId:'000001'}}},
  canonical:{fullName:'Nguyen Anh'},verifiedAt:'2026-10-11'};
const ws={id:'school-12-6-2026-2027',classProfile:{className:'12.6',schoolYear:'2026-2027',grade:'12'},
  students:[{id:'s1',code:'S001',fullName:'Nguyễn Anh',active:true,portalPin:'123456'},
    {id:'s2',code:'S002',fullName:'=1+2',active:true,portalPin:'876543'},
    {id:'s3',code:'S003',fullName:'ARCHIVED',active:false,portalPin:'000000'}],
  studentRecords:{s1:fullDocs,s2:{},s3:fullDocs},
  attendance:{
    '2026-10-10::morning':{s1:{status:'present'},s2:{status:'late'},s3:{status:'unexcused'}},
    '2026-10-12::morning':{s1:{status:'excused'},s2:{status:'unexcused'}},
    '2026-09-22::morning':{s1:{status:'present'}},
  },
  attendanceLocks:{'2026-10-12::morning':{locked:true}},
  correctionRequests:[{status:'pending',sessionKey:'2026-10-12::morning'},{status:'pending',sessionKey:'2026-09-01::morning'}],
  conductRecords:[
    {studentId:'s1',date:'2026-10-10',status:'confirmed',entryType:'violation'},
    {studentId:'s1',date:'2026-10-11',status:'confirmed',entryType:'reward'},
    {studentId:'s2',date:'2026-10-12',status:'pending',entryType:'violation'},
    {studentId:'s2',date:'2026-09-11',status:'confirmed',entryType:'reward'},
    {studentId:'s3',date:'2026-10-11',status:'confirmed',entryType:'violation'},
    {studentId:'s1',date:'2026-10-12',status:'cancelled',entryType:'violation'},
  ],
  schedule:[
    {id:'a',title:'Rà soát hồ sơ',date:'2026-10-10',status:'Đang thực hiện'},
    {id:'b',title:'Nộp báo cáo',date:'2026-10-12',status:'Sắp tới'},
    {id:'c',title:'Họp tổ',date:'2026-10-13',status:'Hoàn thành'},
    {id:'d',title:'Việc đã hủy',date:'2026-10-10',status:'Đã hủy'},
  ],
  backups:[{id:'secure'}],auditLogs:[{id:'history'}],
};
assert.equal(localDateIso(new Date(2026,9,12)), '2026-10-12');
assert.ok(validReportRange('2026-10-10','2026-10-12'));
assert.ok(!validReportRange('2026-10-12','2026-10-10'));
assert.ok(!validReportRange('2026-02-30','2026-03-01'));
assert.ok(!validReportRange('2026-10-10','2026-10-99'));
assert.throws(()=>buildHomeroomReport(ws,'2026-11-01','2026-10-01'),/Khoảng báo cáo/);
const t=summarizeHomeroomTasks(ws,'2026-10-12');
assert.equal(t.total,4);
assert.equal(t.open,2);
assert.equal(t.overdue,1);
assert.equal(t.today,1);
assert.equal(t.completed,1);
assert.equal(t.upcoming,0);
assert.equal(t.tasks[0].id,'a');
const r=buildHomeroomReport(ws,'2026-10-10','2026-10-12');
assert.equal(r.meta.className,'12.6');
assert.equal(r.totals.students,2,'Archived students not counted');
assert.equal(r.totals.sessions,2,'Only sessions in selected range');
assert.equal(r.totals.lockedSessions,1);
assert.equal(r.totals.attendance.recorded,4);
assert.equal(r.totals.attendance.present,1);
assert.equal(r.totals.attendance.late,1);
assert.equal(r.totals.attendance.excused,1);
assert.equal(r.totals.attendance.unexcused,1);
assert.equal(r.totals.conductConfirmed,2,'Ignore cancelled, archived and out-of-range conduct');
assert.equal(r.totals.conductPending,1);
assert.equal(r.totals.rewardsConfirmed,1);
assert.equal(r.totals.pendingCorrections,1);
assert.equal(r.totals.paperReady,1);
assert.equal(r.totals.sourceCoverage,1);
assert.equal(r.totals.fullyVerified,1);
assert.equal(r.rows.length,2);
assert.deepEqual(r.rows.map(x=>x.student.id),['s2','s1'].sort((a,b)=>ws.students.find(x=>x.id===a).fullName.localeCompare(ws.students.find(x=>x.id===b).fullName,'vi')));
const csv=homeroomReportCsvRows(r);
const csvText=csv.map(row=>row.join(';')).join('\n');
assert.doesNotMatch(csvText,/123456|876543|000000/,'Never export portal PIN');
assert.doesNotMatch(csvText,/ARCHIVED/,'Never export archived student');
assert.match(csvText,/'=1\+2/,'Neutralize CSV formula injection');
assert.equal(safeSpreadsheetCell('  @SUM(A1:A2)'),"'@SUM(A1:A2)");
assert.equal(safeSpreadsheetCell(' -2'),"'-2");
assert.equal(safeSpreadsheetCell('safe'),'safe');
assert.equal(csv[8][0],'Mã học sinh');
assert.equal(csv.length,11);
const path=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const jsx=path('src/components/homeroom/HomeroomOperationsCenter.jsx');
const overview=path('src/components/homeroom/HomeroomOverviewCompactTab.jsx');
const page=path('src/pages/HomeroomWorkspace.jsx');
const css=path('src/components/homeroom/HomeroomOperationsCenter.css');
assert.match(overview,/<HomeroomOperationsCenter workspace=\{workspace\} onCommit=\{onCommit\} goTab=\{goTab\}/);
assert.match(overview,/!subjectMode \? <HomeroomOperationsCenter/,'Never surface operations in subject class');
assert.match(page,/onCommit=\{commit\} syncState=\{syncState\} subjectMode=\{subjectMode\}/);
assert.match(jsx,/addScheduleItem\(workspace,/,'Reuse existing schedule domain');
assert.match(jsx,/result\?\.ok === false|saved\?\.ok===false/,'Never close form after failed cloud save');
assert.match(jsx,/printReport\(report\)/);
assert.match(jsx,/downloadCsv\(/);
assert.match(jsx,/goTab\('safety'\)/);
assert.doesNotMatch(jsx,/portalPin|parentCode|studentCode|lockPasswordHash/,'No secrets in exports');
assert.match(css,/\.page\.hr-page\.hr-v4/);
assert.match(css,/@media\(max-width:620px\)/);
console.log('Homeroom 4.0 Phase 7: accurate dates, task lifecycle, bounded reporting, CSV safety, privacy, build integration OK.');
