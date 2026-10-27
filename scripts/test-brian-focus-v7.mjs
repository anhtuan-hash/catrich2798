import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseFocusYoutubeId,videoIdFromFocusPath} from '../src/components/BrianFocus/focusYoutube.js';
import {normalizeFocus7,getFocusInsights,readFocus7} from '../src/components/BrianFocus/useFocus7Data.js';
import {advanceFocusFlow} from '../src/components/BrianFocus/useFocus7Flow.js';

const file=n=>readFileSync(new URL('../src/components/BrianFocus/'+n,import.meta.url),'utf8');
const id='dQw4w9WgXcQ';
assert.equal(parseFocusYoutubeId('https://www.youtube.com/watch?v='+id),id);
assert.equal(parseFocusYoutubeId(id),id);
assert.equal(videoIdFromFocusPath('youtube:'+id),id);
assert.equal(videoIdFromFocusPath('https://www.youtube.com/watch?v='+id),'');
assert.equal(normalizeFocus7({favorites:[id,id,'https://youtu.be/'+id],videoOverride:id}).favorites.length,1);
assert.equal(normalizeFocus7({videoOverride:'https://evil.example/'+id}).videoOverride,'');
assert.deepEqual(normalizeFocus7({mood:'invalid',particle:'no',density:1000000}).mood,'auto');
assert.equal(normalizeFocus7({density:1000000}).density,100);
assert.equal(normalizeFocus7(null).clock,'inherit');
assert.equal(normalizeFocus7({clock:'kyoto'}).clock,'kyoto');
assert.equal(normalizeFocus7({clock:'liquid'}).clock,'liquid');
assert.equal(normalizeFocus7({flow:{work:0,rest:900,repeats:99}}).flow.repeats,10);
assert.equal(normalizeFocus7({journal:[{text:'note',mood:'good',at:1}]}).journal.length,1);
let workFlow={active:true,phase:'work',cycle:1,work:25,rest:5,repeats:4};
const actual=[];
for(let i=0;i<7;i++){const next=advanceFocusFlow(workFlow);actual.push(next.minutes);workFlow=next.flow;}
assert.deepEqual(actual,[5,25,5,25,5,25,0]);
assert.equal(workFlow.active,false);
let deep={active:true,phase:'work',cycle:1,work:50,rest:10,repeats:2};
deep=advanceFocusFlow(deep).flow;
assert.equal(deep.phase,'break');
assert.equal(advanceFocusFlow(deep).minutes,50);
assert.equal(advanceFocusFlow({active:true,phase:'work',cycle:2,repeats:2,work:50,rest:10}).minutes,0);
const now=new Date(2026,9,24,12).getTime();
const insights=getFocusInsights([{at:now,minutes:25},{at:now,minutes:50}].concat([{at:now,minutes:-1}]),now);
assert.equal(insights.totalMinutes,75);
assert.equal(insights.totalSessions,2);
assert.equal(insights.days.at(-1).sessions,2);
const slots=new Map();
globalThis.localStorage={getItem:key=>slots.get(key)??null,setItem:(key,value)=>slots.set(key,value)};
slots.set('bfc-living-atelier-v7:teacherA',JSON.stringify({journal:[{id:'1',text:'Private A',at:now}],favorites:[id]}));
slots.set('bfc-living-atelier-v7:teacherB',JSON.stringify({journal:[{id:'2',text:'Private B',at:now}]}));
assert.notDeepEqual(readFocus7('teacherA').journal,readFocus7('teacherB').journal);
assert.equal(readFocus7('teacherB').favorites.length,0);
const overlay=file('FocusOverlay.jsx'),parent=file('BrianFocus.jsx'),player=file('usePersistentFocusYoutube.jsx');
const studio=file('Focus7Studio.jsx'),flow=file('useFocus7Flow.js'),particles=file('Focus7Particles.jsx'),clock=file('HTCSenseClock.jsx');
const mixer=file('useFocusSoundMixer.js'),css=file('BrianFocus7.css');
assert.match(parent,/startFocusEnter/);assert.match(parent,/startFocusExit/);
assert.match(parent,/usePersistentFocusYoutube/);
// A teacher's personal YouTube override is now resolved by the local source
// chooser. Preserve its priority without bypassing Web Scenes selection.
assert.match(parent,/resolveFocusSessionScene\(scene, sourceChoice, focus7.videoOverride\)/);
assert.match(parent,/youtubePlayerScene = resolveFocusSessionScene\(scene, 'youtube', focus7.videoOverride\)/);
assert.match(file('focusSourceSelection.js'),/if \(videoOverride\)/);
assert.match(file('focusSourceSelection.js'),/parseFocusYoutubePlaylist\(\[videoOverride\]\)/);
assert.match(parent,/scene=\{mediaScene\}/);
assert.match(overlay,/canEditFocusScene\(currentUser\)/);
assert.match(overlay,/scene=\{sharedScene\|\|scene\}/);
assert.match(overlay,/Focus7Studio/);assert.match(overlay,/Focus7Particles/);
assert.match(player,/Closing the overlay must NEVER pause or unmount YouTube/);
assert.ok(player.includes('explicitlyStopped: true'));
assert.match(flow,/timerRef.current.startPreset/);
assert.match(particles,/cancelAnimationFrame/);
assert.match(particles,/browserFocusMotionBudget/);
assert.match(file('focusMotionBudget.js'),/prefers-reduced-motion/);
assert.match(mixer,/createStereoPanner/);assert.match(mixer,/source.stop\(\)/);
assert.match(clock,/bfc7-clock--/);
assert.match(css,/bfc7-classroom/);
for(const name of ['Cinematic Atmosphere Director','Signature Clock Atelier','Focus Flow Designer',
  'Invisible Smart Dock','Living Particle Engine','Spatial Soundscape 2.0','Cinema Media Studio',
  'Focus Journal & Rituals','Focus Insights','Classroom & Presentation Mode']){
 assert.ok(studio.includes(name),'Missing Studio feature: '+name);
}
console.log('PASS Brian Focus 7: canonical media IDs, bounded user state, independent profiles, real sessions, protected scene and ten connected Studio sections.');
