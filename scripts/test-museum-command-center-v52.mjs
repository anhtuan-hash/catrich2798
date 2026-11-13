import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classroomSummary,checkFeedbackQuality,normaliseComment} from '../src/features/immersive-gallery/v3/museumCommandCenter.js';

const seed={
 groups:Array.from({length:10},(_,i)=>({id:'g'+(i+1),label:'Nhóm '+String(i+1).padStart(2,'0'),
  state:i===0?'submitted':'editing'})),
 responses:[{group_id:'g1'},{group_id:'g3'}],
 microResults:[{group_id:'g2',choice:1}],
 helpGroups:['g4','g4','g7'],
 feedback:[
  {id:'f1',from_group:'g1',to_group:'g2',rating:4,learned:'The crossing example made the safety issue clear.',clarify:'Add a safer alternative for the rainy-day route.'},
  {id:'f2',from_group:'g3',to_group:'g2',rating:3,learned:'The route choices are not transport statistics.',clarify:'Please explain how adults verify the school route.'},
  {id:'f3',from_group:'g2',to_group:'g7',rating:4,learned:'Food waste observations should protect student privacy.',clarify:'Define how no individual plates will be recorded.'}
 ]
};

test('10 groups, response count, unique help groups and inbound/outbound reviews',()=>{
 const x=classroomSummary(seed);
 assert.deepEqual(x.metrics,{groups:10,responded:3,reviewed:2,needHelp:2,totalReviews:3});
 const g2=x.groups.find(g=>g.id==='g2');
 assert.equal(g2.reviewCount,2);
 assert.equal(g2.reviewsGiven.length,1);
 assert.equal(g2.thinkingAnswered,true);
 assert.equal(g2.responded,false);
 assert.equal(x.groups.find(g=>g.id==='g4').askingHelp,true);
 assert.equal(x.groups.find(g=>g.id==='g6').reviewCount,0);
});

test('empty and partial server responses never invent students or grades',()=>{
 const x=classroomSummary();
 assert.deepEqual(x.metrics,{groups:0,responded:0,reviewed:0,needHelp:0,totalReviews:0});
 assert.deepEqual(x.groups,[]);
 assert.deepEqual(x.warnings,[]);
 assert.equal(classroomSummary({groups:[{id:'only'}]}).groups[0].state,'issued');
});

test('teacher quality guard warns for substantial exact duplication only',()=>{
 const repeated='Our group learned that a teacher must confirm the approved shutdown procedure before students touch any equipment.';
 const warnings=checkFeedbackQuality([
  {learned:repeated,clarify:'Add a cooling-period step to the projector diagram.'},
  {learned:'  OUR group learned that a teacher must confirm the approved shutdown procedure before students touch any equipment!  ',clarify:'Clarify staff and student responsibilities.'},
  {learned:'We recommend switching off unused lights.',clarify:'Please label the survey source clearly.'}
 ]);
 assert.equal(warnings.filter(w=>w.type==='repeated-comment').length,1);
 assert.equal(warnings[0].count,2);
 assert.equal(normaliseComment('Group 01: A safe route'),normaliseComment('group 02 a safe route'));
 assert.equal(checkFeedbackQuality([{learned:'According to our survey',clarify:'Use one source.'}]).filter(w=>w.type==='repeated-comment').length,0);
});

test('teacher-only interface replaces unlimited saved feedback and works in fullscreen',()=>{
 const teacher=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx','utf8');
 const center=fs.readFileSync('src/features/immersive-gallery/v3/MuseumClassroomCommandCenter.jsx','utf8');
 const presenter=fs.readFileSync('src/features/immersive-gallery/v3/museumLivePresenter.css','utf8');
 const backend=fs.readFileSync('serverless-handlers/museum-live.js','utf8');
 assert.match(teacher,/MuseumClassroomCommandCenter compact/);
 assert.match(teacher,/museum-class-command-workspace/);
 assert.doesNotMatch(teacher,/<details open><summary>.*Saved peer feedback/);
 assert.match(center,/data-testid="museum-class-command"/);
 assert.match(center,/aria-pressed=\{selected\?\.id===group\.id\}/);
 assert.match(center,/onSpotlight\?\.\(selected\.id\)/);
 assert.match(center,/role="tablist"/);
 assert.match(presenter,/bml-presenter-panel:has\(\.bml-class-command\)/);
 assert.match(backend,/helpGroups:\[\.\.\.new Set\(helps\.map\(h=>h\.group_id\)\)\]/);
});

test('progress statistics are counts from lesson state, not fabricated evidence',()=>{
 const src=fs.readFileSync('src/features/immersive-gallery/v3/MuseumClassroomCommandCenter.jsx','utf8');
 assert.match(src,/Activity responses/);
 assert.match(src,/Groups reviewed/);
 assert.match(src,/Activity answers and group states are not grades/);
 assert.doesNotMatch(src,/100% completed|grades calculated|AI-assessed/);
});
