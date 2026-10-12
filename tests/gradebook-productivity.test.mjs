import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  numericGrade, parseGradeMatrix, previewGradePaste,
  analyzeGradebook, gradebookQualityReport, gradebookAuditChanges,
} from '../src/utils/gradebookProductivity.js';

const students=[
  {id:'a',fullName:'An',code:'ST1',active:true},
  {id:'b',fullName:'Bình',code:'ST2',active:true},
  {id:'c',fullName:'Chi',code:'ST3',active:true},
];
const cols=[{id:'x',label:'Lần 1'},{id:'y',label:'Lần 2'}];

test('numeric score accepts only 0..10 with at most 2 decimals',()=>{
  assert.equal(numericGrade('8,75'),8.75);
  assert.equal(numericGrade('0'),0);
  assert.equal(numericGrade('10'),10);
  for(const bad of ['11','-1','8.123','abc','Infinity',null,'']) assert.equal(numericGrade(bad),null);
});
test('pasted tab matrix preserves leading blank cells and skips empty cells without erasing existing scores',()=>{
  assert.deepEqual(parseGradeMatrix('\t8\t9\n\t6\t7'),[['','8','9'],['','6','7']]);
  const p=previewGradePaste({text:'\t8\t9\n\t6\t7',students,columns:[{id:'z'},...cols],scores:{a:{x:'7'}}});
  assert.equal(p.entries.length,4);
  assert.equal(p.entries[0].columnId,'x');
  assert.equal(p.overwrites,1);
  assert.equal(p.issues.length,0);
});
test('pasted 3x2 matrix maps exactly to student and score column IDs',()=>{
  const p=previewGradePaste({text:'9\t8\n7\t6\n5\t4',students,columns:cols});
  assert.equal(p.entries.length,6);
  assert.deepEqual(p.entries[0],{studentId:'a',studentName:'An',columnId:'x',columnLabel:'Lần 1',value:'9',overwritten:false,previous:''});
  assert.equal(p.entries[5].studentId,'c');
  assert.equal(p.entries[5].columnId,'y');
});
test('pasted points reject extra rows and columns instead of silently creating columns',()=>{
  const p=previewGradePaste({text:'9\t8\t7\n8\t7\t6\n7\t6\t5\n6\t5\t4',students,columns:cols});
  assert.equal(p.entries.length,6);
  assert.equal(p.issues.length,6);
});
test('invalid grades cause errors and valid zero is retained',()=>{
  const p=previewGradePaste({text:'0\t11\n-1\t8.123',students,columns:cols});
  assert.equal(p.entries.length,1);
  assert.equal(p.entries[0].value,'0');
  assert.equal(p.issues.length,3);
});
test('preview reports potential overwrites but identical grades are not conflicts',()=>{
  const p=previewGradePaste({text:'8\t9',students,columns:cols,scores:{a:{x:'8',y:'7'}}});
  assert.equal(p.overwrites,1);
  assert.equal(p.entries[1].previous,'7');
});
test('progress uses actual official computed round scores when supplied',()=>{
  const semester={regular:[
    {columns:[cols[0]],scores:{a:{x:'8'},b:{x:'3'}}},
    {columns:[cols[0]],scores:{a:{x:'9'},b:{x:'7'}}},
    {columns:[cols[0]],scores:{a:{x:'7'},b:{x:'5'}}},
    {columns:[cols[0]],scores:{a:{x:'6'},b:{x:'6'}}},
  ],midterm:{scores:{a:'8'}},final:{scores:{a:'9'}}};
  const info=analyzeGradebook({students,semester,minimum:5,decline:2,computeRoundScore:(round,id)=>numericGrade(round.scores?.[id]?.x)});
  assert.equal(info.complete,1);
  assert.equal(info.incomplete,2);
  assert.equal(info.rows[0].completed,6);
  assert.equal(info.rows[0].dropping,false);
  assert.equal(info.rows[1].low,true);
  assert.equal(info.rows[1].completed,4);
  assert.equal(info.missingCells,8);
});
test('trend warning only triggers after a real declining score pair',()=>{
  const semester={regular:[
    {columns:cols,scores:{a:{x:'8'}}},{columns:cols,scores:{a:{x:'6'}}},
  ]};
  const info=analyzeGradebook({students,semester,minimum:5,decline:2});
  assert.equal(info.rows[0].dropping,true);
  assert.equal(info.rows[1].dropping,false);
  assert.deepEqual(info.rows[2].reasons,[]);
});
test('quality scanner detects duplicate code, missing name, invalid point and negative plus count',()=>{
  const peers=[{id:'a',fullName:'An',code:'DD'}, {id:'b',fullName:'',code:'DD'}];
  const semester={regular:[{scores:{a:{x:'10.5',y:'4'}},plusCounts:{a:'-3'}}],
    midterm:{scores:{b:'12'}},final:{scores:{}}};
  const issues=gradebookQualityReport({students:peers,semester});
  assert.equal(issues.length,5);
});
test('audit contains concrete changed scores for regular TX, plus-count and exams',()=>{
  const old={subjects:{english:{semesters:{semester1:{regular:[{scores:{a:{x:'7'}},plusCounts:{a:1}}],
    midterm:{scores:{a:'6'}},final:{scores:{}}}}}}};
  const now=structuredClone(old);
  const sem=now.subjects.english.semesters.semester1;
  sem.regular[0].scores.a.x='8';
  sem.regular[0].plusCounts.a=3;
  sem.midterm.scores.a='9';
  const diff=gradebookAuditChanges(old,now);
  assert.equal(diff.length,3);
  assert.ok(diff.some(x=>x.from==='7'&&x.to==='8'));
  assert.ok(diff.some(x=>x.kind==='plusCounts'&&x.from===1&&x.to===3));
  assert.ok(diff.some(x=>x.kind==='midterm'&&x.from==='6'&&x.to==='9'));
  assert.equal(gradebookAuditChanges(now,now).length,0);
});
test('no AI, no API upload from pure data helpers',()=>{
  const code=readFileSync(new URL('../src/utils/gradebookProductivity.js',import.meta.url),'utf8');
  assert.doesNotMatch(code,/\bfetch\s*\(|\bopenai\b|\bllm\b|\baxios\b/i);
});
test('real editor still owns original save, undo, score and PDF logic',()=>{
  const engine=readFileSync(new URL('../src/components/gradebook/GradebookEngine.jsx',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../src/components/gradebook/GradebookProductivityPanel.jsx',import.meta.url),'utf8');
  assert.match(engine,/gradeRoundBonus\(activeRound/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/onClick=\{save\}>Lưu điểm/);
  assert.match(engine,/onClick=\{discard\}>Hoàn tác/);
  assert.match(engine,/GradebookProductivityPanel/);
  assert.match(engine,/onPaste=\{applyPaste\}/);
  assert.match(engine,/gradebookAuditChanges\(workspace.learningGradebook/);
  assert.match(panel,/window.confirm/);
  assert.match(panel,/onSetIntervention/);
  assert.match(panel,/gradebookQualityReport/);
  assert.match(panel,/onSetAlertSettings/);
  assert.match(panel,/maxLength=\{1200\}/);
});
