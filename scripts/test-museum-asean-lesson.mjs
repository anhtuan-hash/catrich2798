import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeGuestDraft} from '../src/features/immersive-gallery/creatorPassPolicy.js';
import {documentFromStudio,emptyStudio,scoreRubric} from '../src/features/immersive-gallery/v3/museumData.js';
import {ASEAN_DESTINATIONS,ASEAN_FRAMES,ASEAN_RUBRIC,ASEAN_STAGES,ASEAN_TEMPLATE,aseanBaselineDraft,aseanBlankResponse,aseanExhibitMissing,aseanTransferDraft,aseanWritingCard,aseanWritingRepeats,validAseanResponse} from '../src/features/immersive-gallery/v3/aseanLesson.js';
import {sessionStage,LIVE_STAGES} from '../src/features/immersive-gallery/v3/liveLesson.js';
import {ASEAN_MIN_GROUPS,ASEAN_MAX_GROUPS,aseanDestination,aseanPeerGroup,validAseanGroupCount} from '../src/features/immersive-gallery/v3/aseanLesson.js';

test('ASEAN uses two 45-minute group periods, ten destinations and parallel writing cards',()=>{
 for(const period of [1,2])assert.equal(ASEAN_STAGES.filter(stage=>stage.period===period).reduce((sum,stage)=>sum+stage.minutes,0),45);
 assert.equal(ASEAN_STAGES.length,6);
 assert.equal(LIVE_STAGES.length,11);
 assert.equal(ASEAN_DESTINATIONS.length,10);
 const groups=Array.from({length:10},(_,i)=>'Nhóm '+String(i+1).padStart(2,'0'));
 const baseline=groups.map(label=>aseanWritingCard(label).title);
 const transfer=groups.map(label=>aseanWritingCard(label,true).title);
 assert.equal(new Set(baseline).size,10);
 assert.equal(new Set(transfer).size,10);
 assert.deepEqual(transfer,[...baseline.slice(1),baseline[0]]);
 assert.equal(baseline[0],'My Son Sanctuary');
 assert.equal(transfer[0],'Sukhothai Historical Park');
 assert.ok(groups.every((_,i)=>baseline[i]!==transfer[i]));
 const drafts=groups.map(aseanTransferDraft);
 assert.equal(new Set(drafts.map(draft=>draft?.experience)).size,10);
 assert.equal(new Set(drafts.map(draft=>draft?.advice)).size,10);
 groups.forEach((label,i)=>{
  assert.equal(validAseanResponse(5,drafts[i]),true,label);
  assert.match(drafts[i].experience,/^Visitors can /);
  assert.match(drafts[i].advice,/^Visitors should /);
  assert.equal(aseanWritingRepeats(aseanBaselineDraft(label),drafts[i]),false,label);
 });
 assert.match(drafts[0].experience,/historic monuments/);
 assert.match(drafts[9].experience,/brick towers/);
 assert.equal(aseanTransferDraft('Nhóm 11'),null);
 assert.equal(sessionStage({media_board:{lessonTemplate:ASEAN_TEMPLATE}},3),ASEAN_STAGES[3]);
 assert.equal(sessionStage({media_board:{}},0),LIVE_STAGES[0]);
});

test('three-frame exhibit remains valid through the password-protected studio and server normalizer',()=>{
 const studio=emptyStudio();
 studio.title='Hội An Ancient Town';studio.theme='culture';
 studio.artMeta={};
 studio.learning.source='https://whc.unesco.org/en/list/948/';
 for(const [index,frame] of ASEAN_FRAMES.entries()){
  studio.learning[frame.key]='Visitors can walk past the old houses in the town and see how building designs reflect the history of trade in this area.';
  studio.artworks[frame.key]='80000000-0000-4000-8000-00000000000'+index;
  studio.artMeta[frame.key]={alt:'Historic buildings',source:'Licensed photograph',rights:'CC BY 4.0'};
 }
 const doc=normalizeGuestDraft(documentFromStudio(studio,ASEAN_TEMPLATE));
 assert.deepEqual(doc.rooms[0].exhibits.map(frame=>frame.title),ASEAN_FRAMES.map(frame=>frame.label));
 assert.deepEqual(aseanExhibitMissing(doc),[]);
 doc.learning.solution='Too short.';
 assert.deepEqual(aseanExhibitMissing(doc),['Visitor Advice caption (20–30 words)']);
 assert.equal(scoreRubric({english:4,design:2,evidence:2,revision:2},ASEAN_RUBRIC),10);
 assert.throws(()=>scoreRubric({english:5},ASEAN_RUBRIC));
});

