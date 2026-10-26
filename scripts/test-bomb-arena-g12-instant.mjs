import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {G12_UNIT_PACKS,G12_TOTAL_ITEMS} from '../src/components/BrianBombArena/arenaG12UnitPacks.js';
import {SAMPLE_PACKS,getSamplePack,packToText,parseArenaQuestions} from '../src/components/BrianBombArena/arenaSamplePacks.js';
import {createArena,arenaReducer} from '../src/components/BrianBombArena/arenaEngine.js';
const check=(title,fn)=>{fn();console.log('✓ '+title);};
check('Grade 12 has 10 distinct 100-question banks with 1,000 unique prompts',()=>{
 assert.equal(G12_UNIT_PACKS.length,10);assert.equal(G12_TOTAL_ITEMS,1000);
 assert.equal(SAMPLE_PACKS.length,23);
 assert.equal(SAMPLE_PACKS.reduce((sum,p)=>sum+p.count,0),2108);
 const seen=new Set();
 for(let u=1;u<=10;u++){
   const bank=G12_UNIT_PACKS[u-1];
   assert.equal(bank.grade,12);assert.equal(bank.count,100);
   assert.equal(bank.id,'g12-grammar-unit-'+u+'-100');
   assert.equal(getSamplePack(bank.id).count,100);
   assert.equal(parseArenaQuestions(packToText(bank)).length,100);
   for(const q of bank.items){
     assert.equal(q.grade,12);assert.equal(q.unit,u);
     assert.equal(q.options.length,4);
     assert.ok(Number.isInteger(q.answerIndex)&&q.answerIndex>=0&&q.answerIndex<=3);
     assert.equal(q.options[q.answerIndex],q.answer);
     assert.equal(new Set(q.options.map(x=>x.toLowerCase())).size,4);
     assert.ok(q.explanation.length>18);
     assert.ok(q.prompt.includes('___')||q.prompt.startsWith('Identify the sentence type:'));
     assert.ok(!seen.has(q.prompt),q.id+' duplicate prompt');
     seen.add(q.prompt);
   }
 }
 assert.equal(seen.size,1000);
});
const newGame=(mode='luck')=>{
 const pack=G12_UNIT_PACKS[0];
 return arenaReducer(createArena({ownerId:'teacher',mode,questionGate:true,questions:pack.items,teamCount:2}),{type:'START'});
};
check('Tap on a correct option awards +20 directly and shows a point tile',()=>{
 let s=newGame('classic');
 const tile=s.tiles.find(t=>t.event!=='blocked');
 s=arenaReducer(s,{type:'SELECT',index:tile.id});
 const correct=s.questions[0].answerIndex;
 const result=arenaReducer(s,{type:'ANSWER_CHOICE',choice:correct});
 assert.equal(result.teams[0].score,20);
 assert.equal(result.tiles[tile.id].event,'points20');
 assert.equal(result.tiles[tile.id].opened,true);
 assert.equal(result.last.grade,'correct');
 assert.equal(result.last.points,20);
 assert.equal(result.turn,1);
 assert.equal(arenaReducer(result,{type:'ANSWER_CHOICE',choice:correct}),result);
});
check('Tap on a wrong option causes bomb, subtracts 20 and advances turn',()=>{
 let s=newGame('classic');s.teams[0].score=65;
 const tile=s.tiles.find(t=>t.event!=='blocked');s=arenaReducer(s,{type:'SELECT',index:tile.id});
 const wrong=(s.questions[0].answerIndex+1)%4;
 const result=arenaReducer(s,{type:'ANSWER_CHOICE',choice:wrong});
 assert.equal(result.teams[0].score,45);
 assert.equal(result.tiles[tile.id].event,'bomb');
 assert.equal(result.last.grade,'incorrect');assert.equal(result.last.points,-20);
 assert.equal(result.turn,1);
});
check('Press Your Luck: correct earns 20 POT; wrong loses POT and deducts secured 20',()=>{
 let s=newGame('luck');s.teams[0].score=80;
 let tile=s.tiles.find(t=>t.event!=='blocked');
 s=arenaReducer(s,{type:'SELECT',index:tile.id});
 s=arenaReducer(s,{type:'ANSWER_CHOICE',choice:s.questions[0].answerIndex});
 assert.equal(s.teams[0].bank,20);assert.equal(s.teams[0].score,80);assert.equal(s.turn,0);
 tile=s.tiles.find(t=>!t.opened&&t.event!=='blocked');
 s=arenaReducer(s,{type:'SELECT',index:tile.id});
 s=arenaReducer(s,{type:'ANSWER_CHOICE',choice:(s.questions[1].answerIndex+1)%4});
 assert.equal(s.teams[0].bank,0);assert.equal(s.teams[0].score,60);
 assert.equal(s.turn,1);
});
check('Failing a question at score zero floors at zero; invalid answers are rejected',()=>{
 let s=newGame();const tile=s.tiles.find(t=>t.event!=='blocked');
 s=arenaReducer(s,{type:'SELECT',index:tile.id});
 assert.equal(arenaReducer(s,{type:'ANSWER_CHOICE',choice:4}),s);
 assert.equal(arenaReducer(s,{type:'ANSWER_CHOICE',choice:-1}),s);
 const wrong=(s.questions[0].answerIndex+1)%4;
 assert.equal(arenaReducer(s,{type:'ANSWER_CHOICE',choice:wrong}).teams[0].score,0);
});
check('Interactive UI handles answer taps without a Submit button and shows fireworks/bomb feedback',()=>{
 const ui=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.jsx',import.meta.url),'utf8');
 const fx=readFileSync(new URL('../src/components/BrianBombArena/ArenaEffects.jsx',import.meta.url),'utf8');
 assert.match(ui,/onClick=\{\(\)=>answerChoice\(index\)\}/);
 assert.match(ui,/answerTapLockRef\.current=true/);
 assert.match(ui,/type:'ANSWER_CHOICE'/);
 assert.ok(!ui.includes('Xác nhận đáp án'));
 assert.match(ui,/showFx\('points',20,tileId,'correct'\)/);
 assert.match(ui,/showFx\('bomb',-20,tileId,'incorrect'\)/);
 assert.match(fx,/CHÍNH XÁC!/);assert.match(fx,/SAI RỒI!/);
});
console.log('PASS: 10×100 Grade 12 grammar MCQs and instant scoring with bomb/fireworks.');
