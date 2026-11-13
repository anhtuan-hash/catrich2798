import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MUSEUM_CURRICULUM_VIDEOS,curriculumMediaBoard,videoTaskFor,stageMediaTools} from '../src/features/immersive-gallery/v3/museumLiveExtensions.js';
const read=p=>fs.readFileSync(p,'utf8');

test('only two verified NASA clips are planned; both have a teaching purpose',()=>{
 const rows=Object.entries(MUSEUM_CURRICULUM_VIDEOS);
 assert.deepEqual(rows.map(([i])=>Number(i)),[1,3]);
 for(const [i,v] of rows){
  assert.match(v.source,/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/);
  assert.match(v.channel,/^NASA/);
  assert.ok(v.prompt.length>=45&&v.timing.length>=40);
  assert.equal(v.id.length,11);
 }
 const board=curriculumMediaBoard();
 assert.deepEqual(Object.keys(board),['1','3']);
 for(const [index,v] of rows){
  const task=videoTaskFor(board,Number(index));
  assert.equal(task.videos[0].id,v.id);
  assert.equal(task.voiceEnabled,false);
  assert.equal(stageMediaTools({status:'active',stageOpen:true,media:task}).video,true);
 }
 assert.equal(videoTaskFor(board,9).videos.length,0);
});

test('new lessons use curricular placements; existing sessions keep their own media choices',()=>{
 const api=read('serverless-handlers/museum-live.js');
 assert.match(api,/media_board:curriculumMediaBoard\(\)/);
 assert.match(api,/if\(!session\)\{/);
 assert.match(api,/mediaBoardUpdate\(session,index,patch\)/);
 assert.match(api,/videoTaskFor\(session\.media_board,index\)/);
});

test('the live peer room remains behind a scoped Creator Pass and CSRF guard',()=>{
 const api=read('serverless-handlers/museum-live.js');
 const peer=read('serverless-handlers/_museumLivePeer.js');
 assert.match(api,/guestContext\(req,admin,\{write:writing\}\)/);
 assert.match(api,/peer-room-toggle','peer-room-review/);
 assert.match(peer,/requirePeerStage\(session\)/);
 assert.match(peer,/room\.owner_group_id===ctx\.group\.id/);
 assert.match(peer,/ctx\.assignment\.id/);
 assert.match(peer,/\.eq\('session_id',session\.id\)/);
 assert.match(peer,/checkpointGallery\(admin/);
 assert.match(peer,/validatePeer\(body\.value\)/);
 assert.match(peer,/alreadySubmitted/);
 assert.doesNotMatch(peer,/service_role|process\.env|publicUrl|anonKey/);
});

test('SQL denies direct public access and protects reviews against cross-class spoofing',()=>{
 const sql=read('supabase/migrations/20261113150000_museum_live_peer_surveys_v51.sql');
 for(const name of ['museum_peer_live_rooms','museum_peer_live_feedback']){
  assert.match(sql,new RegExp('alter table public\\.'+name+' enable row level security'));
  assert.match(sql,new RegExp('revoke all on public\\.museum_peer_live_rooms,public\\.museum_peer_live_feedback from public,anon,authenticated'));
 }
 assert.match(sql,/unique\(session_id,owner_group_id\)/);
 assert.match(sql,/unique\(room_id,from_group_id\)/);
 assert.match(sql,/new\.from_group_id=r\.owner_group_id/);
 assert.match(sql,/reviewer_assignment is distinct from s\.assignment_id/);
 assert.match(sql,/s\.stage_index not between 7 and 9/);
});

test('Test step supports open, close, visit, review, feedback reuse, and an actual saved group response',()=>{
 const studio=read('src/features/immersive-gallery/v3/MuseumLabStudent.jsx');
 const ui=read('src/features/immersive-gallery/v3/MuseumLivePeerFeedback.jsx');
 assert.match(studio,/step===3/);
 assert.match(studio,/MuseumLivePeerFeedback csrf=\{session\.csrf\}/);
 assert.match(studio,/test(ed)?:true/);
 for(const action of ['peer-rooms','peer-room-toggle','peer-room-view','peer-room-review'])
  assert.ok(ui.includes("'"+action+"'"),'Missing operation '+action);
 assert.match(ui,/One response per group per exhibition/);
 assert.match(ui,/Use this as authentic peer evidence/);
 assert.match(ui,/Clarity \(1–4\)/);
 assert.match(ui,/role="dialog"/);
});
