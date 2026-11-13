import test from 'node:test';
import assert from 'node:assert/strict';
import {LIVE_STAGES,LEGACY_LANGUAGE_MINI_LESSON,VIDEO_QUESTION_VERSION,sessionStage,validResponse,summarizeResponses,LIVE_TOTAL_MINUTES,LIVE_PERIOD_MINUTES} from '../src/features/immersive-gallery/v3/liveLesson.js';
import {MUSEUM_CURRICULUM_VIDEOS} from '../src/features/immersive-gallery/v3/museumLiveExtensions.js';

test('the original two 45-minute periods and NASA clip positions remain fixed',()=>{
 assert.equal(LIVE_STAGES.length,11);
 assert.equal(LIVE_TOTAL_MINUTES,90);
 assert.deepEqual(LIVE_PERIOD_MINUTES,[45,45]);
 assert.equal(MUSEUM_CURRICULUM_VIDEOS[1].id,'SN5-DnOHQmE');
 assert.equal(MUSEUM_CURRICULUM_VIDEOS[3].id,'TUinL0C_zgE');
});
test('Activity 2: authentic NASA science and English cause–result; one answer per question',()=>{
 const stage=LIVE_STAGES[1];
 assert.equal(stage.kind,'quiz');
 assert.equal(stage.questions.length,3);
 assert.deepEqual(stage.questions.map(q=>q.answer),[1,0,1]);
 assert.match(stage.questions[0].q,/atmosphere|surrounds Earth/i);
 assert.match(stage.questions[1].q,/carbon dioxide/i);
 assert.match(stage.questions[2].q,/NASA/i);
 assert.equal(validResponse(1,[1,0,1]),true);
 assert.equal(validResponse(1,[1,0]),false);
 assert.equal(validResponse(1,[1,5,1]),false);
 const report=summarizeResponses(1,[{value:[1,0,1]},{value:[0,1,1]}]);
 assert.equal(report.n,2);
 assert.deepEqual(report.questions.map(x=>x.correct),[1,1,2]);
});
test('Activity 4: group still creates the museum after its persisted NASA listening quiz',()=>{
 const stage=LIVE_STAGES[3];
 assert.equal(stage.kind,'group');
 assert.equal(stage.videoQuestions.length,3);
 assert.deepEqual(stage.videoQuestions.map(q=>q.answer),[0,1,2]);
 assert.match(stage.videoQuestions[0].q,/global warming/i);
 assert.match(stage.videoQuestions[1].q,/climate change/i);
 assert.match(stage.videoQuestions[2].q,/NASA/i);
 assert.equal(validResponse(3,[0,1,2]),true);
 assert.equal(validResponse(3,[0,1,2,0]),false);
 assert.equal(validResponse(3,[0,1,7]),false);
 const report=summarizeResponses(3,[{value:[0,1,2]},{value:[0,0,0]}]);
 assert.equal(report.n,2);
 assert.deepEqual(report.questions.map(x=>x.correct),[2,1,1]);
});
test('sessions already in progress keep their original Activity 2 grading key',()=>{
 const oldSession={stage_index:1,media_board:{'1':{videos:[]}}};
 const newSession={stage_index:1,media_board:{lessonQuestionVersion:VIDEO_QUESTION_VERSION}};
 assert.equal(sessionStage(oldSession).questions[0].answer,0);
 assert.equal(sessionStage(oldSession),LEGACY_LANGUAGE_MINI_LESSON);
 assert.equal(sessionStage(newSession).questions[0].answer,1);
 assert.equal(validResponse(1,[0,1,1],sessionStage(oldSession)),true);
 assert.deepEqual(summarizeResponses(1,[{value:[0,1,1]}],sessionStage(oldSession)).questions.map(q=>q.correct),[1,1,1]);
});
