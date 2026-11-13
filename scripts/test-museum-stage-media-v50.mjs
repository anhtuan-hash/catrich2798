import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stageMediaTools,videoTaskFor} from '../src/features/immersive-gallery/v3/museumLiveExtensions.js';
import {mediaBoardUpdate,mediaTask} from '../serverless-handlers/_museumLiveMedia.js';

const session=(board,stageIndex=1,extra={})=>({
 status:'active',stageOpen:true,stage_index:stageIndex,
 media_board:board,media:videoTaskFor(board,stageIndex),...extra
});

test('nothing is shown before the teacher assigns audio or video',()=>{
 assert.deepEqual(stageMediaTools(session({})),{video:false,voice:false});
 assert.deepEqual(stageMediaTools({status:'not_started'}),{video:false,voice:false});
});

test('a research assignment appears only on its assigned, open activity',()=>{
 const board=mediaBoardUpdate({media_board:{}},1,{query:'NASA school climate evidence',instruction:'Verify a source.'});
 assert.equal(stageMediaTools(session(board,1)).video,true);
 assert.equal(stageMediaTools(session(board,0)).video,false);
 assert.equal(stageMediaTools(session(board,2)).video,false);
 assert.equal(stageMediaTools(session(board,1,{stageOpen:false})).video,false);
 assert.equal(stageMediaTools(session(board,1,{status:'paused'})).video,false);
 assert.equal(mediaTask({media_board:board,stage_index:1}).query,'NASA school climate evidence');
});

test('an approved YouTube URL works without a search task or YouTube API',()=>{
 const board=mediaBoardUpdate({media_board:{}},4,{videos:[{id:'dQw4w9WgXcQ',title:'Teacher-selected source'}]});
 assert.equal(stageMediaTools(session(board,4)).video,true);
 assert.equal(stageMediaTools(session(board,3)).video,false);
});

test('voiceover permission is stage-specific and survives video updates',()=>{
 const board1=mediaBoardUpdate({media_board:{}},1,{voiceEnabled:true});
 assert.equal(stageMediaTools(session(board1,1)).voice,true);
 assert.equal(stageMediaTools(session(board1,0)).voice,false);
 assert.equal(stageMediaTools(session(board1,1,{stageOpen:false})).voice,false);
 const board2=mediaBoardUpdate({media_board:board1},1,{query:'Climate action student research'});
 assert.equal(videoTaskFor(board2,1).voiceEnabled,true);
 const board3=mediaBoardUpdate({media_board:board2},1,{voiceEnabled:false});
 assert.equal(stageMediaTools(session(board3,1)).voice,false);
 assert.equal(stageMediaTools(session(board3,1)).video,true);
});

test('student rail and nested panels use the same availability gate',()=>{
 const rail=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabStudent.jsx','utf8');
 const live=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLiveStudent.jsx','utf8');
 const video=fs.readFileSync('src/features/immersive-gallery/v3/MuseumVideoLab.jsx','utf8');
 const teacher=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx','utf8');
 const api=fs.readFileSync('serverless-handlers/museum-live.js','utf8');
 assert.match(rail,/studentMedia\.voice\?<button/);
 assert.match(rail,/studentMedia\.video\?<button/);
 assert.match(live,/activeTool!=='video'\|\|hasVideo/);
 assert.match(live,/activeTool!=='voice'\|\|hasVoice/);
 assert.match(video,/Assign video to this activity/);
 assert.match(video,/latest\.session\.version/);
 assert.match(teacher,/shareNarration/);
 assert.match(api,/media-voice/);
});
