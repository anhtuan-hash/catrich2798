import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,sanitizeState,storageKey} from '../src/components/BrianInstantTools/instantToolsCore.mjs';
import {parseGroupNames,makeBalancedGroups,rmsToDbfs,relativeLoudness,reactionLabel,normalizeBellSegments,bellRemaining,progressBell,sanitizeWave4} from '../src/components/BrianInstantTools/instantToolsWave4Core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base=initialState();
for(const id of ['groupMaker','noiseMeter','buzzer','reactionTimer','classBell'])assert.ok(base[id],id);
assert.equal(storageKey('teacher-1'),'bes:instant-tools:v1:teacher-1');
assert.notEqual(storageKey('teacher-1'),storageKey('teacher-2'));
assert.deepEqual(parseGroupNames('A\na\n B\n  B  \nC\n'),['A','B','C']);
const randomized=makeBalancedGroups('An\nBinh\nChi\nDung\nEm\nPhuc\nGiang',3,()=>0);
assert.equal(randomized.length,3);
assert.deepEqual(randomized.map(g=>g.length),[3,2,2]);
const flat=randomized.flat();
assert.equal(flat.length,7);
assert.equal(new Set(flat).size,7);
assert.throws(()=>makeBalancedGroups('A\nA',3),/MIN_NAMES/);
assert.throws(()=>makeBalancedGroups('A\nB',2,()=>999),/RNG/);
assert.ok(rmsToDbfs(.1)<-19&&rmsToDbfs(.1)>-21);
assert.equal(rmsToDbfs(0),-90);
assert.equal(rmsToDbfs(1),0);
assert.ok(relativeLoudness(-10)>relativeLoudness(-40));
assert.equal(reactionLabel(130),'excellent');
assert.equal(reactionLabel(310),'steady');
const bell={segments:[{id:'bell-0',name:'Warm-up',seconds:10},{id:'bell-1',name:'Main',seconds:30}],index:0,running:true,endsAt:10000,remainingMs:10000};
assert.equal(bellRemaining(bell,5000),5000);
assert.equal(progressBell(bell,11000).index,1);
assert.equal(progressBell(bell,11000).endsAt,40000);
assert.equal(progressBell(bell,41000).completed,true);
assert.equal(progressBell(bell,41000).running,false);
assert.equal(progressBell({...bell,running:false},5000).advanced,0);
assert.equal(normalizeBellSegments(null).length,2);
const dirty={groupMaker:{count:300,input:'One\nTwo',groups:[['One'],['One']]},noiseMeter:{threshold:8},
buzzer:{teams:['A','B'],winner:77},reactionTimer:{best:240,attempts:[190,240]},
classBell:{segments:[{name:'hello',seconds:4000}],index:88,running:true,endsAt:Date.now()+10000}};
const scrub=sanitizeWave4(dirty);
assert.equal(scrub.groupMaker.count,8);
assert.deepEqual(scrub.groupMaker.groups,[]);
assert.equal(scrub.noiseMeter.threshold,-8);
assert.equal(scrub.buzzer.winner,null);
assert.equal(scrub.classBell.segments[0].seconds,3600);
assert.equal(scrub.classBell.index,0);
assert.deepEqual(scrub.reactionTimer.attempts,[190,240]);
const saved=sanitizeState({version:1,state:{
 dice:{count:4},notes:{items:[{id:'memo',title:'Existing',body:'retain',color:'sky'}]},
 groupMaker:{input:'Minh\nLan',count:2,groups:[['Lan'],['Minh']]},
 classBell:{segments:[{name:'Lecture',seconds:240}],index:0,remainingMs:100000}
}});
assert.equal(saved.dice.count,4);
assert.equal(saved.notes.items[0].body,'retain');
assert.equal(saved.groupMaker.groups.flat().length,2);
assert.equal(saved.classBell.segments[0].seconds,240);
assert.equal(saved.classBell.remainingMs,100000);
const ui=read('src/components/BrianInstantTools/BrianInstantTools.jsx');
const w4=read('src/components/BrianInstantTools/BrianInstantToolsWave4.jsx');
const css=read('src/components/BrianInstantTools/BrianInstantToolsWave4.css');
assert.ok(ui.includes('...WAVE4_LIBRARY'));
assert.ok(ui.includes("subtitle:'20 công cụ"));
assert.ok(ui.includes('Wave4Tool'));
assert.ok(ui.includes('BRIAN INSTANT TOOLS · 04 / 04'));
for(const component of ['GroupMaker','NoiseMeter','Buzzer','ReactionTimer','ClassBell'])assert.ok(w4.includes('function '+component+'('),component);
assert.match(w4,/getUserMedia/);
assert.match(w4,/getTracks\(\).*stop\(\)/);
assert.match(w4,/visibilitychange/);
assert.match(css,/@media\(max-width:520px\)/);
assert.doesNotMatch(w4,/eval\(|new Function|dangerouslySetInnerHTML|supabase\.|fetch\(/);
assert.ok(!w4.includes('MediaRecorder'));
console.log('PASS Wave 4: 20 tools, safe roster grouping, dBFS handling, buzzer/reaction state, bell sequencing, storage migration.');
