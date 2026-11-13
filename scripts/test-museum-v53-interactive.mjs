import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyStudio,normalizeStudio,documentFromStudio,normalizeStoryboardOrder,moveStoryboardCard} from '../src/features/immersive-gallery/v3/museumData.js';
import {normalizeGuestDraft} from '../src/features/immersive-gallery/creatorPassPolicy.js';
import {exhibitInsights,exhibitField} from '../src/features/immersive-gallery/v3/museumExhibitInsights.js';
const read=path=>fs.readFileSync(path,'utf8');

test('old draft remains default Problem → Evidence → Solution; never erases existing content',()=>{
 const source={title:'Test',theme:'classic',summary:'A class museum',
  learning:{issue:'Existing issue',evidence:'Existing evidence',solution:'Existing solution',source:'A group-named citation'}};
 const normalized=normalizeStudio(source);
 assert.deepEqual(normalized.storyboardOrder,['issue','evidence','solution']);
 assert.equal(normalized.learning.issue,'Existing issue');
 const doc=documentFromStudio(normalized);
 assert.deepEqual(doc.rooms[0].exhibits.map(x=>x.title),['The Problem','The Evidence','Our Solution']);
 assert.equal(doc.storyboardOrder.length,3);
});

test('reordered storyboard preserves text, original artwork mapping, and original source association',()=>{
 let studio=emptyStudio();
 studio={...studio,title:'Group Gallery',theme:'classic',
  learning:{...studio.learning,issue:'A dark unused classroom',evidence:'Group priority survey',
   source:'In-class group-priority survey',solution:'Teacher-approved closing checklist'},
  artMeta:{issue:{alt:'School classroom',source:'Student artwork',rights:'Owned by group'},
   evidence:{alt:'Survey chart',source:'Class results',rights:'Class-permitted'},
   solution:{alt:'Exit card',source:'Student artwork',rights:'Owned by group'}},
  storyboardOrder:['solution','issue','evidence']};
 const doc=documentFromStudio(studio);
 assert.deepEqual(doc.rooms[0].exhibits.map(x=>x.title),['Our Solution','The Problem','The Evidence']);
 assert.match(doc.rooms[0].exhibits[2].description,/Source: In-class group-priority survey/);
 assert.doesNotMatch(doc.rooms[0].exhibits[0].description,/Source: In-class group-priority survey/);
 assert.equal(doc.rooms[0].exhibits[0].transform.position[0],-3);
 const accepted=normalizeGuestDraft(doc,{max_rooms:3,max_exhibits:12});
 assert.deepEqual(accepted.storyboardOrder,['solution','issue','evidence']);
 assert.deepEqual(accepted.rooms[0].exhibits.map(x=>x.title),['Our Solution','The Problem','The Evidence']);
});

test('keyboard reorder and drag-offset helper cannot lose or duplicate an exhibit',()=>{
 assert.deepEqual(moveStoryboardCard(['issue','evidence','solution'],'solution',-1),
 ['issue','solution','evidence']);
 assert.deepEqual(moveStoryboardCard(['issue','evidence','solution'],'issue',-1),
 ['issue','evidence','solution']);
 assert.deepEqual(moveStoryboardCard(['issue','evidence','solution'],'issue',2),
 ['evidence','solution','issue']);
 assert.deepEqual(normalizeStoryboardOrder(['issue','issue','evidence']),
 ['issue','evidence','solution']);
 assert.deepEqual(normalizeStoryboardOrder(['unknown','evidence','solution']),
 ['issue','evidence','solution']);
});

