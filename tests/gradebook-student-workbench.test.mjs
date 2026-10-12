import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 normalizeStudentSearch, isGradebookScoreBlank, hasMissingRegularScore, filterGradebookStudentView,
} from '../src/utils/gradebookStudentView.js';

const file=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const eng=file('src/components/gradebook/GradebookEngine.jsx');
const css=file('src/styles/GradebookAcademicWorkspace.css');
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

test('UI has real controls and resets ephemeral filters on class change',()=>{
 assert.match(eng,/filterGradebookStudentView/);
 assert.match(eng,/const \[studentQuery, setStudentQuery\] = useState\(''\)/);
 assert.match(eng,/const \[missingOnly, setMissingOnly\] = useState\(false\)/);
 assert.match(eng,/const \[focusMode, setFocusMode\] = useState\(false\)/);
 assert.match(eng,/setStudentQuery\(''\);[\s\S]*setMissingOnly\(false\);[\s\S]*setFocusMode\(false\)/);
 assert.match(eng,/aria-label="Tìm học sinh theo tên hoặc mã"/);
 assert.match(eng,/className="gb-roster-missing"/);
 assert.match(eng,/role="status" aria-live="polite"/);
 assert.match(eng,/className="gb-roster-focus" aria-pressed=\{focusMode\}/);
 assert.equal((eng.match(/visibleStudents\.map/g)||[]).length,3);
 assert.match(eng,/originalStudentPosition\.get\(student\.id\)/);
});

test('full roster remains source of truth for calculations, export and save',()=>{
 assert.match(eng,/const studentIds = useMemo\(\(\) => students\.map\(\(student\) => student\.id\)/);
 assert.match(eng,/students\.filter\(\(student\) => roundScore\(activeRound, student\.id, studentIds\)/);
 assert.match(eng,/gradeRoundBonus\(activeRound, student\.id, studentIds\)/);
 assert.match(eng,/await onCommit\(/);
 assert.match(eng,/\{students\.map\(\(student\) => <option key=\{student\.id\}/);
 assert.match(eng,/onClick=\{openClassGradebook\}/);
 assert.match(eng,/onClick=\{openStudentReport\}/);
 assert.match(page,/src="\/gradebook-material3-hero\.svg"/);
});

test('keyboard shortcuts preserve native caret and allow jumping between cells',()=>{
 assert.match(eng,/event\.altKey && \['ArrowLeft', 'ArrowRight'\]\.includes\(event\.key\)/);
 assert.match(eng,/\['Enter', 'ArrowDown', 'ArrowUp'\]/);
 assert.match(eng,/querySelector\('input\.hr-grade-input:not\(:disabled\)'\)/);
 assert.match(eng,/event\.preventDefault\(\)/);
 assert.match(eng,/target\.select\(\)/);
});

test('workbench is accessible and focus mode hides only supporting panels',()=>{
 assert.match(css,/Gradebook Workbench/);
 assert.match(css,/\.gb-roster-search input\s*\{/);
 assert.match(css,/\.gb-roster-missing input\s*\{/);
 assert.match(css,/\.gb-roster-progress-track/);
 assert.match(css,/\.hr-gradebook\.gb-is-focused > \.gb-academic-administration/);
 assert.match(css,/\.hr-gradebook\.gb-is-focused > \.gb-prod/);
 assert.doesNotMatch(css,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer)/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
