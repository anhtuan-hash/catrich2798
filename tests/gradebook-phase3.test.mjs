import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import {
  GRADEBOOK_RUBRICS,gradebookRubricKey,validateGradebookRubric,computeGradebookRubric,
  saveGradebookRubric,previewGradebookHistoryRestore,restoreGradebookHistory,
  buildStudentProgressModel,
} from '../src/utils/gradebookPhase3.js';
import { buildGradebookProgressPdf } from '../src/utils/gradebookProgressPdf.js';

const students=[{id:'student-a',fullName:'Nguyễn Minh An',code:'CP0001',active:true},
  {id:'student-b',fullName:'Lê Bình',code:'CP0002',active:true}];
const sem={
  regular:[0,1,2,3].map(i=>({
    columns:[{id:'score'+i,label:'Lần 1'}],
    scores:{'student-a':{['score'+i]:String(7+i)}},
    plusCounts:{'student-a':0},
  })),
  midterm:{scores:{'student-a':'8'}},
  final:{scores:{'student-a':'9'}},
};
const initial={
  subjects:{english:{name:'Tiếng Anh',semesters:{semester1:structuredClone(sem),semester2:structuredClone(sem)}}},
  auditHistory:[],finalizations:{},
};
const criteria=GRADEBOOK_RUBRICS.speaking.criteria;
const scores={fluency:8,pronunciation:7,lexical:9,grammar:8};

