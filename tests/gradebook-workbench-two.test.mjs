import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  filterGradebookStudentView, missingScoreCount, gradebookColumnProgress,
} from '../src/utils/gradebookStudentView.js';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('src/components/gradebook/GradebookMacEngine.jsx');
const css=read('src/components/gradebook/GradebookMacEngine.css');
const students=[
  {id:'s1',fullName:'Trần Thị An',code:'ST-01'},
  {id:'s2',fullName:'Nguyễn Thị Bình',code:'ST-02'},
  {id:'s3',fullName:'Đỗ Hữu Công',code:'ST-03'},
  {id:'s4',fullName:'Lê Diễm Anh',code:'ST-04'},
];
const round={
  columns:[{id:'a',label:'Lần 1'},{id:'b',label:'Lần 2'},{id:'c',label:'Lần 3'}],
  scores:{
    s1:{a:'0',b:'10',c:'9'},
    s2:{a:'',b:'8',c:'0'},
    s3:{a:'5',b:'',c:''},
    s4:{a:'9',b:'8',c:'7'},
  },
};
const semester={
  regular:[round],
  midterm:{scores:{s1:'8',s2:'0',s3:'',s4:'10'}},
  final:{scores:{s1:'8',s2:'',s3:'7',s4:'10'}},
};
const view=(sortBy,others={})=>filterGradebookStudentView({students,view:'regular-0',activeRound:round,semester,sortBy,...others});

test('all sort orders preserve original roster and score records',()=>{
  const originals=JSON.stringify({students,round});
  assert.deepEqual(view('original').map(s=>s.id),['s1','s2','s3','s4']);
  assert.deepEqual(view('name').map(s=>s.id),['s3','s4','s2','s1']);
  assert.deepEqual(view('missing-first').map(s=>s.id),['s3','s2','s1','s4']);
  assert.deepEqual(view('missing-first',{missingOnly:true}).map(s=>s.id),['s3','s2']);
  assert.deepEqual(view('name',{search:'dieM'}).map(s=>s.id),['s4']);
  assert.equal(JSON.stringify({students,round}),originals);
});

test('genuinely zero scores are counted as entered, and empty scores are not',()=>{
  assert.equal(missingScoreCount('s1',{view:'regular-0',activeRound:round,semester}),0);
  assert.equal(missingScoreCount('s2',{view:'regular-0',activeRound:round,semester}),1);
  assert.equal(missingScoreCount('s3',{view:'regular-0',activeRound:round,semester}),2);
  assert.equal(missingScoreCount('s2',{view:'midterm',semester}),0);
  assert.equal(missingScoreCount('s2',{view:'final',semester}),1);
  assert.equal(missingScoreCount('s2',{view:'summary',semester}),2);
});

test('per-column progress counts all students, including those hidden by filters',()=>{
  const before=JSON.stringify(round);
  const progress=gradebookColumnProgress(students,round);
  assert.deepEqual(progress.map(p=>[p.label,p.entered,p.total,p.missing,p.percent]),[
    ['Lần 1',3,4,1,75],
    ['Lần 2',3,4,1,75],
    ['Lần 3',3,4,1,75],
  ]);
  assert.deepEqual(gradebookColumnProgress([],round).map(p=>p.percent),[0,0,0]);
  assert.deepEqual(gradebookColumnProgress(students,null),[]);
  assert.equal(JSON.stringify(round),before);
});


test('active macOS gradebook keeps the roster as source of truth', () => {
  assert.match(source,/originalStudentPosition\.get\(student\.id\)/);
  assert.match(source,/filterGradebookStudentView\(\{ students, search: studentQuery, missingOnly, view, activeRound, semester: activeSemester, sortBy \}\)/);
  assert.match(source,/const \[sortBy, setSortBy\] = useState\('original'\)/);
  assert.match(source,/const \[density, setDensity\] = useState\(\(\) =>/);
  assert.match(source,/localStorage\.getItem\('brian-gradebook-density-v6'\)/);
  assert.match(source,/localStorage\.setItem\('brian-gradebook-density-v6', density\)/);
  assert.match(source,/setSortBy\('original'\)/);
  assert.match(source,/await onCommit\(/);
  assert.match(source,/openStudentReport/);
});

test('next empty score uses only editable inputs, never writes a grade', () => {
  assert.match(source,/scoreTableRef = useRef\(null\)/);
  assert.match(source,/ref=\{scoreTableRef\}/);
  const start=source.indexOf('const focusNextEmptyScore = () =>');
  const end=source.indexOf('const openMissionSection',start);
  assert.ok(start>0&&end>start);
  const focus=source.slice(start,end);
  assert.match(focus,/input\.hr-grade-input:not\(:disabled\)/);
  assert.match(focus,/input\.value\.trim\(\) === ''/);
  assert.match(focus,/next\.focus\(\)/);
  assert.match(focus,/next\.select\(\)/);
  assert.doesNotMatch(focus,/updateRegularScore|mutate\(/);
});

test('current macOS gradebook provides responsive, accessible sorting and grade cells', () => {
  assert.match(source,/gbmac-sort/);
  assert.match(source,/value="missing-first"/);
  assert.match(source,/gbmac-table-viewport/);
  assert.match(source,/gradebookColumnProgress|summarizeGradebookProgress/);
  assert.match(css,/\.gbmac-sort select/);
  assert.match(css,/\.gbmac-table tbody tr/);
  assert.match(css,/\.gbmac-table :is\(th,td\)\.gbmac-pin-name/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
