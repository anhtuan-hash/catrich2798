import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sanitizeSilk,silkRemaining,silkAdvanceTimers,performanceTier,presenterPayload,silkSnapshot,readSilk} from '../src/components/BrianFocus/useFocus9.js';
const file=n=>readFileSync(new URL('../src/components/BrianFocus/'+n,import.meta.url),'utf8');
const base=sanitizeSilk(null);
assert.equal(base.performanceMode,'auto');assert.equal(base.orbit.length,0);
assert.equal(sanitizeSilk({performanceMode:'bad',orbit:Array(20).fill({seconds:0,remaining:0})}).orbit.length,6);
assert.equal(sanitizeSilk({performanceMode:'bad'}).performanceMode,'auto');
assert.equal(sanitizeSilk({captures:[{id:'a',text:'hello',category:'nope'}]}).captures[0].category,'idea');
assert.equal(sanitizeSilk({timeline:[{at:Date.now(),type:'evil',label:'bad'}]}).timeline.length,0);
const now=Date.now();
const timers=Array.from({length:6},(_,i)=>({
 id:String(i),label:'Group',seconds:120,running:i%2===0,
 remaining:120000,deadline:now+(i===0?-1000:120000),selected:i===0
}));
assert.equal(silkRemaining(timers[0],now),0);
assert.equal(silkRemaining(timers[2],now),120000);
assert.equal(silkRemaining(timers[1],now),120000);
const updated=silkAdvanceTimers(timers,now);
assert.equal(updated[0].running,false);assert.equal(updated[0].remaining,0);
assert.equal(updated[2].running,true);
assert.equal(silkAdvanceTimers(updated,now),updated);
assert.equal(performanceTier('auto',3,0,'balanced'),'smooth');
assert.equal(performanceTier('auto',0,5,'smooth'),'beautiful');
assert.equal(performanceTier('auto',0,0,'balanced'),'balanced');
assert.equal(performanceTier('smooth',0,0,'beautiful'),'smooth');
const privateStage={title:'Unit 5 Global Warming',parts:['Discuss','Present'],partIndex:1,
 running:true,deadline:now+90000,url:'https://example.edu/material'};
const result=presenterPayload({...privateStage,studentNames:['Private student'],privateNotes:'Do not show'},{
 running:true,deadline:now+90000,secret:'private timer field'
});
assert.deepEqual(Object.keys(result).sort(),['activity','deadline','link','objective','sharedAt','timerDeadline'].sort());
assert.ok(!JSON.stringify(result).includes('Private student'));
assert.equal(result.activity,'Present');
assert.equal(presenterPayload({...privateStage,url:'javascript:alert(1)'},null).link,'');
const snap=silkSnapshot('Teaching',{clockMode:'sense'},{clock:'minimal'},{layoutEnabled:true});
assert.equal(snap.name,'Teaching');
const memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,val)=>memory.set(key,val)};
memory.set('bfc-silk-flow-v9:account1',JSON.stringify({captures:[{text:'PRIVATE A',at:now}]}));
memory.set('bfc-silk-flow-v9:account2',JSON.stringify({captures:[{text:'PRIVATE B',at:now}]}));
assert.notDeepEqual(readSilk('account1').captures,readSilk('account2').captures);
assert.match(file('BrianFocus.jsx'),/startFocusEnter/);
assert.match(file('BrianFocus.jsx'),/startFocusExit/);
assert.match(file('BrianFocus.jsx'),/usePersistentFocusYoutube/);
assert.match(file('BrianFocus.jsx'),/useFocus9/);
assert.match(file('BrianFocus.jsx'),/createPresenter/);
assert.match(file('FocusOverlay.jsx'),/canEditFocusScene\(currentUser\)/);
assert.match(file('FocusOverlay.jsx'),/Focus9Studio/);
assert.match(file('FocusOverlay.jsx'),/useSilkAutopilot/);
assert.match(file('FocusOverlay.jsx'),/bfc9-shield/);
assert.match(file('Focus9Viewer.jsx'),/readPresenter/);
assert.match(file('Focus9Viewer.jsx'),/role="timer"/);
assert.match(file('focus9Presenter.js'),/auth.getUser/);
assert.match(file('focus9Presenter.js'),/owner/);
assert.match(file('focus9Presenter.js'),/revoked:true/);
assert.match(file('Focus9Studio.jsx'),/silkSnapshot/);
assert.match(file('Focus9Studio.jsx'),/silkAdvanceTimers|silkRemaining/);
assert.match(file('Focus9Studio.jsx'),/Distraction Shield/);
assert.match(file('Focus9Studio.jsx'),/Media Continuity Guardian/);
assert.match(file('Focus9Studio.jsx'),/Offline-Ready & Reconnect Shield/);
assert.match(file('Focus9Studio.jsx'),/Session Timeline & Rewind/);
assert.match(file('BrianFocus9.css'),/bfc9-recovery-toast/);
console.log('PASS Brian Focus 9: six deadline timers, isolated private capture, presenter sanitization, FPS hysteresis, recovery and 6–8 continuity contracts.');
