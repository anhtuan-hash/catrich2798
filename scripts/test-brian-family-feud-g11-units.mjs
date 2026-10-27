import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRADE11_FAMILY_FEUD_GAMES,GRADE11_FAMILY_FEUD_TOTAL_BOARDS,getGrade11FeudGame} from
 '../src/components/BrianFamilyFeud/g11FeudUnitGames.js';
import {GRADE12_FAMILY_FEUD_GAMES} from '../src/components/BrianFamilyFeud/g12FeudUnitGames.js';
import {createFamilyFeud,feudReducer,validateFeudBank,exportFeudCSV,importFeudCSV} from
 '../src/components/BrianFamilyFeud/familyFeudEngine.js';
import {FAMILY_FEUD_BANK} from '../src/components/BrianFamilyFeud/familyFeudBank.js';
const check=(label,fn)=>{fn();console.log('✓ '+label);};
const titles=[
 'A Long and Healthy Life','The Generation Gap','Cities of the Future',
 'ASEAN and Viet Nam','Global Warming','Preserving Our Heritage',
 'Education Options for School-Leavers','Becoming Independent','Social Issues','The Ecosystem',
];
const themes=[
 /health|nutrition|sleep|stress|exercise|well-being|food/,
 /teenagers|parents|family|generation|household/,
 /city|smart|transport|building|future|urban/,
 /ASEAN|Viet Nam|cultural|regional|international/,
 /climate|global warming|carbon|greenhouse|forests|heat/,
 /heritage|historic|museum|traditional|craft/,
 /education|university|vocational|college|school-leaver/,
 /independ|responsib|money|time|decision/,
 /social|bullying|community|discriminat|unemploy/,
 /ecosystem|food chain|biodiversity|habitat|wetlands/,
];
const norm=x=>String(x).toLowerCase().trim().replace(/\s+/g,' ');
check('10 English 11 games match the book Unit 1–10 titles, not Grade 12',()=>{
 assert.equal(GRADE11_FAMILY_FEUD_GAMES.length,10);
 assert.equal(GRADE11_FAMILY_FEUD_TOTAL_BOARDS,120);
 for(let i=0;i<10;i++){
  const game=GRADE11_FAMILY_FEUD_GAMES[i];
  assert.equal(game.id,'g11-unit-'+(i+1));
  assert.equal(game.grade,11);
  assert.equal(game.unit,i+1);
  assert.equal(game.title,titles[i]);
  assert.equal(getGrade11FeudGame(game.id),game);
  assert.match(game.category,/^English 11 · Unit /);
  assert.match(game.boards.map(b=>b.prompt).join(' '),themes[i]);
  assert.ok(!GRADE12_FAMILY_FEUD_GAMES.some(g=>g.id===game.id));
 }
 assert.equal(getGrade11FeudGame('g12-unit-1'),null);
});
check('Each of 120 Grade 11 question boards is unique with 6 distinct answer suggestions',()=>{
 const ids=new Set(),prompts=new Set();let answerCount=0;
 for(const game of GRADE11_FAMILY_FEUD_GAMES){
  assert.equal(game.boardCount,12);
  assert.equal(validateFeudBank(game.boards).length,12);
  for(const b of game.boards){
   assert.ok(!ids.has(b.id),'Repeated ID '+b.id);ids.add(b.id);
   const p=norm(b.prompt);
   assert.ok(!prompts.has(p),'Repeated question '+b.prompt);prompts.add(p);
   assert.ok(b.prompt.length>=26&&b.prompt.length<=240);
   assert.ok(b.prompt.endsWith('?')||b.prompt.endsWith('.'));
   assert.equal(b.answers.length,6);
   assert.equal(new Set(b.answers.map(a=>norm(a.text))).size,6);
   assert.equal(b.answers.reduce((sum,a)=>sum+a.points,0),100);
   assert.ok(b.answers.every(a=>a.points>=1&&a.text.length>=3&&a.text.length<=90));
   answerCount+=b.answers.length;
  }
 }
 assert.equal(prompts.size,120);
 assert.equal(answerCount,720);
});
check('Each game can be played with 5 main rounds, 5 unseen Fast Money boards and 2 spare',()=>{
 for(const game of GRADE11_FAMILY_FEUD_GAMES){
  const session=createFamilyFeud({bank:game.boards,teamCount:4,roundLimit:5,
    edition:{id:game.id,unit:game.unit,grade:11,title:game.title}});
  assert.equal(session.roundLimit,5);
  assert.deepEqual(session.edition,{id:game.id,unit:game.unit,grade:11,title:game.title});
  const main=new Set(session.bank.slice(0,5).map(x=>x.id));
  const fast=session.bank.slice(5,10);
  assert.equal(fast.length,5);
  assert.equal(session.bank.slice(10).length,2);
  assert.ok(fast.every(q=>!main.has(q.id)));
 }
});
check('All ten games complete actual rounds, strikes, steals and two-player Fast Money',()=>{
 for(const pack of GRADE11_FAMILY_FEUD_GAMES){
  let g=createFamilyFeud({bank:pack.boards,teamCount:2,roundLimit:5,
    edition:{id:pack.id,unit:pack.unit,grade:11,title:pack.title}});
  for(let round=0;round<5;round++){
   g=feudReducer(g,{type:'START_ROUND'});
   g=feudReducer(g,{type:'REVEAL',index:0});
   if(round===0){
    for(let strike=0;strike<3;strike++)g=feudReducer(g,{type:'STRIKE'});
    assert.equal(g.phase,'steal');
    g=feudReducer(g,{type:'REVEAL',index:1});
   }else g=feudReducer(g,{type:'END_ROUND'});
   assert.equal(g.phase,'round_done');
   g=feudReducer(g,{type:'NEXT_ROUND'});
  }
  assert.equal(g.phase,'finished');
  g=feudReducer(g,{type:'FAST_START',team:0,now:100000});
  assert.equal(g.phase,'fast_money');
  for(let i=0;i<5;i++)g=feudReducer(g,{type:'FAST_ANSWER',index:0,now:101000+i});
  assert.equal(g.fast.player,1);
  assert.equal(g.fast.paused,true);
  g=feudReducer(g,{type:'FAST_RESUME',now:200000});
  assert.equal(feudReducer(g,{type:'FAST_ANSWER',index:0,now:201000}),g);
  for(let i=0;i<5;i++)g=feudReducer(g,{type:'FAST_ANSWER',index:1,now:201000+i});
  assert.equal(g.phase,'fast_done');
  assert.equal(g.fast.answers.length,10);
  assert.ok(g.fast.points>=200);
  assert.equal(g.edition.grade,11);
 }
});
check('All 10 banks export and re-import with identical 6-option questions and scores',()=>{
 for(const pack of GRADE11_FAMILY_FEUD_GAMES){
  const csv=exportFeudCSV(pack.boards);
  assert.ok(csv.startsWith('\uFEFF'));
  const roundTrip=importFeudCSV(csv);
  assert.equal(roundTrip.length,12);
  for(let i=0;i<12;i++){
   assert.equal(roundTrip[i].prompt,pack.boards[i].prompt);
   assert.deepEqual(roundTrip[i].answers,pack.boards[i].answers);
  }
 }
});
check('10 original Grade 12 games and legacy 30-board General bank are preserved',()=>{
 assert.equal(GRADE12_FAMILY_FEUD_GAMES.length,10);
 assert.equal(FAMILY_FEUD_BANK.length,30);
 const saved=createFamilyFeud({bank:FAMILY_FEUD_BANK,teamCount:2,roundLimit:5});
 assert.equal(saved.edition,null);
 assert.equal(saved.phase,'ready');
});
check('Grade 11/12 gallery selection, title, round banner, CSV and saved edition are wired',()=>{
 const ui=readFileSync(new URL('../src/components/BrianFamilyFeud/BrianFamilyFeud.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/components/BrianFamilyFeud/BrianFamilyFeud.css',import.meta.url),'utf8');
 assert.match(ui,/GRADE11_FAMILY_FEUD_GAMES/);
 assert.match(ui,/GRADE12_FAMILY_FEUD_GAMES/);
 assert.match(ui,/getGrade11FeudGame\(selectedUnitId\)/);
 assert.match(ui,/getGrade12FeudGame\(selectedUnitId\)/);
 assert.match(ui,/selectedGrade===10\?GRADE10_FAMILY_FEUD_GAMES:selectedGrade===11\?GRADE11_FAMILY_FEUD_GAMES:GRADE12_FAMILY_FEUD_GAMES/);
 assert.match(ui,/setSelectedGrade\(level\)/);
 assert.match(ui,/chooseUnit\('g'\+level\+'-unit-1'\)/);
 assert.match(ui,/availableUnitGames\.map/);
 assert.match(ui,/grade:selectedUnitGame\.grade/);
 assert.match(ui,/game\.edition\.grade\|\|12/);
 assert.match(ui,/setCustomBank\(parsed\);setSelectedUnitId\(null\)/);
 assert.match(css,/\.bff-grade-switch/);
 assert.match(css,/\.bff-grade-option\.is-active/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
console.log('PASS: Grade 11 Family Feud 10 Unit games, 120 unique boards, 720 answers, gameplay/CSV/legacy isolation.');
