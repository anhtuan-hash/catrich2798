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
check('Strike, steal and full reveal never auto-credit team scores',()=>{
 let g=strikeToSteal(start(mk()));
 assert.equal(g.phase,'steal');
 g=fail(g);
 assert.equal(g.phase,'round_scoring');
 assert.equal(g.teams[0].score,0);
 assert.equal(doAction(g,'NEXT_ROUND'),g,'Teacher score required');
 g=reveal(start(mk()),0);g=strikeToSteal(g);g=reveal(g,1);
 assert.equal(g.phase,'round_scoring');
 assert.equal(g.last.kind,'steal_success');
 assert.deepEqual(g.teams.map(t=>t.score),[0,0,0,0]);
 g=start(mk());
 for(let i=0;i<6;i++)g=reveal(g,i);
 assert.equal(g.phase,'round_scoring');
 assert.equal(g.teams[0].score,0);
});
check('Each team score is independently entered, and only confirmed once',()=>{
 let g=finish(reveal(start(mk()),0));
 assert.equal(g.phase,'round_scoring');
 g=doAction(g,'SET_ROUND_DRAFT',{index:0,value:'20'});
 g=doAction(g,'SET_ROUND_DRAFT',{index:1,value:'90'});
 g=doAction(g,'SET_ROUND_DRAFT',{index:2,value:'15'});
 assert.deepEqual(g.teams.map(t=>t.score),[0,0,0,0]);
 g=doAction(g,'SET_ROUND_DRAFT',{index:0,value:''});
 assert.equal(doAction(g,'SAVE_ROUND_SCORES'),g,'Blank input blocks confirmation');
 g=doAction(g,'SET_ROUND_DRAFT',{index:0,value:'20'});
 assert.equal(doAction(g,'SET_ROUND_DRAFT',{index:0,value:'-1'}),g);
 g=doAction(g,'SAVE_ROUND_SCORES');
 assert.equal(g.phase,'round_done');
 assert.deepEqual(g.teams.map(t=>t.score),[20,90,15,0]);
 assert.deepEqual(g.teams.map(t=>t.roundWins),[0,1,0,0]);
 assert.equal(doAction(g,'SAVE_ROUND_SCORES'),g,'No double count');
 assert.match(exportFeudResults(g),/round_1/);
 g=doAction(g,'EDIT_ROUND_SCORES');
 g=doAction(g,'SET_ROUND_DRAFT',{index:1,value:'35'});
 g=doAction(g,'SET_ROUND_DRAFT',{index:2,value:'70'});
 g=doAction(g,'SAVE_ROUND_SCORES');
 assert.deepEqual(g.teams.map(t=>t.score),[20,35,70,0]);
 assert.deepEqual(g.teams.map(t=>t.roundWins),[0,0,1,0]);
 g=doAction(g,'SHOW_ALL');
 assert.equal(g.showAll,true);
});
check('Multiplier remains a hint; rounds cannot advance before manual score confirmation',()=>{
 let g=mk({roundLimit:3});
 for(let round=0;round<3;round++){
  g=start(g);
  const suggested=currentFeudBoard(g).answers[0].points*g.multiplier;
  g=finish(reveal(g,0));
  assert.equal(g.pointsPot,suggested);
  assert.equal(g.phase,'round_scoring');
  assert.equal(doAction(g,'NEXT_ROUND'),g);
  g=doAction(g,'SET_ROUND_DRAFT',{index:round,value:String(round+11)});
  g=doAction(g,'SAVE_ROUND_SCORES');
  g=doAction(g,'NEXT_ROUND');
 }
 assert.equal(g.phase,'finished');
 assert.deepEqual(g.teams.slice(0,3).map(t=>t.score),[11,12,13]);
});
check('Undo and Redo restore saved teacher scoring changes',()=>{
 let g=finish(reveal(start(mk()),0));
 g=doAction(g,'SET_ROUND_DRAFT',{index:0,value:'40'});
 g=doAction(g,'SAVE_ROUND_SCORES');
 assert.equal(g.teams[0].score,40);
 let undone=doAction(g,'UNDO');
 assert.equal(undone.phase,'round_scoring');
 assert.equal(undone.teams[0].score,0);
 assert.equal(undone.roundDraft[0],'40');
 const redone=doAction(undone,'REDO');
 assert.equal(redone.teams[0].score,40);
 assert.equal(redone.phase,'round_done');
});
check('Fast Money is scored manually after both players finish',()=>{
 let g=doAction(mk(),'FINISH_GAME');
 g=doAction(g,'FAST_START',{team:2,now:100000});
 for(let i=0;i<5;i++)g=doAction(g,'FAST_ANSWER',{index:0,now:101000+i});
 assert.equal(g.fast.player,1);
 g=doAction(g,'FAST_RESUME',{now:200000});
 assert.equal(doAction(g,'FAST_ANSWER',{index:0,now:201000}),g);
 for(let i=0;i<5;i++)g=doAction(g,'FAST_ANSWER',{index:1,now:201000+i});
 assert.equal(g.phase,'fast_scoring');
 assert.ok(g.fast.points>=200);
 assert.equal(g.teams[2].score,0);
 g=doAction(g,'SET_FAST_DRAFT',{value:'125'});
 g=doAction(g,'CONFIRM_FAST_SCORE');
 assert.equal(g.phase,'fast_done');
 assert.equal(g.teams[2].score,125);
 assert.equal(doAction(g,'CONFIRM_FAST_SCORE'),g);
 g=doAction(g,'EDIT_FAST_SCORE');
 g=doAction(g,'SET_FAST_DRAFT',{value:'60'});
 g=doAction(g,'CONFIRM_FAST_SCORE');
 assert.equal(g.teams[2].score,60);
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
 assert.equal(g.phase,'fast_scoring');assert.equal(g.fast.settled,true);
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
