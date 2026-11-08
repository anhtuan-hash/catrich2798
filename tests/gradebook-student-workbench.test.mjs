import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 normalizeStudentSearch, isGradebookScoreBlank, hasMissingRegularScore, filterGradebookStudentView,
} from '../src/utils/gradebookStudentView.js';

const file=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const eng=file('src/components/gradebook/GradebookMacEngine.jsx');
const css=file('src/components/gradebook/GradebookMacEngine.css');
const page=file('src/pages/GradebookStudio.jsx');
const students=[
 {id:'1',fullName:'Nguyễn Trần Lâm Anh',code:'CP-00017'},
 {id:'2',fullName:'Lê Thị Diễm',code:'CP-00018'},
 {id:'3',fullName:'Đỗ Quang Minh',code:'CP-00019'},
];
const round={
 columns:[{id:'a',label:'Lần 1'},{id:'b',label:'Lần 2'}],
 scores:{'1':{a:'0',b:'9'},'2':{a:'',b:'8'},'3':{a:'10',b:undefined}},
};
const semester={
 regular:[round,{columns:[{id:'x'}],scores:{'1':{x:'10'},'2':{x:'7'},'3':{x:'5'}}}],
 midterm:{scores:{'1':'8','2':'','3':'10'}},
 final:{scores:{'1':'9','2':'9','3':''}},
};
const filtered=(view, opts={})=>filterGradebookStudentView({students,view,semester,activeRound:round,...opts});

test('search is case-insensitive, accent-insensitive and supports student IDs',()=>{
 assert.equal(normalizeStudentSearch('  NGUYỄN  '),'nguyen');
 assert.equal(normalizeStudentSearch('ĐỖ'),'do');
 assert.deepEqual(filtered('regular-0',{search:'tran lam'}).map(s=>s.id),['1']);
 assert.deepEqual(filtered('regular-0',{search:'CP-00018'}).map(s=>s.id),['2']);
 assert.deepEqual(filtered('regular-0',{search:'DO QUANG'}).map(s=>s.id),['3']);
});

test('missing scores distinguish zero from blanks and keep full list unmodified',()=>{
 assert.equal(isGradebookScoreBlank(0),false);
 assert.equal(isGradebookScoreBlank('0'),false);
 assert.equal(isGradebookScoreBlank('   '),true);
 assert.equal(isGradebookScoreBlank(undefined),true);
 assert.equal(hasMissingRegularScore('1',round),false);
 assert.equal(hasMissingRegularScore('2',round),true);
 assert.equal(hasMissingRegularScore('3',round),true);
 const prior=JSON.stringify(students);
 assert.deepEqual(filtered('regular-0',{missingOnly:true}).map(s=>s.id),['2','3']);
 assert.deepEqual(filtered('midterm',{missingOnly:true}).map(s=>s.id),['2']);
 assert.deepEqual(filtered('final',{missingOnly:true}).map(s=>s.id),['3']);
 assert.deepEqual(filtered('summary',{missingOnly:true}).map(s=>s.id),['2','3']);
 assert.deepEqual(filtered('summary',{missingOnly:true,search:'dieM'}).map(s=>s.id),['2']);
 assert.equal(JSON.stringify(students),prior);
 assert.equal(filtered('regular-0').length,3);
});

test('live controls clear only ephemeral search/missing/focus settings on class change',()=>{
  for(const token of [
    "filterGradebookStudentView",
    "const [studentQuery, setStudentQuery] = useState('')",
    "const [missingOnly, setMissingOnly] = useState(false)",
    "const [focusMode, setFocusMode] = useState(false)",
    "setStudentQuery('');", "setMissingOnly(false);", "setFocusMode(false);",
    'aria-label="Tìm theo tên hoặc mã học sinh"',
    'className="gbmac-toggle"','role="status" aria-live="polite"',
    'originalStudentPosition.get(student.id)'
  ])assert.ok(eng.includes(token),'Student control missing '+token);
});

test('all students, not filtered rows, remain the score/export source of truth',()=>{
  for(const token of [
    'const studentIds = useMemo(', 'students.filter((student) => roundScore(activeRound',
    'gradeRoundBonus(activeRound', 'await onCommit(',
    'onClick={openClassGradebook}', 'onClick={openStudentReport}',
    'exportClassGradebookXlsx(', 'exportStudentGradeReportPdf(',
  ])assert.ok(eng.includes(token),'Grade source/export missing '+token);
  assert.match(page,/gbmac-hero-command/);
});

test('keyboard and next-empty focus protect editable inputs and do not modify scores',()=>{
  for(const token of [
    "event.key === '/'", "event.key.toLowerCase() === 's'",
    "event.metaKey || event.ctrlKey || event.altKey || isEditing",
    "target?.closest?.('input, textarea, select, [contenteditable=\"true\"]')",
    "scoreTableRef.current?.querySelectorAll",
    "onClick={focusNextEmptyScore}",
    'next.focus()', 'next.select()', 'next.scrollIntoView('
  ])assert.ok(eng.includes(token),'Keyboard/focus path missing '+token);
  const start=eng.indexOf('const focusNextEmptyScore = () =>'),end=eng.indexOf('const openMissionSection = ',start);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(eng.slice(start,end),/updateRegularScore|onCommit\(/);
});

test('active workbench is accessible, locally styled, responsive and keyboard safe',()=>{
  assert.match(css,/\.gbmac-search\{/);
  assert.match(css,/\.gbmac-toggle\{/);
  assert.match(css,/\.gbmac-sort\{/);
  assert.match(css,/\.gbmac-table-viewport[\s\S]*?overflow:auto/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

