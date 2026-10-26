import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRADE12_FAMILY_FEUD_GAMES,GRADE12_FAMILY_FEUD_TOTAL_BOARDS,getGrade12FeudGame} from
 '../src/components/BrianFamilyFeud/g12FeudUnitGames.js';
import {FAMILY_FEUD_BANK} from '../src/components/BrianFamilyFeud/familyFeudBank.js';
import {createFamilyFeud,feudReducer,validateFeudBank,exportFeudCSV,importFeudCSV} from
 '../src/components/BrianFamilyFeud/familyFeudEngine.js';

const check=(title,fn)=>{fn();console.log('✓ '+title);};
const expectedTitles=[
 'Life Stories We Admire','A Multicultural World','Green Living','Urbanisation',
 'The World of Work','Artificial Intelligence','The World of Mass Media',
 'Wildlife Conservation','Career Paths','Lifelong Learning',
];
const norm=s=>String(s).toLowerCase().trim().replace(/\s+/g,' ');
const bankText=g=>g.boards.map(b=>b.prompt+' '+b.answers.map(a=>a.text).join(' ')).join(' ').toLowerCase();
const topicVocabulary=[
 /biograph|life stor|leader|scientist|role model|achievement|historic/,
 /cultur|tradition|exchange|language|festival|stereotyp/,
 /green|reus|sustain|electricity|recycl|food waste/,
 /urban|city|public transport|commut|housing|infrastructure/,
 /work|employee|recruit|interview|cv|internship/,
 /artificial intelligence|ai|robot|data|chatbot/,
 /media|news|journalis|podcast|social|report/,
 /wildlife|habitat|species|conserv|animal|ecosystem/,
 /career|profession|mentor|pathway|job|vocational/,
 /learn|education|course|study|motivat|skill/,
];
check('Ten separate games are mapped one-to-one to the official English 12 Units',()=>{
 assert.equal(GRADE12_FAMILY_FEUD_GAMES.length,10);
 for(let i=0;i<10;i++){
  const game=GRADE12_FAMILY_FEUD_GAMES[i];
  assert.equal(game.unit,i+1);
  assert.equal(game.grade,12);
  assert.equal(game.title,expectedTitles[i]);
  assert.equal(game.id,'g12-unit-'+(i+1));
  assert.equal(getGrade12FeudGame(game.id),game);
  assert.match(game.category,/^English 12 · Unit /);
  assert.match(bankText(game),topicVocabulary[i]);
 }
 assert.equal(getGrade12FeudGame('g12-unit-11'),null);
});
check('Exactly 120 independently written question boards and 720 six-answer suggestions',()=>{
 assert.equal(GRADE12_FEUD_TOTAL_BOARDS,120);
 const boardIds=new Set(),prompts=new Set();
 for(const game of GRADE12_FAMILY_FEUD_GAMES){
  assert.equal(game.boardCount,12);
  assert.equal(game.boards.length,12);
  assert.equal(validateFeudBank(game.boards).length,12);
  for(const board of game.boards){
   assert.ok(!boardIds.has(board.id),'Duplicated ID '+board.id);boardIds.add(board.id);
   const normalized=norm(board.prompt);
   assert.ok(!prompts.has(normalized),'Repeated prompt '+board.prompt);prompts.add(normalized);
   assert.ok(board.prompt.startsWith('Name '),'Question is not a proper survey-style prompt');
   assert.ok(board.prompt.length>=28&&board.prompt.length<240);
   assert.equal(board.answers.length,6);
   assert.equal(new Set(board.answers.map(a=>norm(a.text))).size,6,'Repeated suggestions in '+board.id);
   assert.equal(board.answers.reduce((sum,a)=>sum+a.points,0),100);
   assert.ok(board.answers.every(a=>a.text.length>=3&&a.text.length<=90));
  }
 }
 assert.equal(prompts.size,120);
 assert.equal([...GRADE12_FAMILY_FEUD_GAMES].reduce((n,g)=>n+g.boards.reduce((x,b)=>x+b.answers.length,0),0),720);
});
check('Each Unit provides five primary rounds and five previously unused Fast Money boards',()=>{
 for(const game of GRADE12_FAMILY_FEUD_GAMES){
  const session=createFamilyFeud({
   bank:game.boards,teamCount:4,roundLimit:5,
   edition:{id:game.id,unit:game.unit,title:game.title},
  });
  assert.equal(session.roundLimit,5);
  assert.equal(session.bank.length,12);
  assert.deepEqual(session.edition,{id:game.id,unit:game.unit,title:game.title});
  const mainIds=new Set(session.bank.slice(0,5).map(b=>b.id));
  const bonus=session.bank.slice(5,10);
  assert.equal(bonus.length,5);
  for(const board of bonus)assert.ok(!mainIds.has(board.id));
 }
});
check('All ten games complete real reducer flow: five rounds, three strikes/steal, Fast Money',()=>{
 for(const game of GRADE12_FAMILY_FEUD_GAMES){
  let session=createFamilyFeud({
   bank:game.boards,teamCount:2,roundLimit:5,
   edition:{id:game.id,unit:game.unit,title:game.title},
  });
  for(let i=0;i<5;i++){
   session=feudReducer(session,{type:'START_ROUND'});
   session=feudReducer(session,{type:'REVEAL',index:0});
   if(i===0){
    for(let n=0;n<3;n++)session=feudReducer(session,{type:'STRIKE'});
    assert.equal(session.phase,'steal');
    session=feudReducer(session,{type:'REVEAL',index:1});
    assert.equal(session.phase,'round_done');
   }else session=feudReducer(session,{type:'END_ROUND'});
   session=feudReducer(session,{type:'NEXT_ROUND'});
  }
  assert.equal(session.phase,'finished');
  session=feudReducer(session,{type:'FAST_START',team:0,now:100000});
  assert.equal(session.phase,'fast_money');
  const fastIDs=session.fast.questions.map(q=>q.id);
  assert.ok(fastIDs.every(id=>!game.boards.slice(0,5).some(b=>b.id===id)));
  for(let i=0;i<5;i++)session=feudReducer(session,{type:'FAST_ANSWER',index:0,now:101000+i});
  assert.equal(session.fast.player,1);
  assert.equal(session.fast.paused,true);
  session=feudReducer(session,{type:'FAST_RESUME',now:200000});
  assert.equal(feudReducer(session,{type:'FAST_ANSWER',index:0,now:201000}),session,
   'Second participant cannot repeat the same answer');
  for(let i=0;i<5;i++)session=feudReducer(session,{type:'FAST_ANSWER',index:1,now:201000+i});
  assert.equal(session.phase,'fast_done');
  assert.equal(session.fast.answers.length,10);
  assert.ok(session.fast.points>=200);
  assert.equal(session.last.kind,'fast_money');
  assert.equal(session.edition.unit,game.unit);
 }
});
check('Each Unit bank exports as a valid standalone teacher-editable CSV',()=>{
 for(const game of GRADE12_FAMILY_FEUD_GAMES){
  const csv=exportFeudCSV(game.boards);
  const parsed=importFeudCSV(csv);
  assert.equal(parsed.length,12);
  for(let i=0;i<12;i++){
   assert.equal(parsed[i].prompt,game.boards[i].prompt);
   assert.deepEqual(parsed[i].answers.map(a=>a.text),game.boards[i].answers.map(a=>a.text));
   assert.equal(parsed[i].answers.reduce((sum,a)=>sum+a.points,0),100);
  }
 }
});
check('Legacy Family Feud general English 10–12 bank stays intact and has no Unit edition',()=>{
 assert.equal(FAMILY_FEUD_BANK.length,30);
 const old=createFamilyFeud({bank:FAMILY_FEUD_BANK,teamCount:2,roundLimit:5});
 assert.equal(old.edition,null);
 assert.equal(old.bank.length,30);
 assert.equal(old.phase,'ready');
});
check('Bilingual unit gallery, explicit labels and mode isolation are mounted in UI',()=>{
 const ui=readFileSync(new URL('../src/components/BrianFamilyFeud/BrianFamilyFeud.jsx',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../src/components/BrianFamilyFeud/BrianFamilyFeud.css',import.meta.url),'utf8');
 assert.match(ui,/GRADE12_FAMILY_FEUD_GAMES\.map/);
 assert.match(ui,/getGrade12FeudGame\(selectedUnitId\)/);
 assert.match(ui,/setSelectedUnitId\(id\)/);
 assert.match(ui,/edition:selectedUnitGame/);
 assert.match(ui,/selectedUnitGame\?\[3,5\]:FEUD_ROUND_LIMITS/);
 assert.match(ui,/setCustomBank\(parsed\);setSelectedUnitId\(null\)/);
 assert.match(ui,/game\.edition&&/);
 assert.match(styles,/\.bff-unit-grid/);
 assert.match(styles,/@media\(max-width:450px\)/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
});
console.log('PASS: 10 distinct Family Feud games, 120 original boards / 720 answers, 10× classroom + Fast Money integration.');