test('speaking and writing have teacher-visible, distinct weight and rubric criteria',()=>{
  assert.equal(criteria.reduce((t,c)=>t+c.weight,0),100);
  assert.equal(GRADEBOOK_RUBRICS.writing.criteria.reduce((t,c)=>t+c.weight,0),100);
  assert.notDeepEqual(criteria.map(x=>x.id),GRADEBOOK_RUBRICS.writing.criteria.map(x=>x.id));
  assert.equal(computeGradebookRubric(criteria,scores).score,8);
});
test('weighted rubric never accepts incomplete, duplicate, excessive, negative or ill-weighted grade inputs',()=>{
  assert.equal(validateGradebookRubric(criteria,{...scores,fluency:''}).ok,false);
  assert.equal(validateGradebookRubric(criteria,{...scores,fluency:10.5}).ok,false);
  assert.equal(validateGradebookRubric(criteria,{...scores,fluency:-1}).ok,false);
  assert.equal(validateGradebookRubric(criteria,{...scores,fluency:'8.123'}).ok,false);
  assert.equal(validateGradebookRubric(criteria.map(c=>({...c,weight:10})),scores).ok,false);
  assert.equal(validateGradebookRubric([...criteria,criteria[0]],scores).ok,false);
});
test('rubric changes stay isolated from official grades and store explicit rubric weight snapshots',()=>{
  const input={subject:'english',semester:'semester1',type:'speaking',activity:'Speaking Unit 5',
    studentId:'student-a',criteria,scores,note:'Phát âm rõ',actor:'teacher',now:'2026-10-12T00:00:00.000Z'};
  const next=saveGradebookRubric(initial,input);
  const key=gradebookRubricKey(input);
  assert.equal(next.rubricRecords[key].score,8);
  assert.equal(next.rubricRecords[key].note,'Phát âm rõ');
  assert.deepEqual(next.subjects,initial.subjects);
  assert.ok(!initial.rubricRecords);
  assert.equal(next.rubricRecords[key].criteria.reduce((n,c)=>n+c.weight,0),100);
});
test('rubric edits cannot bypass previously finalized semester',()=>{
  const b={...initial,finalizations:{'english|semester1':{locked:true}}};
  assert.throws(()=>saveGradebookRubric(b,{
    subject:'english',semester:'semester1',type:'speaking',activity:'Speaking 1',
    studentId:'student-a',criteria,scores,
  }),/đã chốt/);
});
function historyFixture(){
  const book=structuredClone(initial);
  const target=book.subjects.english.semesters.semester1;
  target.regular[0].scores['student-a'].score0='9';
  target.regular[0].plusCounts['student-a']=3;
  target.midterm.scores['student-a']='6';
  const entry={id:'log-01',count:3,changes:[
    {subject:'english',term:'semester1',kind:'scores',round:0,studentId:'student-a',column:'score0',from:'7',to:'9'},
    {subject:'english',term:'semester1',kind:'plusCounts',round:0,studentId:'student-a',column:'plus',from:0,to:3},
    {subject:'english',term:'semester1',kind:'midterm',studentId:'student-a',from:'8',to:'6'},
  ]};
  return {book,entry};
}
test('restore a complete audit event only if current values match previous new values',()=>{
  const {book,entry}=historyFixture();
  const preview=previewGradebookHistoryRestore(book,entry);
  assert.equal(preview.ok,true);
  const restored=restoreGradebookHistory(book,entry,{reason:'Nhập sai bản gốc',actor:'teacher'});
  const semester=restored.subjects.english.semesters.semester1;
  assert.equal(semester.regular[0].scores['student-a'].score0,'7');
  assert.equal(semester.regular[0].plusCounts['student-a'],0);
  assert.equal(semester.midterm.scores['student-a'],'8');
  assert.equal(restored.pendingGradebookRestore.sourceId,'log-01');
  assert.equal(book.subjects.english.semesters.semester1.midterm.scores['student-a'],'6');
});
test('restore blocks stale subsequent edits, finalization, deleted columns and incomplete logs',()=>{
  const {book,entry}=historyFixture();
  const changed=structuredClone(book);
  changed.subjects.english.semesters.semester1.regular[0].scores['student-a'].score0='10';
  assert.equal(previewGradebookHistoryRestore(changed,entry).ok,false);
  assert.throws(()=>restoreGradebookHistory(changed,entry,{reason:'Vui lòng thử lại'}));
  const locked={...book,finalizations:{'english|semester1':{locked:true}}};
  assert.equal(previewGradebookHistoryRestore(locked,entry).ok,false);
  const deleted=structuredClone(book);
  deleted.subjects.english.semesters.semester1.regular[0].columns=[];
  assert.equal(previewGradebookHistoryRestore(deleted,entry).ok,false);
  assert.equal(previewGradebookHistoryRestore(book,{...entry,count:4}).ok,false);
  assert.equal(previewGradebookHistoryRestore(book,{...entry,changes:[...entry.changes,entry.changes[0]],count:4}).ok,false);
  assert.throws(()=>restoreGradebookHistory(book,entry,{reason:'short'}),/8 ký tự/);
});
test('student progress model relies exclusively on gradebook score calculation and teacher-supplied notes',()=>{
  const r=saveGradebookRubric(initial,{subject:'english',semester:'semester1',
    type:'speaking',activity:'Speaking Unit 5',studentId:'student-a',criteria,scores,actor:'teacher'});
  const model=buildStudentProgressModel({student:students[0],students,semester:sem,subjectName:'Tiếng Anh',
    semesterId:'semester1',intervention:{note:'Ôn luyện phát âm',status:'in-progress',target:8},
    records:Object.values(r.rubricRecords)});
  assert.equal(model.completed,6);
  assert.equal(model.total,6);
  assert.deepEqual(model.components.slice(0,4),[7,8,9,10]);
  assert.equal(model.midterm,undefined);
  assert.equal(model.rubricRecords.length,1);
  assert.equal(model.intervention.note,'Ôn luyện phát âm');
});
test('progress PDF builds a valid actual PDF with Vietnamese font from repository asset',async()=>{
  const fontBytes=readFileSync(new URL('../brian-english-studio-v12.1.0-ui-core-migration-full-source/public/bes-fonts/brian-personal-font.ttf',import.meta.url));
  const report=await buildGradebookProgressPdf({student:students[0],students,semester:sem,subjectName:'Tiếng Anh',
    semesterId:'semester1',className:'12.6',schoolYear:'2026–2027',fontBytes});
  assert.ok(report.bytes.length>7000);
  assert.equal(report.mimeType,'application/pdf');
  assert.match(report.fileName,/\.pdf$/);
  const pdf=await PDFDocument.load(report.bytes);
  assert.equal(pdf.getPageCount(),1);
  assert.ok(pdf.getTitle().includes('Nguyễn Minh An'));
});
test('engine preserves original score tables, Save/Undo, permanent tabs and passes phase3 handlers',()=>{
  const engine=readFileSync(new URL('../src/components/gradebook/GradebookEngine.jsx',import.meta.url),'utf8');
  const tools=readFileSync(new URL('../src/components/gradebook/GradebookProductivityPanel.jsx',import.meta.url),'utf8');
  assert.match(engine,/onSaveRubric=\{recordRubric\}/);
  assert.match(engine,/onRestoreHistory=\{restoreHistory\}/);
  assert.match(engine,/rubricRecords:source.rubricRecords/);
  assert.match(engine,/restoredFrom:restoreMeta\?\.sourceId/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/onClick=\{save\}>Lưu điểm/);
  assert.match(engine,/onClick=\{discard\}>Hoàn tác/);
  assert.match(tools,/GradebookPhase3Panel/);
  assert.match(tools,/label:'Phiếu tiến bộ'/);
  assert.match(tools,/label:'Rubric'/);
  assert.match(tools,/label:'Khôi phục'/);
});