test('every supported class size has a different visitor for each round and a destination for every group',()=>{
 for(let count=ASEAN_MIN_GROUPS;count<=ASEAN_MAX_GROUPS;count++){
  assert.equal(validAseanGroupCount(count),true);
  const groups=Array.from({length:count},(_,index)=>({id:index,label:'Nhóm '+String(index+1).padStart(2,'0')})).reverse();
  assert.equal(new Set(groups.map(group=>aseanDestination(group.label)?.name)).size,count);
  for(const group of groups){
   const initialVisitor=aseanPeerGroup(groups,group.id,3,{reverse:true});
   const freshVisitor=aseanPeerGroup(groups,group.id,4,{reverse:true});
   assert.equal(new Set([group.id,initialVisitor.id,freshVisitor.id]).size,3);
   assert.equal(aseanPeerGroup(groups,initialVisitor.id,3).id,group.id);
   assert.equal(aseanPeerGroup(groups,freshVisitor.id,4).id,group.id);
  }
 }
 for(const count of [0,1,2,3.5,11,NaN])assert.equal(validAseanGroupCount(count),false);
});

test('group forms reject conflated image choices and incorrect scores for supporting frames',()=>{
 const plan={codes:['A','B','C'],comparisonFrame:2,alternative:'D',fact:'A fact',source:'A source',reason:'A reason'};
 assert.equal(validAseanResponse(1,plan),true);
 assert.equal(validAseanResponse(1,{...plan,alternative:'b'}),false);
 const visit={first:2,comment:'Clarify the location.',answers:ASEAN_FRAMES.map((_,index)=>({text:'An answer',frame:index+1,score:1}))};
 assert.equal(validAseanResponse(3,visit),true);
 assert.equal(validAseanResponse(3,{...visit,answers:visit.answers.toReversed()}),false);
 assert.equal(validAseanResponse(4,{question:2,answer:'A visitor answer.',frame:2,score:1}),true);
 assert.equal(validAseanResponse(4,{question:1,answer:'A visitor answer.',frame:2,score:1}),false);
});

test('Creator Pass requests remain scoped when the browser has a different lesson or group',async()=>{
 const {assertActiveMuseumLesson,assertGuestLessonScope,assertInviteScope}=await import('../serverless-handlers/_galleryCreator.js');
 const climate={id:'80000000-0000-4000-8000-000000000001',class_scope:'11.4',lesson_template:'climate'};
 const asean={id:'80000000-0000-4000-8000-000000000002',class_scope:'11.4',lesson_template:ASEAN_TEMPLATE};
 const climateInvite={handle:'climate-group-handle'};
 const aseanInvite={handle:'asean-group-handle'};
 assert.doesNotThrow(()=>assertGuestLessonScope(climate.id,climate));
 assert.doesNotThrow(()=>assertGuestLessonScope(asean.id,asean));
 assert.throws(()=>assertGuestLessonScope(asean.id,climate),{status:409});
 assert.throws(()=>assertGuestLessonScope(climate.id,asean),{status:409});
 assert.doesNotThrow(()=>assertInviteScope(aseanInvite.handle,aseanInvite));
 assert.throws(()=>assertInviteScope(aseanInvite.handle,climateInvite),{status:409});
 assert.doesNotThrow(()=>assertActiveMuseumLesson(asean));
 assert.throws(()=>assertActiveMuseumLesson(climate),{status:404});
 assert.throws(()=>assertActiveMuseumLesson(null),{status:404});
});

test('ASEAN transfer rejects a repeated baseline and accepts new writing',()=>{
 const baseline={experience:'Visitors can look at the old brick towers.',advice:'Stand to one side of the path.'};
 assert.equal(aseanWritingRepeats(baseline,{
  experience:'  visitors can look at the old brick towers!  ',
  advice:'Stand to one side of the path',
 }),true);
 assert.equal(aseanWritingRepeats(baseline,{
  ...baseline,experience:'Visitors can follow paths past historic monuments.',
 }),false);
 assert.equal(aseanWritingRepeats(null,baseline),false);
 assert.equal(aseanWritingRepeats({experience:'Only one answer'},{experience:'Only one answer'}),false);
});

test('new ASEAN lessons start with blank independent student responses, even for another class 11.3',()=>{
 for(const stage of [0,5]){
  assert.deepEqual(aseanBlankResponse(stage),{experience:'',advice:''});
 }
 assert.deepEqual(aseanBlankResponse(1),{codes:['','',''],comparisonFrame:null,alternative:'',fact:'',source:'',reason:''});
 assert.deepEqual(aseanBlankResponse(3),{
  first:null,answers:ASEAN_FRAMES.map(()=>({text:'',frame:null,score:0})),comment:'',
 });
 assert.deepEqual(aseanBlankResponse(4),{answer:'',frame:null,score:0});
 const first=aseanBlankResponse(3),second=aseanBlankResponse(3);
 first.answers[0].text='An earlier class answer';
 assert.equal(second.answers[0].text,'');
 const studentSource=readFileSync(new URL('../src/features/immersive-gallery/v3/AseanStudentLesson.jsx',import.meta.url),'utf8');
 assert.match(studentSource,/useState\(\(\)=>record\|\|aseanBlankResponse\(stage\)\)/);
 assert.doesNotMatch(studentSource,/aseanBaselineDraft|aseanTransferDraft|class_scope==='11\.3'/);
});
