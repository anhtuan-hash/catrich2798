import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createFamilyFeud,feudReducer,validateFeudBank,currentFeudBoard,
  rankFeudTeams,importFeudCSV,exportFeudCSV,exportFeudResults
} from '../src/components/BrianFamilyFeud/familyFeudEngine.js';
import {FAMILY_FEUD_BANK} from '../src/components/BrianFamilyFeud/familyFeudBank.js';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const check=(title,run)=>{run();console.log('✓ '+title);};
const mk=(options={})=>createFamilyFeud({
 ownerId:'teacher-123',bank:FAMILY_FEUD_BANK,
 teamCount:4,teamNames:['Team A','Team B','Team C','Team D'],roundLimit:5,...options,
});
const doAction=(game,type,more={})=>feudReducer(game,{type,...more});
const start=game=>doAction(game,'START_ROUND');
const reveal=(game,index)=>doAction(game,'REVEAL',{index});
const fail=game=>doAction(game,'STRIKE');
const finish=game=>doAction(game,'END_ROUND');
const strikeToSteal=game=>fail(fail(fail(game)));
check('30 original question boards, each 6 distinct answers worth exactly 100 points',()=>{
 assert.equal(FAMILY_FEUD_BANK.length,30);
 const prompts=new Set();
 for(const board of FAMILY_FEUD_BANK){
  assert.ok(!prompts.has(board.prompt));prompts.add(board.prompt);
  assert.equal(board.answers.length,6);
  assert.equal(new Set(board.answers.map(a=>a.text.toLowerCase())).size,6);
  assert.equal(board.answers.reduce((n,a)=>n+a.points,0),100);
 }
 assert.equal(FAMILY_FEUD_BANK.filter(q=>q.category.startsWith('English 10')).length,10);
 assert.equal(FAMILY_FEUD_BANK.filter(q=>q.category.startsWith('English 11')).length,10);
 assert.equal(FAMILY_FEUD_BANK.filter(q=>q.category.startsWith('English 12')).length,10);
});
check('2–6 teams and independent Grade 10–12 bank selection',()=>{
 for(const n of [2,3,4,5,6]){
  const game=mk({teamCount:n});
  assert.equal(game.teams.length,n);
  assert.equal(game.roundLimit,5);
  assert.equal(game.teams[0].name,'Team A');
 }
 const grade11=FAMILY_FEUD_BANK.filter(q=>q.category.startsWith('English 11'));
 assert.equal(validateFeudBank(grade11).length,10);
 assert.equal(createFamilyFeud({bank:grade11,teamCount:3,roundLimit:8}).roundLimit,8);
});
check('Host chooses controlling team before round; cannot change controller while playing',()=>{
 let g=mk();
 g=doAction(g,'SET_CONTROLLER',{index:2});
 assert.equal(g.controller,2);
 assert.equal(g.stealer,3);
 g=start(g);
 assert.equal(g.phase,'playing');
 assert.equal(doAction(g,'SET_CONTROLLER',{index:0}),g);
});
check('Reveal correct answer adds to the POT and never prematurely credits a team',()=>{
 let g=start(mk()),before=g;
 g=reveal(g,0);
 assert.equal(g.pointsPot,32);
 assert.equal(g.teams[0].score,0);
 assert.deepEqual(g.revealed,[0]);
 assert.equal(reveal(g,0),g,'Cannot reveal one answer twice');
 assert.equal(before.pointsPot,0,'Reducer does not mutate original state');
});
check('Three strikes open exactly one steal attempt',()=>{
 let g=strikeToSteal(start(mk()));
 assert.equal(g.phase,'steal');assert.equal(g.strikes,3);
 assert.equal(g.stealer,1);
 assert.equal(doAction(g,'STRIKE').phase,'round_done');
});
check('Successful steal awards all POT including the stolen answer to the opposing team',()=>{
 let g=start(mk());
 g=reveal(g,0);g=strikeToSteal(g);
 g=reveal(g,1);
 assert.equal(g.phase,'round_done');
 assert.equal(g.pointsPot,56);
 assert.equal(g.teams[1].score,56);
 assert.equal(g.teams[0].score,0);
 assert.equal(g.teams[1].roundWins,1);
 assert.equal(g.last.kind,'steal_success');
 assert.equal(reveal(g,2),g,'No extra settlement after steal');
});
check('Steal failure awards the pending POT to original controlling team',()=>{
 let g=reveal(start(mk()),2);
 g=strikeToSteal(g);
 g=doAction(g,'SET_STEALER',{index:3});
 assert.equal(g.stealer,3);
 g=fail(g);
 assert.equal(g.teams[0].score,17);
 assert.equal(g.teams[3].score,0);
 assert.equal(g.last.kind,'steal_failed');
});
check('All six answers auto-settle and total 100, once only',()=>{
 let g=start(mk());
 for(let i=0;i<6;i++)g=reveal(g,i);
 assert.equal(g.phase,'round_done');
 assert.equal(g.teams[0].score,100);
 assert.equal(doAction(g,'END_ROUND'),g);
});
check('Manual end round credits POT once; Reveal All changes presentation only',()=>{
 let g=reveal(start(mk()),0);
 g=finish(g);
 assert.equal(g.teams[0].score,32);
 g=doAction(g,'SHOW_ALL');
 assert.equal(g.showAll,true);
 assert.equal(g.teams[0].score,32);
 assert.equal(doAction(g,'SHOW_ALL'),g);
});
check('Last rounds automatically apply x2 and x3 multipliers',()=>{
 let g=mk({roundLimit:3});
 g=finish(reveal(start(g),0));
 g=doAction(g,'NEXT_ROUND');
 assert.equal(g.multiplier,2);
 g=finish(reveal(start(g),0));
 assert.equal(g.pointsPot,70);
 g=doAction(g,'NEXT_ROUND');
 assert.equal(g.multiplier,3);
 g=finish(reveal(start(g),0));
 assert.equal(g.phase,'round_done');
 g=doAction(g,'NEXT_ROUND');
 assert.equal(g.phase,'finished');
});
check('Host can override multiplier before start but not during a round',()=>{
 let g=mk();g=doAction(g,'SET_MULTIPLIER',{value:3});
 assert.equal(g.multiplier,3);
 g=start(g);
 assert.equal(doAction(g,'SET_MULTIPLIER',{value:1}),g);
});
check('Undo and Redo restore revealed slots, strikes, score and settlement',()=>{
 let g=reveal(start(mk()),0);
 const award=finish(g);
 let undone=doAction(award,'UNDO');
 assert.equal(undone.phase,'playing');
 assert.equal(undone.teams[0].score,0);
 assert.equal(undone.pointsPot,32);
 const redone=doAction(undone,'REDO');
 assert.equal(redone.teams[0].score,32);
 assert.equal(redone.phase,'round_done');
});
check('Fast Money uses two contestants and two sets of five distinct answer choices',()=>{
 let g=doAction(mk(),'FINISH_GAME');
 g=doAction(g,'FAST_START',{team:2,now:100000});
 assert.equal(g.phase,'fast_money');assert.equal(g.fast.player,0);
 assert.equal(g.fast.questions.length,5);
 assert.equal(g.fast.dueAt,145000);
 for(let i=0;i<5;i++)g=doAction(g,'FAST_ANSWER',{index:0,now:101000+i});
 assert.equal(g.fast.player,1);assert.equal(g.fast.paused,true);
 assert.equal(g.fast.answers.length,5);
 assert.equal(g.phase,'fast_money');
 g=doAction(g,'FAST_RESUME',{now:200000});
 assert.equal(g.fast.dueAt,245000);
 assert.equal(doAction(g,'FAST_ANSWER',{index:0,now:201000}),g,'Player 2 cannot repeat player 1 answer');
 for(let i=0;i<5;i++)g=doAction(g,'FAST_ANSWER',{index:1,now:201000+i});
 assert.equal(g.phase,'fast_done');assert.equal(g.fast.settled,true);
 assert.ok(g.fast.points>=200);
 assert.equal(g.teams[2].score,g.fast.points);
 assert.equal(doAction(g,'FAST_FINISH'),g,'Cannot credit Fast Money bonus twice');
});
check('Fast Money timer: pause, resume and timeout each participant safely',()=>{
 let g=doAction(mk(),'FINISH_GAME');
 g=doAction(g,'FAST_START',{team:0,now:300000});
 g=doAction(g,'FAST_PAUSE',{now:305000});
 assert.equal(g.fast.remainingMs,40000);
 assert.equal(doAction(g,'FAST_TIMEOUT',{now:900000}),g);
 g=doAction(g,'FAST_RESUME',{now:900000});
 assert.equal(g.fast.dueAt,940000);
 assert.equal(doAction(g,'FAST_TIMEOUT',{now:939999}),g);
 g=doAction(g,'FAST_TIMEOUT',{now:940000});
 assert.equal(g.fast.player,1);assert.equal(g.fast.paused,true);
 g=doAction(g,'FAST_RESUME',{now:950000});
 g=doAction(g,'FAST_TIMEOUT',{now:995000});
 assert.equal(g.phase,'fast_done');assert.equal(g.fast.settled,true);
});
check('CSV export/import preserves answer commas, quotes, UTF-8 and numeric keys',()=>{
 const bank=FAMILY_FEUD_BANK.slice(0,5).map(board=>({
  ...board,answers:board.answers.map(answer=>({...answer}))
 }));
 bank[0].answers[0].text='Pack water, "reusable" bottles';
 const csv=exportFeudCSV(bank);
 assert.ok(csv.startsWith('\uFEFF'));
 const parsed=importFeudCSV(csv);
 assert.equal(parsed.length,5);
 assert.equal(parsed[0].answers[0].text,'Pack water, "reusable" bottles');
 assert.equal(parsed[0].answers.reduce((sum,a)=>sum+a.points,0),100);
 assert.match(exportFeudResults(mk()),/team,score,round_wins/);
});
check('Invalid bank content is rejected before starting a session',()=>{
 assert.throws(()=>validateFeudBank([{prompt:'Too short',answers:[]}]));
 const broken=JSON.parse(JSON.stringify(FAMILY_FEUD_BANK.slice(0,1)));
 broken[0].answers[0].points=99;
 assert.throws(()=>validateFeudBank(broken),/100/);
 const duplicates=JSON.parse(JSON.stringify(FAMILY_FEUD_BANK.slice(0,2)));
 duplicates[1].prompt=duplicates[0].prompt;
 assert.throws(()=>validateFeudBank(duplicates),/Duplicate/);
});
check('Bubble integration is independent from Bomb, Focus, Board and Instant Tools',()=>{
 const main=read('src/main.jsx'),ui=read('src/components/BrianFamilyFeud/BrianFamilyFeud.jsx');
 const css=read('src/components/BrianFamilyFeud/BrianFamilyFeud.css');
 const storage=read('src/components/BrianFamilyFeud/familyFeudStorage.js');
 assert.match(main,/lazy\(\(\) => import\('\.\/components\/BrianFamilyFeud\/BrianFamilyFeud\.jsx'\)\)/);
 assert.match(main,/<BrianFamilyFeud key=\{currentUser\.id\} currentUser=\{currentUser\} language=\{language\}\/>/);
 assert.match(main,/<BrianBombArena currentUser=\{currentUser\} language=\{language\}\/>/);
 assert.match(main,/<BrianFocus currentUser=\{currentUser\} language=\{language\} performance=\{resolvedPerformance\} \/>/);
 assert.match(main,/<BrianBoard currentUser=\{currentUser\} language=\{language\}\/>/);
 assert.match(ui,/readBubbleMotion\(\)/);
 assert.match(ui,/feudReducer\(prev,action\)/);
 assert.match(ui,/onClick=\{\(\)=>doReveal\(index\)\}/);
 assert.match(ui,/onClick=\{doStrike\}/);
 assert.match(ui,/FAST_START/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.bff-answer-tile/);
 assert.match(storage,/brian-family-feud-v1/);
 assert.ok(!storage.includes('brian-bomb-arena-v1'));
});
console.log('PASS: Brian Family Feud — 30 boards, 3 strikes, steal, multipliers, two-player Fast Money, CSV, undo and isolated bubble.');
