import assert from 'node:assert/strict';
import {G11_GRAMMAR_MCQS,G11_GRAMMAR_UNITS} from '../src/components/BrianBombArena/arenaG11Grammar100.js';
import {G11_UNIT_PACKS,G11_TOTAL_ITEMS} from '../src/components/BrianBombArena/arenaG11UnitPacks.js';
import {SAMPLE_PACKS,getSamplePack,packToText,parseArenaQuestions} from '../src/components/BrianBombArena/arenaSamplePacks.js';
import {createArena,arenaReducer} from '../src/components/BrianBombArena/arenaEngine.js';
const pack=getSamplePack('g11-grammar-unit-1-100');
assert.equal(G11_GRAMMAR_UNITS.length,10);
assert.equal(G11_GRAMMAR_MCQS.length,100);
assert.equal(pack.count,100);
assert.equal(SAMPLE_PACKS.length,13);
assert.equal(SAMPLE_PACKS.reduce((n,p)=>n+p.count,0),1108);
assert.equal(G11_TOTAL_ITEMS,1000);
assert.equal(G11_UNIT_PACKS.length,10);
assert.equal(new Set(G11_GRAMMAR_MCQS.map(q=>q.prompt)).size,100);
for(let u=1;u<=10;u++){
 const qs=G11_UNIT_PACKS[u-1].items;
 assert.equal(qs.length,100,'Unit '+u+' must contain exactly 100 MCQs');
 assert.equal(new Set(qs.map(q=>q.prompt)).size,100);
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
console.log('PASS: 10 independent banks × 100 contextualised MCQs, 1,000 questions total; keys and Question Gate.');
