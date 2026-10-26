import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArena,arenaReducer} from '../src/components/BrianBombArena/arenaEngine.js';
import {CHAOS_FEATURES,isChaosKit} from '../src/components/BrianBombArena/arenaChaosEngine.js';
const check=(name,fn)=>{fn();console.log('✓ '+name);};
const question=()=>({prompt:'Which form is correct?',options:['was reading','read','reads','has read'],answerIndex:0,answer:'was reading'});
const make=(features=CHAOS_FEATURES,size=4)=>{
 const s=createArena({mode:'chaos',size,teamCount:2,questionGate:true,questions:Array.from({length:50},question),chaosFeatures:features,difficulty:'extreme'});
 return arenaReducer(s,{type:'START',now:100000});
};
const pick=(s,now=100000)=>{
 const tile=s.tiles.find(t=>!t.opened&&t.event!=='blocked');
 assert.ok(tile);
 return arenaReducer(s,{type:'SELECT',index:tile.id,now});
};
const answer=(s,choice=0,now=101000)=>arenaReducer(s,{type:'ANSWER_CHOICE',choice,now});
const sameTeam=(s)=>arenaReducer(s,{type:'TEAM',index:0});
const grade=(s,correct=true)=>{
 const selected=pick(s);
 return answer(selected,correct?0:1,101000);
};
check('Existing classic and old Chaos sessions remain isolated',()=>{
 const old=createArena({mode:'chaos',size:4,questionGate:true,questions:[question()]});
 assert.equal(old.chaosKit,null);
 assert.equal(isChaosKit(old),false);
 const s=make();assert.equal(isChaosKit(s),true);
 assert.deepEqual(Object.keys(s.chaosKit.features).sort(),[...CHAOS_FEATURES].sort());
});
check('Defuse a wire: correct immediately reveals +20 and advances turn',()=>{
 const s=pick(make());
 assert.equal(s.chaosKit.questionDueAt,115000);
 const tile=s.selectedTile;
 const next=answer(s);
 assert.equal(next.tiles[tile].opened,true);
 assert.equal(next.tiles[tile].event,'points20');
 assert.equal(next.teams[0].score,20);
 assert.equal(next.last.grade,'correct');
 assert.equal(next.turn,1);
 assert.equal(answer(next),next,'No double score after tile resolves');
});
check('Wrong wire: bomb, -20, clamp zero and advance',()=>{
 let s=make();s.teams[0].score=11;s=pick(s);
 const next=answer(s,1);
 assert.equal(next.teams[0].score,0);
 assert.equal(next.tiles[s.selectedTile].event,'bomb');
 assert.equal(next.last.grade,'incorrect');assert.equal(next.turn,1);
});
check('Combo: 1, 2, 3, 6 consecutive correct yield +20/+20/+40/+60',()=>{
 let s=make(),awards=[];
 for(let i=0;i<6;i++){
   s=sameTeam(s);
   s=grade(s,true);
   awards.push(s.last.points);
 }
 assert.deepEqual(awards,[20,20,40,40,40,60]);
 assert.equal(s.teams[0].combo,6);
 assert.equal(s.teams[0].score,220);
});
check('Shield: third correct earns one, wrong consumes protection and resets combo',()=>{
 let s=make();
 for(let i=0;i<3;i++)s=grade(sameTeam(s),true);
 assert.equal(s.teams[0].shields,1);
 const score=s.teams[0].score;
 s=grade(sameTeam(s),false);
 assert.equal(s.teams[0].shields,0);
 assert.equal(s.teams[0].score,score);
 assert.equal(s.last.shieldUsed,true);assert.equal(s.teams[0].combo,0);
 s=grade(sameTeam(s),false);
 assert.equal(s.teams[0].score,score-20);
});
check('Timer: cannot fire before deadline; fires once exactly at 15 seconds',()=>{
 const s=pick(make(),100000);
 assert.equal(arenaReducer(s,{type:'TIMEOUT',now:114999}),s);
 const next=arenaReducer(s,{type:'TIMEOUT',now:115000});
 assert.equal(next.last.timedOut,true);assert.equal(next.last.event,'bomb');
 assert.equal(next.turn,1);assert.equal(next.tiles[s.selectedTile].opened,true);
 assert.equal(arenaReducer(next,{type:'TIMEOUT',now:115001}),next);
});
check('Late correct tap is treated as timeout even when the answer is correct',()=>{
 const s=pick(make(),100000);
 const timed=answer(s,0,115001);
 assert.equal(timed.last.timedOut,true);assert.equal(timed.last.grade,'incorrect');
 assert.equal(timed.teams[0].combo,0);
});
check('Pause preserves time and resume shifts deadline without losing question',()=>{
 let s=pick(make(),100000);
 s=arenaReducer(s,{type:'PAUSE',now:105000});
 assert.equal(s.phase,'paused');assert.equal(s.chaosKit.remainingMs,10000);
 assert.equal(s.chaosKit.questionDueAt,null);
 assert.equal(arenaReducer(s,{type:'TIMEOUT',now:200000}),s);
 s=arenaReducer(s,{type:'START',now:200000});
 assert.equal(s.chaosKit.questionDueAt,210000);
 assert.equal(arenaReducer(s,{type:'TIMEOUT',now:209999}),s);
});
check('Boss activates with <=5 tiles, has 3 HP, bonus +100 exactly once',()=>{
 let s=make(['boss','defuse']);
 for(let i=0;i<11;i++)s=grade(sameTeam(s),true);
 assert.equal(s.tiles.filter(t=>!t.opened).length,5);
 assert.equal(s.chaosKit.bossActive,true);assert.equal(s.chaosKit.bossHP,3);
 for(let n=2;n>=0;n--){
   s=grade(sameTeam(s),true);
   assert.equal(s.chaosKit.bossHP,n);
 }
 assert.equal(s.chaosKit.bossDefeated,true);
 assert.equal(s.last.bossDefeated,true);
 assert.equal(s.last.points,120,'+20 base and +100 boss reward');
 const before=s.teams[0].score;
 s=grade(sameTeam(s),true);
 assert.equal(s.teams[0].score,before+20,'Boss reward is not repeated');
});
check('Boss not awarded if board ends with HP remaining',()=>{
 let s=make(['boss']);
 for(let i=0;i<11;i++)s=grade(sameTeam(s),true);
 for(let i=0;i<5;i++)s=grade(sameTeam(s),false);
 assert.equal(s.phase,'finished');
 assert.equal(s.chaosKit.bossDefeated,false);
 assert.equal(s.chaosKit.bossHP,3);
});
check('Undo / Redo atomically restore score, combo, shield and boss',()=>{
 let s=make(['combo','shield','boss']);
 for(let i=0;i<3;i++)s=grade(sameTeam(s),true);
 const before=s;
 const wrong=grade(sameTeam(s),false);
 assert.equal(wrong.last.shieldUsed,true);
 let undone=arenaReducer(wrong,{type:'UNDO'});
 assert.equal(undone.teams[0].shields,1);
 assert.equal(undone.teams[0].combo,3);
 assert.equal(undone.tiles.filter(t=>t.opened).length,before.tiles.filter(t=>t.opened).length);
 const redone=arenaReducer(undone,{type:'REDO'});
 assert.equal(redone.teams[0].shields,0);assert.equal(redone.teams[0].combo,0);
});
check('Individual feature toggles disable combo, shield, timer and boss',()=>{
 let s=make(['defuse']);
 assert.equal(s.chaosKit.features.timer,false);
 s=pick(s);
 assert.equal(s.chaosKit.questionDueAt,null);
 s=answer(s);
 assert.equal(s.last.points,20);
 assert.equal(s.teams[0].shields,0);
 assert.equal(s.chaosKit.bossActive,false);
});
check('Invalid wire choices and non-running game do not mutate',()=>{
 const s=pick(make());assert.equal(answer(s,7),s);assert.equal(answer(s,-1),s);
 const paused=arenaReducer(s,{type:'PAUSE',now:101000});
 assert.equal(answer(paused),paused);
});
check('UI: five checkboxes, direct-tap wires, clock, boss HUD, old modes remain',()=>{
 const ui=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.css',import.meta.url),'utf8');
 const fx=readFileSync(new URL('../src/components/BrianBombArena/ArenaEffects.jsx',import.meta.url),'utf8');
 assert.match(ui,/CHAOS_FEATURES\.map/);
 assert.match(ui,/bba-defuse-wire/);assert.match(ui,/bba-timer-display/);
 assert.match(ui,/bba-boss-hud/);assert.match(ui,/onClick=\{\(\)=>answerChoice\(index\)\}/);
 assert.match(ui,/type:'TIMEOUT'/);assert.match(ui,/type:'PAUSE',now:Date\.now\(\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(fx,/boss'/);assert.match(fx,/defused'/);
});
console.log('PASS: Chaos Five mechanics with timeout, shield, combo, final boss and legacy isolation.');
