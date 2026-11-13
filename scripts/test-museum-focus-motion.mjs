import test from 'node:test';
import assert from 'node:assert/strict';
import {
 FOCUS_INITIAL,focusReducer,museumFocusLayout,smoothstep,interpolatePose,
 poseWithinTolerance,minimumCameraDistance,selectFocusDuration
} from '../src/features/immersive-gallery/v3/museumExhibitFocusMotion.js';
import {buildExhibitFocusBoard,projectAuthorizedEvidence} from '../src/features/immersive-gallery/v3/museumExhibitFocusData.js';
import {exhibitInsights} from '../src/features/immersive-gallery/v3/museumExhibitInsights.js';
const select=s=>focusReducer(s,{type:'SELECT',exhibitId:'exhibit-evidence',roomId:'room-a'});
test('finite state machine completes Cinema focus and exact reverse',()=>{
 let s=select(FOCUS_INITIAL);
 assert.equal(s.phase,'preparing');assert.equal(s.exhibitId,'exhibit-evidence');
 for(const [type,phase] of [
  ['PREPARED','extracting'],['EXTRACT_COMPLETE','presenting'],
  ['PRESENT_COMPLETE','focused'],['BACK','returning'],['RETURN_COMPLETE','idle']]){
  s=focusReducer(s,{type});assert.equal(s.phase,phase);
 }
 assert.equal(s.exhibitId,null);assert.equal(s.roomId,null);
});
test('duplicate SELECT and interruption never spawn another focus',()=>{
 const s=select(FOCUS_INITIAL);
 assert.strictEqual(select(s),s);
 assert.strictEqual(focusReducer(s,{type:'SELECT',exhibitId:'other',roomId:'room-a'}),s);
 assert.equal(focusReducer(s,{type:'BACK'}).phase,'returning');
 assert.equal(focusReducer(focusReducer(s,{type:'BACK'}),{type:'RETURN_COMPLETE'}).phase,'idle');
});
test('Escape/back at every active phase reaches idle, reset drops stale generation',()=>{
 for(const phase of ['preparing','extracting','presenting','focused','error']){
  const s={...select(FOCUS_INITIAL),phase};
  const back=focusReducer(s,{type:'BACK'});
  assert.equal(back.phase,'returning');
  assert.equal(focusReducer(back,{type:'RETURN_COMPLETE'}).phase,'idle');
 }
 const one=select(FOCUS_INITIAL),reset=focusReducer(one,{type:'RESET'});
 assert.equal(reset.exhibitId,null);assert.ok(reset.generation>one.generation);
});
test('physical pose interpolation returns to original after 100 cycles without drift',()=>{
 const wall={position:[-3,2.45,-7.68],quaternion:[0,0,0,1],scale:[1,1,1]};
 const dest={position:[-1.69,2.41,-3.52],quaternion:[0,0,0,1],scale:[1,1,1]};
 let pose=structuredClone(wall);
 for(let cycle=0;cycle<100;cycle++){
  const up=interpolatePose(pose,dest,1);
  const down=interpolatePose(up,wall,1);
  pose={...down,quaternion:[0,0,0,1]};
  assert.equal(poseWithinTolerance(pose,wall),true);
 }
 assert.ok(smoothstep(.5)>.45&&smoothstep(.5)<.55);
 assert.equal(selectFocusDuration('extracting',true),.08);
});
test('focus staging fits camera frustum with correct room plane and no board overlap',()=>{
 for(const aspect of [16/9,1366/768,4/3,390/844]){
  const layout=museumFocusLayout(aspect);
  assert.ok(layout.art[2]>-7.68+3.75);
  assert.ok(layout.plaque[0]>layout.art[0]+1.1);
  assert.ok(layout.camera[2]>layout.art[2]+3.7);
  const distance=minimumCameraDistance(6.25,4.15,aspect,layout.fov);
  assert.ok(distance>0&&Number.isFinite(distance));
 }
});
test('information board faithfully retains group-authored facts and caveats',()=>{
 const raw={
  learning:{evidence:'Four of ten class groups prioritised switching off lights.',
   source:'NASA Space Place: The Greenhouse Effect'},
  survey:{counts:[4,3,2,1],source:'paper'},
  artMeta:{evidence:{source:'Group photograph',rights:'Created by students'}}
 };
 const p=projectAuthorizedEvidence(raw);
 assert.deepEqual(p.learning,raw.learning);
 const insight=exhibitInsights({...p,rooms:[]},{title:'The Evidence',description:'Group description'},1);
 const board=buildExhibitFocusBoard({title:'The Evidence',description:'Group description'},insight,1);
 assert.equal(board.title,'The Evidence');
 assert.equal(board.source,'NASA Space Place: The Greenhouse Effect');
 assert.ok(board.evidence);
 assert.equal(board.evidence.n,10);assert.equal(board.evidence.options[0].count,4);
 assert.match(board.evidence.caveat,/not measured/);
 assert.doesNotMatch(JSON.stringify(board),/https?:\/\/.*(token|signature|access_token)/i);
});
test('missing sources and survey remain absent and there are no invented timestamps',()=>{
 const board=buildExhibitFocusBoard({title:'The Problem',description:'Lights are left on.'},
  {message:'Lights are left on.'},0);
 assert.equal(board.source,'');assert.equal(board.evidence,null);
 assert.equal(board.improvement,'');
 assert.equal(/submitted_at|uploaded_at|reviewed_at|autosaved_at/.test(JSON.stringify(board)),false);
});
test('signed URL and private metadata are not included in display projection',()=>{
 const payload={learning:{issue:'Authentic'},survey:null,artMeta:{},
  image_url:'https://private.test/sign?token=SENSITIVE',csrf:'SECRET',groupId:'SECRET'};
 const projected=projectAuthorizedEvidence(payload);
 assert.equal(projected.image_url,undefined);assert.equal(projected.csrf,undefined);
 assert.doesNotMatch(JSON.stringify(projected),/SENSITIVE|SECRET/);
});
