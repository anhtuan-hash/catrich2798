import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FOCUS_IDLE,focusReducer,focusLayout,clampDelta,smoothstep,blendPose,nearlyEqualPose}
 from '../src/features/immersive-gallery/v3/museumExhibitFocusMotion.js';
import {buildExhibitFocusBoard,excerptSentences} from '../src/features/immersive-gallery/v3/museumExhibitFocusData.js';

const evolve=(s,type,extra={})=>focusReducer(s,{type,generation:s.generation,...extra});
test('V5 complete physical focus state sequence and original generation',()=>{
 let s=FOCUS_IDLE;
 s=evolve(s,'SELECT',{exhibitId:'art-1',roomId:'room-1'});
 assert.equal(s.phase,'preparing');
 const duplicate=evolve(s,'SELECT',{exhibitId:'art-2'});
 assert.strictEqual(duplicate,s);
 s=evolve(s,'ASSET_READY');assert.equal(s.phase,'extracting');
 s=evolve(s,'PRESENTING');assert.equal(s.phase,'presenting');
 s=evolve(s,'ARRIVED');assert.equal(s.phase,'focused');
 s=evolve(s,'BACK');assert.equal(s.phase,'returning');
 s=evolve(s,'RETURN_COMPLETE');
 assert.deepEqual({...s,generation:0},FOCUS_IDLE);
 assert.equal(s.exhibitId,null);
});
test('V5 cancellation works in every active phase',()=>{
 for(const phase of ['preparing','extracting','presenting','focused']){
  let s=evolve(FOCUS_IDLE,'SELECT',{exhibitId:'same',roomId:'r'});
  if(phase!=='preparing')s=evolve(s,'ASSET_READY');
  if(['presenting','focused'].includes(phase))s=evolve(s,'PRESENTING');
  if(phase==='focused')s=evolve(s,'ARRIVED');
  assert.equal(s.phase,phase);
  s=evolve(s,'BACK');
  assert.equal(s.phase,'returning');
  s=evolve(s,'RETURN_COMPLETE');
  assert.equal(s.phase,'idle');
 }
});
test('No stale phase completion can act after reset/room change',()=>{
 const s=evolve(FOCUS_IDLE,'SELECT',{exhibitId:'old'});
 const generation=s.generation;
 const cleared=evolve(s,'RESET');
 assert.equal(cleared.phase,'idle');
 assert.equal(focusReducer(cleared,{type:'ARRIVED',generation}).phase,'idle');
 assert.equal(cleared.exhibitId,null);
});
test('100 reversible cycles retain wall pose at 1e-3 and finite transform',()=>{
 const wall={position:[-3,2.45,-7.68],scale:[1,1,1]};
 const focus={position:[-1.7,2.47,-3.56],scale:[1,1,1]};
 let current={...wall};
 for(let i=0;i<100;i++){
  current=blendPose(wall,focus,1);
  assert.ok(current.position[2]-wall.position[2]>3.8);
  current=blendPose(wall,focus,0);
  assert.ok(nearlyEqualPose(current,wall));
 }
 for(const v of [0,.1,.3,.5,.9,1])assert.ok(Number.isFinite(smoothstep(v)));
});
test('V5 responsive layout positions stage in the same room without overlap',()=>{
 const desktop=focusLayout(1536,864),tablet=focusLayout(1024,768),mobile=focusLayout(390,844);
 assert.equal(desktop.artworkScale,1);
 assert.equal(mobile.artworkScale,.66);
 assert.equal(mobile.boardScale,.62);
 assert.ok(mobile.pedestalScale<1);
 // Mobile paintings and plaques must have separate world-space extents.
 // Effective half-widths: poster 2.63*artworkScale/2, plaque 2.63*boardScale/2.
 assert.ok(mobile.board[0]-mobile.artwork[0]>
   (2.63*mobile.artworkScale+2.63*mobile.boardScale)/2+.25);
 for(const lay of [desktop,tablet,mobile]){
  assert.ok(lay.artwork[2]>-7.6&&lay.artwork[2]<0);
  assert.ok(lay.board[2]>-7.6&&lay.board[2]<0);
  assert.ok(lay.camera[2]>lay.artwork[2]+2.5);
  assert.ok(lay.board[0]>lay.artwork[0]);
 }
});
test('Evidence plaque preserves actual recorded N, vote ratios, source and caveats',()=>{
 const gallery={
  learning:{evidence:'Four of ten class groups prioritised switching off unused lights.',
   source:'NASA Science. The Causes of Climate Change.'},
  survey:{counts:[2,4,3,1],source:'paper'},artMeta:{evidence:{source:'Original class image',rights:'School classroom use'}}
 };
 const board=buildExhibitFocusBoard(gallery,{title:'The Evidence',description:'Group survey.'},1);
 assert.equal(board.title,'The Evidence');
 assert.equal(board.survey.n,10);
 assert.equal(board.survey.options[1].count,4);
 assert.equal(board.survey.options[1].percent,40);
 assert.match(board.survey.caveat,/not measurements/);
 assert.equal(board.source,'NASA Science. The Causes of Climate Change.');
 assert.equal(board.imageSource,'Original class image');
 assert.ok(!JSON.stringify(board).includes('created_at'));
});
test('No evidence is fabricated and private signed media is omitted from plaque DTO',()=>{
 const exhibit={title:'The Problem',image_url:'https://private.invalid/media?token=secret',
  asset_id:'sensitive',description:'The room still has lights on.'};
 const board=buildExhibitFocusBoard({},exhibit,0);
 assert.equal(board.source,'Source not provided');
 assert.equal(board.survey,null);
 assert.ok(!JSON.stringify(board).includes('private.invalid'));
 assert.ok(!JSON.stringify(board).includes('sensitive'));
 assert.ok(!JSON.stringify(board).includes('token='));
});
test('Long exhibition text offers a faithful excerpt and full preserved text',()=>{
 const raw='The groups compared their classroom priorities. '.repeat(20);
 const preview=excerptSentences(raw,120);
 assert.equal(preview.hasMore,true);
 assert.ok(preview.excerpt.length<=121);
 assert.ok(raw.includes(preview.excerpt.replace(/…$/,'')));
});
test('Source contracts preserve fallback only outside the Cinema 3D focus path',()=>{
 const scene=fs.readFileSync('src/features/immersive-gallery/v3/MuseumScene.jsx','utf8');
 const canvas=fs.readFileSync('src/features/immersive-gallery/GalleryCanvasR3F.jsx','utf8');
 const rig=fs.readFileSync('src/features/immersive-gallery/v3/MuseumExhibitFocusRig.jsx','utf8');
 assert.match(scene,/selected&&!\(cinema&&threeD\)/);
 assert.match(scene,/dispatchFocus\(\{type:'SELECT'/);
 assert.match(canvas,/PaperArtwork/);
 assert.match(canvas,/ref=\{ref\} name=\{'BML_OriginalArtwork_'/);
 assert.match(canvas,/position\.set\(/);
 assert.match(canvas,/quaternion\.copy\(/);
 assert.match(canvas,/RETURN_COMPLETE/);
 // Desktop uses true CSS3D board perspective; portrait mobile uses a
 // 2D DOM projection of the SAME world-anchored 3D board to prevent text collapse.
 assert.match(rig,/Html transform=\{size\.width>=650\} center/);
 assert.match(rig,/position=\{\[0,0,\.114\]\}/);
 assert.doesNotMatch(rig,/position:\s*fixed/);
 assert.match(rig,/data-testid="museum-focus-stage"/);
 assert.match(rig,/data-testid="museum-back-to-wall"/);
 assert.doesNotMatch(rig,/<Canvas/);
 assert.doesNotMatch(rig,/dangerouslySetInnerHTML/);
});

test('V5 physical elapsed-time step remains bounded yet catches up on slow WebGL frames',()=>{
 assert.equal(clampDelta(.016),.016);
 assert.equal(clampDelta(.7),.25);
 assert.equal(clampDelta(-4),0);
 let progress=0;
 for(let frame=0;frame<5;frame++)progress=Math.min(1,progress+clampDelta(.7)/1.03);
 assert.equal(progress,1);
});
