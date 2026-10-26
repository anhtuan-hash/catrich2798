import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArena,arenaReducer,rankTeams,ARENA_MODES} from '../src/components/BrianBombArena/arenaEngine.js';
const check=(label,run)=>{run();console.log('✓ '+label);};
const apply=(game,action)=>arenaReducer(game,action);
check('All four game modes generate valid boards and event counts',()=>{
  for(const mode of ARENA_MODES)for(const size of [4,5,6]){
    const s=createArena({mode,size,teamCount:8,ownerId:'teacher-1'},()=>0.25);
    assert.equal(s.tiles.length,size*size);
    assert.equal(new Set(s.tiles.map(t=>t.label)).size,size*size);
    assert.equal(s.teams.length,8);assert.equal(s.ownerId,'teacher-1');
    assert.equal(s.questionGate,mode==='challenge');
  }
});
check('Classic reveal awards points and rotates turns once',()=>{
  const s=apply(createArena({mode:'classic',size:4,teamCount:2}),{type:'START'});
  s.tiles[0].event='points100';
  const result=apply(s,{type:'SELECT',index:0});
  assert.equal(result.tiles[0].opened,true);assert.equal(result.teams[0].score,100);
  assert.equal(result.turn,1);
  assert.equal(apply(result,{type:'SELECT',index:0}),result);
});
check('Undo and redo restore tiles, score, turn and ownership',()=>{
  const s=apply(createArena({mode:'classic',teamCount:2}),{type:'START'});
  s.tiles[0].event='points200';
  const played=apply(s,{type:'SELECT',index:0});
  const undone=apply(played,{type:'UNDO'});
  assert.equal(undone.tiles[0].opened,false);assert.equal(undone.teams[0].score,0);
  assert.equal(undone.turn,0);
  const redone=apply(undone,{type:'REDO'});
  assert.equal(redone.tiles[0].opened,true);assert.equal(redone.teams[0].score,200);
});
check('Bomb removes points but never makes scores negative',()=>{
  let s=apply(createArena({mode:'classic',teamCount:2}),{type:'START'});
  s=apply(s,{type:'SCORE',index:0,value:300});s.tiles[0].event='bomb';
  const played=apply(s,{type:'SELECT',index:0});
  assert.equal(played.teams[0].score,0);
  assert.equal(apply(played,{type:'SCORE',index:0,value:-100}).teams[0].score,0);
});
check('Shield absorbs next bomb',()=>{
  const s=apply(createArena({mode:'classic',teamCount:2}),{type:'START'});
  s.teams[0].score=100;s.teams[0].shields=1;s.tiles[0].event='bomb';
  const played=apply(s,{type:'SELECT',index:0});
  assert.equal(played.teams[0].score,100);assert.equal(played.teams[0].shields,0);
});
check('Press Your Luck awards temporary points then BANK',()=>{
  const s=apply(createArena({mode:'luck',teamCount:2}),{type:'START'});
  s.tiles[0].event='points100';
  const played=apply(s,{type:'SELECT',index:0});
  assert.equal(played.teams[0].score,0);assert.equal(played.teams[0].bank,100);assert.equal(played.turn,0);
  const banked=apply(played,{type:'BANK'});
  assert.equal(banked.teams[0].score,100);assert.equal(banked.teams[0].bank,0);assert.equal(banked.turn,1);
});
check('Question gate requires teacher answer even for an empty question bank',()=>{
  const s=apply(createArena({mode:'challenge',teamCount:2}),{type:'START'});
  const selected=apply(s,{type:'SELECT',index:0});
  assert.equal(selected.selectedTile,0);assert.equal(selected.tiles[0].opened,false);
  const wrong=apply(selected,{type:'ANSWER',correct:false});
  assert.equal(wrong.tiles[0].opened,false);assert.equal(wrong.turn,1);
  const correct=apply(selected,{type:'ANSWER',correct:true});
  assert.equal(correct.tiles[0].opened,true);
});
check('Final tile secures all outstanding temporary banks',()=>{
  const s=apply(createArena({mode:'luck',size:4,teamCount:2}),{type:'START'});
  s.tiles.forEach((cell,index)=>{cell.opened=index!==0;});
  s.tiles[0].event='points50';s.teams[1].bank=200;
  const final=apply(s,{type:'SELECT',index:0});
  assert.equal(final.phase,'finished');assert.equal(final.teams[1].score,200);
  assert.equal(final.teams[1].bank,0);
});
check('Ranking sorts by score without mutating source array',()=>{
  const teams=[{id:'a',name:'Alpha',score:25},{id:'b',name:'Beta',score:40}];
  assert.equal(rankTeams(teams)[0].id,'b');assert.equal(teams[0].id,'a');
});
check('Portal is integrated without altering existing launchers',()=>{
  const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
  const bubble=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.css',import.meta.url),'utf8');
  assert.match(main,/<BrianBombArena currentUser=\{currentUser\} language=\{language\}/);
  assert.match(main,/<BrianFocus currentUser=\{currentUser\} language=\{language\} performance=\{resolvedPerformance\}/);
  assert.match(main,/<BrianBoard currentUser=\{currentUser\} language=\{language\}/);
  assert.match(bubble,/allowedUser/);assert.match(css,/body:not\(:has\(\.bes-approval-root\)\) \.bba-bubble/);
  assert.match(css,/prefers-reduced-motion/);assert.match(css,/safe-area-inset/);
});
console.log('PASS: Brian Bomb Arena engine, integration and accessibility static checks.');
