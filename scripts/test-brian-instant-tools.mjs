import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  STORE_VERSION,initialState,sanitizeState,storageKey,secureInt,diceRoll,wheelTarget,normalizeWheelNames,
  timerRemaining,formatClock,scoreLeaders,makeQrInput
} from '../src/components/BrianInstantTools/instantToolsCore.mjs';

assert.equal(STORE_VERSION,1);
assert.equal(storageKey('ABC-123'),'bes:instant-tools:v1:abc-123');
assert.equal(storageKey('../x'),null);
assert.equal(storageKey(null),null);
assert.notEqual(storageKey('teacher-1'),storageKey('teacher-2'));
assert.deepEqual(normalizeWheelNames(' Ava \nAVA\nBen\nCara'),['Ava','Ben','Cara']);
assert.equal(normalizeWheelNames('one\none'),null);
assert.equal(normalizeWheelNames(Array.from({length:25},(_,i)=>'Team '+i)).length,16);
assert.equal(diceRoll(6,()=>5).length,6);
assert.ok(diceRoll(2,()=>5).every(v=>v===5));
for(let n=1;n<=6;n++)assert.equal(secureInt(n,n,{getRandomValues:bytes=>{bytes[0]=1;return bytes;}}),n);
for(let count=2;count<=16;count++){
  for(let i=0;i<count;i++){
    const v=wheelTarget(735,i,count);
    const normalized=((v%360)+360)%360,center=((i+.5)*360/count)%360;
    const difference=((normalized+center)%360);
    assert.ok(Math.abs(difference-360)<.0000001||Math.abs(difference)<.0000001,'winner index targeting wrong');
    assert.ok(v>735+4*360);
  }
}
assert.equal(timerRemaining({durationSeconds:180,remainingMs:60000,running:true,endsAt:5000},4000),1000);
assert.equal(timerRemaining({durationSeconds:180,remainingMs:60000,running:true,endsAt:5000},6000),0);
assert.equal(timerRemaining({durationSeconds:180,remainingMs:60000,running:false,endsAt:null},6000),60000);
assert.equal(formatClock(60001),'01:01');
assert.equal(formatClock(0),'00:00');
assert.deepEqual(scoreLeaders([{id:'a',score:4},{id:'b',score:4},{id:'c',score:2}]),['a','b']);
assert.deepEqual(scoreLeaders([{id:'a',score:0},{id:'b',score:-2}]),[]);
assert.equal(makeQrInput('https://example.com/x').kind,'url');
assert.equal(makeQrInput('English 11: Global Warming').kind,'text');
assert.equal(makeQrInput('javascript:alert(1)').error,'protocol');
assert.equal(makeQrInput('data:text/plain,hello').error,'protocol');
assert.equal(makeQrInput('http://bad user:secret@example.com').error,'protocol');
assert.equal(makeQrInput('').error,'empty');
assert.equal(makeQrInput('x'.repeat(901)).error,'long');
const base=initialState();
assert.equal(base.timers.items.length,4);
const unsafe={version:1,state:{sound:false,dice:{count:99,values:[0,9],history:[]},wheel:{names:['Alice','ALICE'],winner:'zz'},scoreboard:{teams:[]},timers:{items:[{id:'evil',durationSeconds:99999,remainingMs:-8,running:true,endsAt:null}]},qr:{input:'x'.repeat(1500)}}};
const safe=sanitizeState(unsafe);
assert.equal(safe.sound,false);
assert.equal(safe.dice.count,6);
assert.deepEqual(safe.dice.values,[1,6]);
assert.equal(safe.wheel.names.length,4);
assert.equal(safe.scoreboard.teams.length,4);
assert.equal(safe.timers.items[0].running,false);
assert.equal(safe.timers.items[0].durationSeconds,3600);
assert.equal(safe.qr.input.length,900);
assert.equal(sanitizeState({version:0,state:{}}).dice.count,2);

const jsx=readFileSync(new URL('../src/components/BrianInstantTools/BrianInstantTools.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/components/BrianInstantTools/BrianInstantTools.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const spec=readFileSync(new URL('../docs/brian-instant-tools-wave1-spec.md',import.meta.url),'utf8');
for(const name of ['DiceTool','WheelTool','ScoreboardTool','TimerTool','QrTool'])assert.ok(jsx.includes('function '+name+'('),name+' missing');
assert.match(jsx,/QRCode\.toDataURL/);
assert.match(jsx,/createPortal/);
assert.match(jsx,/window\.localStorage\.setItem/);
assert.match(jsx,/window\.confirm/);
assert.match(jsx,/aria-modal="true"/);
assert.match(jsx,/currentUser/);
assert.doesNotMatch(jsx,/supabase\.from|fetch\(|axios|aiProviders/);
assert.match(css,/var\(--bes-floating-edge,24px\)/);
assert.match(css,/var\(--bes-floating-diameter,62px\)/);
assert.match(css,/var\(--bes-floating-gap,14px\)/);
assert.match(css,/@media\(max-width:650px\)/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(main,/global-brian-instant-tools/);
assert.match(main,/const BrianInstantTools = lazy/);
for(const name of ['global-brian-focus','global-brian-teaching-board','shared-chatbot-drawer','ttcm-approval-inbox'])assert.ok(main.includes(name));
assert.match(spec,/Backend writes:\*\* none/);
console.log('PASS Brian Instant Tools: Dice/Wheel/Score/Timers/QR, safe local storage, role-key isolation, launcher and responsive portal contracts.');
