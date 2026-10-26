import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,sanitizeState,storageKey,secureInt} from '../src/components/BrianInstantTools/instantToolsCore.mjs';
import {
 GROUP_DEFAULT,normalizePeople,shufflePeople,makeGroups,relativeNoise,safeTeamNames,
 lockBuzzer,reactionDelay,sanitizeWave4
} from '../src/components/BrianInstantTools/instantToolsWave4Core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const start=initialState();
assert.equal(GROUP_DEFAULT.length,16);
assert.equal(start.groupMaker.count,4);
assert.equal(start.noiseMeter.threshold,55);
assert.equal(start.buzzer.teams.length,4);
assert.equal(start.reaction.history.length,0);
assert.equal(start.classBell.duration,2);
assert.equal(start.classBell.volume,65);
assert.deepEqual(normalizePeople('Alice\nalice\n Bob\nBOB\nCara'),['Alice','Bob','Cara']);
assert.equal(normalizePeople('X\n'.repeat(140)).length,1);
assert.equal(normalizePeople(Array.from({length:150},(_,i)=>'P'+i)).length,120);
assert.equal(shufflePeople(['A','B','C'],(min,max)=>min).length,3);
assert.deepEqual(shufflePeople(['A','B','C'],(min,max)=>min).sort(),['A','B','C']);
assert.throws(()=>shufflePeople(['A','B'],()=>999),/random/);
for(const count of [2,3,4,7,8]){
 const groups=makeGroups(Array.from({length:39},(_,i)=>'S'+i),count,secureInt);
 assert.equal(groups.length,count);
 const flat=groups.flatMap(g=>g.members);
 assert.equal(flat.length,39);
 assert.equal(new Set(flat).size,39);
 assert.ok(Math.max(...groups.map(x=>x.members.length))-Math.min(...groups.map(x=>x.members.length))<=1);
}
assert.equal(relativeNoise(new Float32Array(100)),0);
assert.equal(relativeNoise(new Float32Array(100).fill(.5)),100);
assert.equal(relativeNoise(new Float32Array(100).fill(.05)),23);
assert.deepEqual(safeTeamNames(['A','B']),['A','B']);
assert.deepEqual(safeTeamNames(['A']),['Team 1','Team 2','Team 3','Team 4']);
assert.equal(lockBuzzer(null,'Team 2'),'Team 2');
assert.equal(lockBuzzer('Team 1','Team 2'),'Team 1');
assert.equal(reactionDelay(()=>0),1500);
assert.equal(reactionDelay(()=>.9999999),4000);
const unsafe=sanitizeWave4({
 groupMaker:{names:Array.from({length:130},(_,i)=>'Teacher '+i),count:100,
  groups:[{id:'g',name:'A',members:['Someone not in roster']}]},
 noiseMeter:{threshold:200},
 buzzer:{teams:['Alpha','Beta'],score:[2000,-1],history:Array(30).fill('winner')},
 reaction:{history:[22,90000,-2]},
 classBell:{volume:-25,duration:30}
});
assert.equal(unsafe.groupMaker.names.length,120);
assert.equal(unsafe.groupMaker.count,8);
assert.equal(unsafe.groupMaker.groups.length,0);
assert.equal(unsafe.noiseMeter.threshold,85);
assert.equal(unsafe.buzzer.teams.length,2);
assert.deepEqual(unsafe.buzzer.score,[999,0]);
assert.equal(unsafe.buzzer.history.length,15);
assert.deepEqual(unsafe.reaction.history,[22,30000,1]);
assert.equal(unsafe.classBell.volume,0);
assert.equal(unsafe.classBell.duration,4);
const old={
 version:1,state:{dice:{count:5},bigText:{text:'Old Wave 2'},notes:{items:[{id:'memo',title:'Preserved',body:'Wave 3 note'}]},
 scoreboard:{teams:[{name:'One',score:4},{name:'Two',score:3}]}}
};
const restored=sanitizeState(old);
assert.equal(restored.dice.count,5);
assert.equal(restored.bigText.text,'Old Wave 2');
assert.equal(restored.notes.items[0].body,'Wave 3 note');
assert.equal(restored.scoreboard.teams[0].score,4);
assert.equal(restored.groupMaker.count,4);
assert.equal(restored.noiseMeter.threshold,55);
assert.notEqual(storageKey('alpha-user'),storageKey('beta-user'));
const jsx=read('src/components/BrianInstantTools/BrianInstantToolsWave4.jsx');
const main=read('src/components/BrianInstantTools/BrianInstantTools.jsx');
const css=read('src/components/BrianInstantTools/BrianInstantToolsWave4.css');
for(const name of ['GroupMaker','NoiseMeter','Buzzer','ReactionTimer','ClassBell'])assert.ok(jsx.includes('function '+name+'('),name+' missing');
assert.ok(main.includes('...WAVE4_LIBRARY'));
assert.ok(main.includes("subtitle:'20 công cụ"));
assert.ok(main.includes('WAVE4_LIBRARY.some'));
assert.match(jsx,/getUserMedia/);
assert.match(jsx,/getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
assert.match(jsx,/cancelAnimationFrame/);
assert.match(jsx,/performance\.now\(\)/);
assert.match(jsx,/visibilitychange/);
assert.doesNotMatch(jsx,/fetch\(|supabase\.|dangerouslySetInnerHTML|new Function|eval\(/);
assert.match(css,/@media\(max-width:650px\)/);
const app=read('src/main.jsx');
for(const name of ['global-brian-focus','global-brian-teaching-board','shared-chatbot-drawer','ttcm-approval-inbox'])assert.ok(app.includes(name));
console.log('PASS Wave 4: GroupMaker, NoiseMeter privacy, Buzzer, Reaction, Bell, storage migration, no-cost and no dock changes.');
