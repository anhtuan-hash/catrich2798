import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeGradebookProgress } from '../src/utils/gradebookProgressDeck.js';
import { buildMockExamImportTemplateCsv, selectVisibleMockExams, mockExamScoreNumber } from '../src/utils/gradebookMockExams.js';

const roster = [
  { id:'s1',code:'001',fullName:'An' },
  { id:'s2',code:'002',fullName:'Bình' },
  { id:'s3',code:'003',fullName:'Cường',active:false },
];
const semester={
  regular:[
    {columns:[{id:'a'},{id:'b'}],scores:{s1:{a:'0',b:'8.5'},s2:{a:'9',b:''}}},
    {columns:[{id:'c'}],scores:{s1:{c:'5'},s2:{c:'9'}}},
    {columns:[{id:'d'}],scores:{s1:{d:''},s2:{d:'7'}}},
    {columns:[{id:'e'}],scores:{}},
  ],
  midterm:{scores:{s1:0,s2:'7'}},
  final:{scores:{s1:'',s2:''}},
  mockExams:[{scores:{s1:10,s2:10}}],
};
const raw=JSON.stringify({roster,semester});
const s=summarizeGradebookProgress(roster,semester);
assert.equal(s.students,2);
assert.equal(s.total,14);
assert.equal(s.filled,8);
assert.equal(s.missing,6);
assert.equal(s.percent,57);
assert.equal(s.nextView,'regular-0');
assert.equal(s.completedSections,2);
assert.equal(s.sections.length,6);
assert.equal(s.sections[0].filled,3);
assert.equal(s.sections[0].total,4);
assert.equal(s.sections[0].completedStudents,1);
assert.equal(s.sections[4].filled,2); // zero counts as entered
assert.equal(s.sections[5].filled,0);
assert.equal(JSON.stringify({roster,semester}),raw); // read only
assert.equal(summarizeGradebookProgress([],semester).percent,0);
assert.equal(summarizeGradebookProgress([],semester).nextView,'');
assert.equal(summarizeGradebookProgress(roster,{regular:[],midterm:{scores:{}},final:{scores:{}}}).missing,4);
assert.equal(mockExamScoreNumber(0),0);
const csv=buildMockExamImportTemplateCsv(roster);
assert.ok(csv.startsWith('\uFEFF'));
assert.match(csv,/"Mã học sinh","Điểm"/);
assert.match(csv,/"001",""/);
assert.doesNotMatch(csv,/"003",""/);
assert.doesNotMatch(csv,/Trung bình|Điểm cộng/);
const exams=[{id:'e1',scores:{s1:0}},{id:'e2',scores:{s1:9.5}}];
assert.deepEqual(selectVisibleMockExams(exams,'e2'),[exams[1]]);
assert.deepEqual(selectVisibleMockExams(exams),exams);
assert.equal(exams.length,2); // no persistence mutation

const root=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const engine=root('src/components/gradebook/GradebookEngine.jsx');
const mock=root('src/components/gradebook/GradebookMockExams.jsx');
const studio=root('src/pages/GradebookStudio.jsx');
const workspace=root('src/components/gradebook/GradebookWorkspace.jsx');
const deck=root('src/components/gradebook/GradebookProgressDeck.jsx');
const css=root('src/components/gradebook/GradebookProgressDeck.css');
const mockCss=root('src/components/gradebook/GradebookMockExams.css');
assert.match(engine,/<GradebookProgressDeck/);
assert.match(engine,/onShowMissing=\{\(sectionId\) =>/);
assert.match(engine,/ref=\{studentSearchRef\}/);
assert.match(engine,/event\.key === '\/'/);
assert.match(engine,/event\.key\.toLowerCase\(\) === 's'/);
assert.match(engine,/onDirtyChange\?\.\(dirty\)/);
assert.match(studio,/const switchGradebookClass = \(nextId\) =>/);
assert.match(studio,/window\.confirm\('Sổ điểm đang có thay đổi chưa lưu/);
assert.match(studio,/onClick=\{openStudentRoster\}/);
assert.match(studio,/onDirtyChange=\{setGradebookDirty\}/);
assert.match(workspace,/key=\{props\.workspace\?\.id\}/);
assert.match(deck,/summarizeGradebookProgress/);
assert.match(deck,/aria-pressed=\{selectedView === section\.id\}/);
assert.match(mock,/selectVisibleMockExams\(exams, activeFocusId\)/);
assert.match(mock,/onClick=\{downloadTemplate\}/);
assert.match(mock,/displayedExams\.map/);
assert.match(mock,/input\.gb-mock-score:not\(:disabled\)/);
assert.match(mockCss,/gb-mock-view-controls/);
assert.match(css,/gb3-deck-tile\.is-coral/);
assert.match(css,/@media\(max-width:430px\)/);
assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
assert.match(engine,/gradeRoundBonus\(activeRound/);
assert.doesNotMatch(root('src/utils/gradebookProgressDeck.js'),/mockExamScoreNumber|mockExams/);
console.log('PASS Gradebook V3: 6-component coverage, zero, no averages, UI shortcuts, safe navigation and mock focus');
