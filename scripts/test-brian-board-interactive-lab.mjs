import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newLesson,normalizeLesson} from '../src/components/BrianBoard/boardModel.js';
import {createBoardActivity,normalizeBoardActivities,publicBoardActivity,gradeBoardActivity} from '../src/components/BrianBoard/boardActivities.js';
import {LAB_TYPES,LAB_EXAMPLES,LAB_LABELS,gradeLabActivity,validLabImage} from '../src/components/BrianBoard/boardActivityLab.js';
import {boardStudentPayload} from '../src/components/BrianBoard/boardPresentation.js';
import {buildStudentPdfSlides} from '../src/components/BrianBoard/boardPdf.js';
import {boardActivityRaw,reviseBoardActivity,duplicateBoardActivity} from '../src/components/BrianBoard/boardWorkflow.js';
const file=name=>readFileSync(new URL('../src/components/BrianBoard/'+name,import.meta.url),'utf8');
assert.equal(LAB_TYPES.length,10);
assert.equal(new Set(LAB_TYPES).size,10);
const samples=LAB_TYPES.map(type=>createBoardActivity({
 type,title:LAB_LABELS[type][0],prompt:'Unit 5 Global Warming',
 raw:LAB_EXAMPLES[type]
}));
assert.equal(samples.length,10);
for(const a of samples){
 assert.ok(a.items.length>0,a.type+' must parse real content');
 assert.equal(a.studentVisible,true);
 assert.ok(boardActivityRaw(a).length>0);
 assert.equal(normalizeBoardActivities([a]).length,1);
 const projection=publicBoardActivity(a);
 assert.equal(projection.type,a.type);
 assert.ok(projection.id);
 assert.equal('raw' in projection,false);
 assert.equal('distractors' in projection,false);
 assert.equal('mysteryAnswer' in projection,false);
 assert.equal('teacherNotes' in projection,false);
 assert.equal(JSON.stringify(projection).includes('"answer":'),false,'TV must not send private answer keys ('+a.type+')');
 const duplicate=duplicateBoardActivity(a);
 assert.notEqual(duplicate.id,a.id);
 assert.equal(duplicate.studentVisible,false);
 assert.equal(publicBoardActivity(duplicate),null);
 const revised=reviseBoardActivity(a,{type:a.type,title:'Revised',prompt:'Check',
  raw:LAB_EXAMPLES[a.type]});
 assert.equal(revised.id,a.id);
 assert.equal(revised.createdAt,a.createdAt);
}
assert.ok(LAB_EXAMPLES.evidence_hunter.startsWith('PASSAGE:'));
assert.deepEqual(gradeBoardActivity(samples[0],[{x:30,y:35},{x:76,y:55}]),
 {correct:2,total:2,complete:true});
assert.equal(gradeLabActivity(samples[1],[{x:22,y:38},{x:73,y:64}]).correct,2);
assert.equal(gradeLabActivity(samples[2],['reduce','reuse']).correct,2);
assert.equal(gradeLabActivity(samples[3],[{wrong:'go',answer:'goes'},{wrong:'was',answer:'were'}]).correct,2);
assert.equal(gradeLabActivity(samples[4],[{answer:'Burning fossil fuels',evidence:'Burning fossil fuels releases carbon dioxide'}]).correct,1);
assert.equal(gradeLabActivity(samples[5],['C','B']).correct,2);
assert.equal(gradeLabActivity(samples[6],[true,true]).correct,2);
assert.equal(gradeLabActivity(samples[7],['Carbon dioxide','Solar energy']).correct,2);
assert.equal(gradeLabActivity(samples[8],[1,2]).correct,2);
assert.equal(gradeLabActivity(samples[9],[
 {source:'Burning fossil fuels',relation:'causes',target:'carbon emissions'},
 {source:'Carbon emissions',relation:'increase',target:'global warming'}]).correct,2);
assert.equal(gradeLabActivity(samples[5],['A','A']).correct,0);
assert.throws(()=>createBoardActivity({type:'four_corners',raw:'Question | only 2 fields'}),/Question/);
assert.throws(()=>createBoardActivity({type:'hotspot',raw:'Location | 110 | 22'}),/x\(0–100\)/);
assert.throws(()=>createBoardActivity({type:'cloze_snap',raw:'No brackets here'}),/\[\[answer\]\]/);
assert.throws(()=>createBoardActivity({type:'evidence_hunter',raw:'No passage | answer'}),/PASSAGE/);
assert.equal(validLabImage('https://example.com/a.png'),false);
const lesson=newLesson('teacher-private');
lesson.pages[0].activities=samples;
const normalized=normalizeLesson(lesson,'teacher-private');
assert.equal(normalized.pages[0].activities.length,10);
for(const a of samples){
 const page=boardStudentPayload(lesson,a.id,{activityId:a.id,index:1,
  scores:[{name:'Team 1',score:20}],opened:[2,4],teacherAnswer:'SECRET'});
 assert.equal(page.activity.type,a.type);
 assert.ok(!JSON.stringify(page).includes('SECRET'));
 assert.deepEqual(page.live.opened,[2,4]);
 assert.equal(page.live.index,1);
 assert.equal(page.live.scores[0].score,20);
}
const hidden={...lesson,pages:[{...lesson.pages[0],hidden:true}]};
assert.equal(boardStudentPayload(hidden,samples[0].id).activity,null);
const privateActivity={...samples[0],studentVisible:false};
assert.equal(publicBoardActivity(privateActivity),null);
const teacherOnly={...samples[0],teacherOnly:true};
assert.equal(publicBoardActivity(teacherOnly),null);
const dragging=publicBoardActivity(samples[1]);
assert.equal(dragging.items.every(x=>!('label' in x)),true);
const hotspot=publicBoardActivity(samples[0]);
assert.equal(hotspot.items.every(x=>!('x' in x)&&!('y' in x)),true);
const pdf=buildStudentPdfSlides(lesson,{includeActivities:true});
assert.equal(pdf.length,11);
assert.equal(pdf.filter(s=>s.kind==='activity').length,10);
assert.ok(!JSON.stringify(pdf).includes('"raw"'));
for(const name of ['BoardActivityLabStage.jsx','BoardActivityLabBuilder.jsx','BoardActivityPublicPreview.jsx']){
 assert.ok(file(name).length>1000);
}
const stage=file('BoardActivityLabStage.jsx');
assert.match(stage,/onDragStart/);
assert.match(stage,/onDrop/);
assert.match(stage,/markEvidence/);
assert.match(stage,/checkStress/);
assert.match(stage,/handleMystery/);
assert.match(stage,/checkConcept/);
assert.match(stage,/award\(10\)/);
const ui=file('BrianBoard.jsx');
assert.match(ui,/LAB_TYPES\.map/);
assert.match(ui,/BoardActivityLabBuilder/);
assert.match(ui,/BoardActivityPublicPreview/);
assert.match(ui,/receivePublicActivityState/);
const viewer=readFileSync(new URL('../public/brian-board-viewer.js',import.meta.url),'utf8');
assert.match(viewer,/concept_connection/);
assert.match(viewer,/four_corners/);
assert.match(viewer,/mystery_reveal/);
assert.ok(!viewer.includes('innerHTML'));
const pdfSource=file('boardPdf.js');
assert.match(pdfSource,/STUDENT CHALLENGE/);
assert.match(pdfSource,/publicBoardActivity/);
console.log('PASS Brian Board interactive lab: 10 authored games, grading, PDF/TV redaction and stage UI contracts.');
