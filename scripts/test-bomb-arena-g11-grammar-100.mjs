import assert from 'node:assert/strict';
import {G11_GRAMMAR_MCQS,G11_GRAMMAR_UNITS} from '../src/components/BrianBombArena/arenaG11Grammar100.js';
import {SAMPLE_PACKS,getSamplePack,packToText,parseArenaQuestions} from '../src/components/BrianBombArena/arenaSamplePacks.js';
import {createArena,arenaReducer} from '../src/components/BrianBombArena/arenaEngine.js';
const pack=getSamplePack('g11-global-success-grammar-100');
assert.equal(G11_GRAMMAR_UNITS.length,10);
assert.equal(G11_GRAMMAR_MCQS.length,100);
assert.equal(pack.count,100);
assert.equal(SAMPLE_PACKS.length,4);
assert.equal(SAMPLE_PACKS.reduce((n,p)=>n+p.count,0),208);
assert.equal(new Set(G11_GRAMMAR_MCQS.map(q=>q.prompt)).size,100);
for(let u=1;u<=10;u++){
 const qs=G11_GRAMMAR_MCQS.filter(q=>q.unit===u);
 assert.equal(qs.length,10,'Unit '+u+' must contain exactly 10 MCQs');
 for(const q of qs){
   assert.equal(q.options.length,4);
   assert.ok(q.answerIndex>=0&&q.answerIndex<4);
   assert.equal(q.answer,q.options[q.answerIndex]);
   assert.ok(q.prompt.length>15&&q.explanation.length>10);
   assert.equal(new Set(q.options.map(x=>x.toLowerCase())).size,4);
 }
}
assert.equal(parseArenaQuestions(packToText(pack)).length,100);
const game=createArena({ownerId:'teacher',mode:'challenge',size:5,teamCount:4,questions:pack.items});
assert.equal(game.questions.length,100);
assert.equal(game.questions[0].options.length,4);
assert.equal(game.questions[0].answerIndex,1);
assert.ok(game.questions[0].explanation.includes('Past simple'));
let state=arenaReducer(game,{type:'START'});
const tile=state.tiles.find(t=>t.event!=='blocked');
state=arenaReducer(state,{type:'SELECT',index:tile.id});
assert.equal(state.selectedTile,tile.id);
const solved=arenaReducer(state,{type:'ANSWER',correct:true});
assert.equal(solved.tiles[tile.id].opened,true);
const failed=arenaReducer(state,{type:'ANSWER',correct:false});
assert.equal(failed.tiles[tile.id].opened,false);
console.log('PASS: 100 unique MCQs, 10 per Unit, 4 distinct options, correct keys and Question Gate.');