test('source-aware 2D/3D inspector uses only documented survey and source facts',()=>{
 const gallery={learning:{source:'NASA explanatory article (named by students)',improvement:'Added a safe shutdown exception'},
  survey:{id:'test',session_id:'s',counts:[2,4,3,1],source:'online',created_at:'2026-11-13T00:00:00Z'},
  artMeta:{evidence:{source:'Class group poll',rights:'For classroom use'}}};
 const evidence=exhibitInsights(gallery,{title:'The Evidence',description:'Three points\n\nSource: NASA'},1);
 assert.equal(evidence.key,'evidence');
 assert.equal(evidence.survey.n,10);
 assert.equal(evidence.survey.unit,'group votes');
 assert.equal(evidence.survey.options[1].count,4);
 assert.equal(evidence.source,'NASA explanatory article (named by students)');
 assert.equal(evidence.improvement,'');
 assert.equal(evidence.imageRights,'For classroom use');
 const solution=exhibitInsights(gallery,{title:'Our Solution',description:'A closing routine'},2);
 assert.equal(solution.survey,null);
 assert.equal(solution.improvement,'Added a safe shutdown exception');
 const empty=exhibitInsights({}, {title:'The Problem',description:'A school problem'},0);
 assert.equal(empty.source,'');assert.equal(empty.survey,null);
 assert.equal(exhibitField(2,'The Problem'),'issue');
});

test('peer exhibit focus is strictly allowlisted and legacy comments remain nullable',()=>{
 const peer=read('serverless-handlers/_museumLivePeer.js');
 const schema=read('supabase/migrations/20261113170200_museum_peer_exhibit_focus_v53.sql');
 const student=read('src/features/immersive-gallery/v3/MuseumLivePeerFeedback.jsx');
 assert.match(peer,/allowedFocus=new Set\(\['issue','evidence','solution'\]\)/);
 assert.match(peer,/focus&&!allowedFocus\.has\(focus\)/);
 assert.match(peer,/room\.owner_group_id===ctx\.group\.id/);
 assert.match(peer,/\.eq\('session_id',session\.id\)/);
 assert.match(peer,/target_exhibit:focus/);
 assert.match(peer,/ctx\.assignment\.id/);
 assert.match(schema,/target_exhibit is null/);
 assert.match(schema,/target_exhibit in \('issue','evidence','solution'\)/);
 assert.doesNotMatch(schema,/grant .* to anon|disable row level security/i);
 assert.match(student,/onExhibitSelect=/);
 assert.match(student,/Whole exhibition/);
 assert.match(student,/What are you reviewing/);
});

test('saved Before/After snapshots are teacher scoped and visible in both classroom interfaces',()=>{
 const server=read('serverless-handlers/museum-live.js');
 const stage=read('src/features/immersive-gallery/v3/MuseumClassroomCommandCenter.jsx');
 const student=read('src/features/immersive-gallery/v3/MuseumLabStudent.jsx');
 const panel=read('src/features/immersive-gallery/v3/MuseumBeforeAfter.jsx');
 assert.match(server,/if\(op==='checkpoint-compare'\)/);
 assert.match(server,/group\.assignment_id!==assignment\.id/);
 assert.match(server,/\.eq\('group_id',groupId\)/);
 assert.match(server,/checkpointGallery\(admin,before,group\.label\)/);
 assert.match(student,/kind==='before'/);
 assert.match(student,/kind==='after'/);
 assert.match(stage,/MuseumBeforeAfter/);
 assert.match(panel,/beforeAfterEvidence/);
 assert.match(panel,/routeChanged/);
 assert.doesNotMatch(panel,/dangerouslySetInnerHTML|localStorage|Math\.random/);
});

test('no automatic audio/video appears in museum inspection; files stay class scoped',()=>{
 const scene=read('src/features/immersive-gallery/v3/MuseumScene.jsx');
 assert.match(scene,/exhibitInsights\(gallery,selected,selectedIndex\)/);
 assert.match(scene,/Source named by the group/);
 assert.match(scene,/Group choices are not measurements of emissions/);
 assert.doesNotMatch(scene,/<audio\s|<video\s|autoplay|autoPlay/);
 assert.match(scene,/role="dialog"/);
 assert.match(scene,/document\.addEventListener\('keydown',handleKeys\)/);
});
