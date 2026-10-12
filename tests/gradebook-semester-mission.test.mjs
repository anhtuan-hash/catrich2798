import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  firstMissingGradeSection, semesterProgressSections, semesterProgressSummary, semesterPendingStudents,
} from '../src/utils/gradebookSemesterMission.js';

const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=load('src/components/gradebook/GradebookEngine.jsx');
const mission=load('src/components/gradebook/GradebookSemesterMission.jsx');
const style=load('src/styles/GradebookAcademicWorkspace.css');
const roster=[
  {id:'s1',fullName:'Trần An',code:'C01'},
  {id:'s2',fullName:'Nguyễn Bình',code:'C02'},
  {id:'s3',fullName:'Lê Công',code:'C03'},
];
const semester={
  regular:[
    {columns:[{id:'a'},{id:'b'}],scores:{s1:{a:'0',b:'9'},s2:{a:' ',b:'8'},s3:{a:'1',b:''}}},
    {columns:[{id:'c'}],scores:{s1:{c:'10'},s2:{c:''},s3:{c:'5'}}},
    {columns:[{id:'d'},{id:'e'}],scores:{s1:{d:'6',e:'8'},s2:{d:'',e:'4'},s3:{d:'',e:''}}},
    {columns:[{id:'f'}],scores:{s1:{f:''},s2:{f:''},s3:{f:''}}},
  ],
  midterm:{scores:{s1:'0',s2:'8',s3:''}},
  final:{scores:{s1:'10',s2:'',s3:''}},
};

test('real raw grade-entry progress across six assessments counts zero as entered',()=>{
  const sections=semesterProgressSections(roster,semester);
  assert.deepEqual(sections.map(s=>s.id),['regular-0','regular-1','regular-2','regular-3','midterm','final']);
  assert.deepEqual(sections.map(s=>[s.total,s.entered,s.missing,s.percent]),[
    [6,4,2,67],[3,2,1,67],[6,3,3,50],[3,0,3,0],[3,2,1,67],[3,1,2,33],
  ]);
  assert.equal(sections[0].readyStudents,1);
  assert.equal(sections[4].readyStudents,2);
  assert.deepEqual(semesterProgressSummary(sections),{
    total:24,entered:12,missing:12,percent:50,completedSections:0,sectionCount:6,
  });
});

test('priority list navigates to first real missing assessment without modifying original data',()=>{
  const prev=JSON.stringify({roster,semester});
  assert.equal(firstMissingGradeSection('s1',semester),'regular-3');
  assert.equal(firstMissingGradeSection('s2',semester),'regular-0');
  assert.equal(firstMissingGradeSection('s3',semester),'regular-0');
  const q=semesterPendingStudents(roster,semester,2);
  assert.deepEqual(q.map(x=>[x.studentId,x.missing,x.nextView]),[
    ['s3',6,'regular-0'],['s2',5,'regular-0'],
  ]);
  assert.equal(semesterPendingStudents(roster,semester,0).length,0);
  assert.equal(JSON.stringify({roster,semester}),prev);
});

test('empty student roster and no score columns never report false completion',()=>{
  const empty=semesterProgressSections([],semester);
  assert.ok(empty.every(x=>x.entered===0&&x.total===0&&x.percent===0));
  const zero=semesterProgressSummary(empty);
  assert.equal(zero.percent,0);
  assert.equal(zero.completedSections,0);
  assert.deepEqual(semesterPendingStudents([],semester),[]);
  const noColumns={regular:[{columns:[],scores:{}}],midterm:{scores:{}},final:{scores:{}}};
  assert.equal(semesterProgressSections(roster,noColumns)[0].readyStudents,0);
});

test('mission cards and queue are real interactive controls and counts remain full-roster based',()=>{
  assert.match(source,/semesterProgressSections\(students, activeSemester\)/);
  assert.match(source,/semesterPendingStudents\(students, activeSemester, 6\)/);
  assert.match(source,/GradebookSemesterMission sections=\{missionSections\}/);
  assert.match(source,/onSelectSection=\{openMissionSection\}/);
  assert.match(source,/onSelectStudent=\{openMissionStudent\}/);
  assert.match(source,/setStudentQuery\(entry\.code \|\| entry\.name\)/);
  assert.match(source,/setMissingOnly\(true\)/);
  assert.match(mission,/onClick=\{\(\) => onSelectSection\(section\.id\)\}/);
  assert.match(mission,/onClick=\{\(\) => onSelectStudent\(entry\)\}/);
  assert.match(mission,/section\.entered/);
  assert.match(mission,/summary\.missing/);
  assert.match(mission,/summary\.total/);
});

test('draft guard and single-flight save state preserve dirty edits when a commit fails',()=>{
  assert.match(source,/window\.addEventListener\('beforeunload', protectDraft\)/);
  assert.match(source,/window\.removeEventListener\('beforeunload', protectDraft\)/);
  assert.match(source,/\[dirty\]/);
  assert.match(source,/if \(!dirty \|\| savePending\) return;/);
  assert.match(source,/setSavePending\(true\)/);
  assert.match(source,/setSaveFailure\(error\?\.message/);
  assert.match(source,/finally \{\s*setSavePending\(false\);/);
  assert.ok(source.includes('disabled={!dirty}'));
  assert.ok(source.includes('aria-disabled={saving}'));
  assert.ok(source.includes('aria-disabled={savePending}'));
  assert.match(source,/role="alert"/);
  assert.match(source,/await onCommit\(/);
  assert.match(source,/onClick=\{save\}>Lưu điểm/);
  assert.match(source,/onClick=\{discard\}>Hoàn tác/);
});

test('mission CSS responsive without touching grading calculations, global nav or footer',()=>{
  assert.match(style,/Semester Mission Control/);
  assert.match(style,/\.gb-mission-grid/);
  assert.match(style,/\.gb-mission-queue-row/);
  assert.match(style,/\.gb-mission-ring/);
  assert.match(style,/@media\(max-width:760px\)/);
  assert.match(style,/@media\(max-width:500px\)/);
  assert.match(style,/\.hr-grade-table \.hr-grade-student\s*\{[\s\S]*?position:sticky;[\s\S]*?left:48px/);
  assert.doesNotMatch(style,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer)/);
  assert.equal((style.match(/\{/g)||[]).length,(style.match(/\}/g)||[]).length);
  assert.match(source,/gradeRoundBonus\(activeRound/);
  assert.match(source,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(source,/onClick=\{openClassGradebook\}/);
  assert.match(source,/onClick=\{openStudentReport\}/);
});
