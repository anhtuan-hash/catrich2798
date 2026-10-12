import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 getStudentHubCounts, filterStudentHub, findStudentHubDuplicate, studentHubSummary,
} from '../src/utils/homeroom4StudentHub.js';
// The full store has browser-only CSS imports; lifecycle mutation tests live in the
// existing Homeroom production-safety suite. Assert the domain contracts here.

const ws={
 id:'school-12-6-2026-2027',classProfile:{className:'12.6',classType:'homeroom'},
 students:[
  {id:'s1',code:'126001',fullName:'Nguyễn Minh Anh',active:true,supportLevel:'normal',parentName:'Nguyễn Văn A',parentPhone:'0987000111'},
  {id:'s2',code:'126002',fullName:'Trần Hồng Ngọc',active:true,supportLevel:'priority',parentName:'Trần Văn B'},
  {id:'s3',code:'126003',fullName:'Lê Thu Hà',active:true,supportLevel:'attention'},
  {id:'s4',code:'126004',fullName:'Bùi Thị Bình',active:false,supportLevel:'attention'},
 ],
 attendance:{
  '2026-10-12::morning':{s1:{status:'present'},s2:{status:'late'}},
  '2026-10-11::morning':{s1:{status:'unexcused'},s3:{status:'present'}},
 },
 conductRecords:[
  {studentId:'s1',status:'pending'}, {studentId:'s1',status:'confirmed'},
  {studentId:'s1',status:'cancelled'}, {studentId:'s2',status:'confirmed'},
 ],
 studentRecords:{s1:{verifiedAt:'2026-10-10'},s2:{notes:'in progress'}},
};
assert.deepEqual(getStudentHubCounts(ws),{active:3,archived:1,attention:2,priority:1,total:4});
assert.equal(filterStudentHub(ws).length,3);
assert.deepEqual(filterStudentHub(ws,{status:'priority'}).map(x=>x.id),['s2']);
assert.deepEqual(filterStudentHub(ws,{status:'attention'}).map(x=>x.id),['s3','s2']);
assert.deepEqual(filterStudentHub(ws,{status:'inactive'}).map(x=>x.id),['s4']);
assert.deepEqual(filterStudentHub(ws,{status:'all',query:'hong ngoc'}).map(x=>x.id),['s2'], 'Unicode accent folding');
assert.deepEqual(filterStudentHub(ws,{query:'0987000111'}).map(x=>x.id),['s1'], 'Parent search');
assert.deepEqual(filterStudentHub(ws,{status:'all',order:'code'}).map(x=>x.id),['s1','s2','s3','s4']);
assert.equal(findStudentHubDuplicate(ws,{code:'126001',fullName:'Someone'})?.type,'code');
assert.equal(findStudentHubDuplicate(ws,{code:'999999',fullName:'nguyen minh anh'})?.type,'name');
assert.equal(findStudentHubDuplicate(ws,{code:'126001',fullName:'Nguyễn Minh Anh'},'s1'),null,'Editing same record is safe');
assert.equal(findStudentHubDuplicate(ws,{code:'999999',fullName:'New Student'}),null);
const snapshot=studentHubSummary(ws,'s1');
assert.equal(snapshot.attendanceSessions,2);
assert.equal(snapshot.attendanceUnexcused,1);
assert.equal(snapshot.attendanceLate,0);
assert.equal(snapshot.latestAttendance.day,'2026-10-12');
assert.equal(snapshot.conductRecords,2);
assert.equal(snapshot.pendingConduct,1);
assert.equal(snapshot.paperVerified,true);
assert.equal(studentHubSummary(ws,'no-student'),null);
assert.equal(studentHubSummary(ws,'s3').attendanceSessions,1);
const domainSource = readFileSync(new URL('../src/utils/homeroomStore.js',import.meta.url),'utf8');
assert.match(domainSource,/export function archiveStudent\(workspace, studentId, reason/);
assert.match(domainSource,/export function restoreStudent\(workspace, studentId\)/);
assert.match(domainSource,/export function transferStudent\(workspace, studentId, targetClass/);
assert.match(domainSource,/return archiveStudent\(workspace, studentId, reason, targetClass\)/,
  'Transfer must archive with destination and preserve historical events');
assert.match(domainSource,/inactiveReason: safeText\(reason/);
assert.match(domainSource,/active: true/);
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hub=read('src/components/homeroom/HomeroomStudentHub.jsx');
const page=read('src/pages/HomeroomWorkspace.jsx');
const css=read('src/components/homeroom/HomeroomStudentHub.css');
assert.match(page,/subjectMode \? <SubjectStudentsTab/,'Never modify subject teacher workflow');
assert.match(page,/<HomeroomStudentHub key=\{\x60\$\{/,'Reset state on account/class change');
assert.match(hub,/findStudentHubDuplicate\(workspace, draft, editingId\)/);
assert.match(hub,/StudentRosterImportPanel/);
assert.match(hub,/upsertStudents\(workspace, rows\)/);
assert.match(hub,/onCommit\(next,/);
assert.match(hub,/result\?\.ok === false/, 'Do not close after failed cloud sync');
assert.match(hub,/decisionForm=\{decision &&/, 'Confirmation should stay beside selected student');
assert.match(hub,/transferStudent\(workspace, student.id, reason\.trim\(\)\)/);
assert.match(hub,/archiveStudent\(workspace, student.id, reason\.trim\(\)\)/);
assert.match(hub,/restoreStudent\(workspace, student.id\)/);
assert.match(hub,/buildStudentSupportHash/);
assert.match(hub,/exportRows\(items\)/);
assert.doesNotMatch(hub,/window\.(?:prompt|confirm)\(/,'Use in-page confirmation instead of browser modal');
assert.match(css,/\.page\.hr-page\.hr-v4/);
assert.match(css,/@media\(max-width:820px\)/);
assert.match(css,/prefers-reduced-motion/);
assert.doesNotMatch(css,/(^|\n)\s*:root\s*\{/);
console.log('Homeroom 4.0 Phase 4 Student Hub: selectors, duplicate guard, cross-account mount, lifecycle and histories OK');
