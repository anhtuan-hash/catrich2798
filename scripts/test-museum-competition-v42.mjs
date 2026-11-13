import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LIVE_STAGES,LIVE_TOTAL_MINUTES,LIVE_PERIOD_MINUTES} from '../src/features/immersive-gallery/v3/liveLesson.js';
import {VOICEOVER_SCRIPTS,VIDEO_TASK_SUGGESTIONS,MICRO_CHALLENGES,MICRO_STAGE_INDEXES,
 validMicroAnswer,extractYouTubeVideoId,videoTaskFor} from '../src/features/immersive-gallery/v3/museumLiveExtensions.js';
const load=path=>fs.readFileSync(path,'utf8');
test('two-period 90-minute curriculum is retained and all eleven stages have real teacher narration and media prompts',()=>{
 assert.equal(LIVE_STAGES.length,11);assert.deepEqual(LIVE_PERIOD_MINUTES,[45,45]);assert.equal(LIVE_TOTAL_MINUTES,90);
 for(const stage of LIVE_STAGES){
  assert.ok(VOICEOVER_SCRIPTS[stage.id]?.length>60,'Missing voiceover '+stage.id);
  assert.ok(VIDEO_TASK_SUGGESTIONS[stage.id]?.length>12,'Missing video task '+stage.id);
 }
});
test('six extra short group challenges require an English reason and never assert class data',()=>{
 assert.deepEqual([...MICRO_STAGE_INDEXES].sort((a,b)=>a-b),[3,4,5,6,8,9]);
 for(const idx of MICRO_STAGE_INDEXES){
  const task=MICRO_CHALLENGES[idx];
  assert.equal(task.options.length,3);
  assert.ok(Number.isInteger(task.answer));
  assert.ok(validMicroAnswer(idx,{choice:task.answer,reason:'This uses a checkable source in our evidence.'}));
  assert.equal(validMicroAnswer(idx,{choice:task.answer,reason:'yes'}),false);
  assert.equal(validMicroAnswer(idx,{choice:9,reason:'This reason has enough characters.'}),false);
 }
 assert.equal(validMicroAnswer(2,{choice:0,reason:'Not part of the survey.'}),false);
});
test('YouTube IDs are strictly host allow-listed, no arbitrarily embeddable URL',()=>{
 const id='jNQXAC9IVRw';
 for(const url of [id,'https://youtu.be/'+id,'https://www.youtube.com/watch?v='+id,
  'https://www.youtube.com/shorts/'+id,'https://www.youtube-nocookie.com/embed/'+id]){
  assert.equal(extractYouTubeVideoId(url),id,url);
 }
 for(const url of ['javascript:alert(1)','https://evil.com/embed/'+id,
  'https://youtube.com.evil.net/watch?v='+id,'https://www.youtube.com/watch?v=%3Cscript%3E','https://youtu.be/invalid']){
  assert.equal(extractYouTubeVideoId(url),null,url);
 }
});
test('media tasks are bounded, predictable and do not expose unrelated stage videos',()=>{
 const board={3:{query:'school energy',instruction:'Name one source',videos:[{id:'jNQXAC9IVRw',title:'Trusted reference',channel:'Educator'}]},
  5:{query:'another topic',videos:[{id:'not-video',title:'Bad'}]}};
 assert.deepEqual(videoTaskFor(board,3),{query:'school energy',instruction:'Name one source',videos:[{id:'jNQXAC9IVRw',title:'Trusted reference',channel:'Educator'}]});
 assert.equal(videoTaskFor(board,2).videos.length,0);
 assert.equal(videoTaskFor(board,5).videos.length,0);
});
test('school-scoped video search uses Google API server-only and never HTML scraping or public raw key',()=>{
 const server=load('serverless-handlers/museum-live.js');
 const helper=load('serverless-handlers/_museumLiveMedia.js');
 assert.match(server,/guestContext\(req,admin,\{write:writing\}\)/);
 assert.match(server,/if\(op==='video-search'\)/);
 assert.match(server,/if\(!task\.query\)throw fail\(423/);
 assert.match(server,/searchThrottle\('group-'\+ctx\.group\.id\)/);
 assert.match(server,/if\(\['media-task','media-add','media-remove'\]\.includes\(op\)\)/);
 assert.match(helper,/process\.env\.YOUTUBE_API_KEY/);
 assert.match(helper,/videoEmbeddable:'true'/);
 assert.match(helper,/safeSearch:'strict'/);
 assert.doesNotMatch(helper,/youtube\.com\/results|ytInitialData|VITE_YOUTUBE_API_KEY/);
 assert.match(server,/version:session\.version\+1/);
});
test('student thinking evidence is write-gated and private; client cannot mutate other groups',()=>{
 const server=load('serverless-handlers/museum-live.js');
 const sql=load('supabase/migrations/20261113033000_museum_live_competition_lab_v42.sql');
 assert.match(server,/if\(op==='micro-submit'\)/);
 assert.match(server,/validMicroAnswer\(session\.stage_index,body\)/);
 assert.match(server,/group_id:ctx\.group\.id/);
 assert.match(server,/\.eq\('group_id',ctx\.group\.id\)/);
 assert.match(sql,/unique\(session_id,group_id,stage_index\)/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.museum_live_micro_responses from public,anon,authenticated/);
 assert.doesNotMatch(sql,/insert into public\.museum_live_micro_responses/);
});
test('voiceover and motion are optional and graceful; classroom controls and source library remain available',()=>{
 const teacher=load('src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx');
 const student=load('src/features/immersive-gallery/v3/MuseumLiveStudent.jsx');
 const voice=load('src/features/immersive-gallery/v3/MuseumVoiceover.jsx');
 const css=load('src/features/immersive-gallery/v3/museumLiveCompetition.css');
 assert.match(teacher,/MuseumVoiceover/);assert.match(student,/MuseumVoiceover/);
 assert.match(teacher,/MuseumVideoLab/);assert.match(student,/MuseumVideoLab/);
 assert.match(teacher,/MuseumResourceHub/);assert.match(student,/MuseumResourceHub/);
 assert.match(teacher,/motionOn\?' bml-motion-on'/);
 assert.match(teacher,/key=\{currentIndex\}/);
 assert.match(voice,/SpeechSynthesisUtterance/);
 assert.match(voice,/onend=/);assert.match(voice,/stop\(\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/bml-stage-enter/);
 assert.match(css,/bml-paper-breathe/);
});
