import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isAmericanVoice,rankAmericanVoices} from '../src/features/immersive-gallery/v3/americanVoices.js';
const read=p=>fs.readFileSync(p,'utf8');

test('US voice selector strictly filters to en-US and prioritizes enhanced voices',()=>{
 const source=[
  {name:'Generic British',lang:'en-GB',voiceURI:'gb',localService:true},
  {name:'Default English',lang:'en-US',voiceURI:'default',localService:true},
  {name:'Microsoft Jenny Online',lang:'en-US',voiceURI:'jenny',localService:false},
  {name:'Samantha',lang:'en_US',voiceURI:'samantha',localService:true},
  {name:'French narrator',lang:'fr-FR',voiceURI:'fr'}
 ];
 const sorted=rankAmericanVoices(source);
 assert.equal(sorted.length,3);
 assert.equal(sorted[0].voiceURI,'jenny');
 assert.ok(sorted.every(isAmericanVoice));
 assert.deepEqual(rankAmericanVoices([]),[]);
 assert.deepEqual(rankAmericanVoices(null),[]);
});
test('browser synthesis explicitly uses a chosen en-US voice, with no other-accent fallback',()=>{
 const speech=read('src/features/immersive-gallery/v3/MuseumVoiceover.jsx');
 assert.match(speech,/rankAmericanVoices\(window\.speechSynthesis\.getVoices\(\)\)/);
 assert.match(speech,/item\.lang='en-US';item\.voice=chosen/);
 assert.match(speech,/if\(!chosen\)/);
 assert.match(speech,/speechSynthesis\.cancel\(\)/);
 assert.match(speech,/voiceschanged/);
 assert.match(speech,/aria-label="American English voice"/);
 assert.doesNotMatch(speech,/lang='en-GB'/);
});
test('fullscreen root contains slide and shared presentation dock, preserving 11 stage and teaching actions',()=>{
 const teacher=read('src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx');
 const dock=read('src/features/immersive-gallery/v3/MuseumFullscreenDock.jsx');
 const css=read('src/features/immersive-gallery/v3/museumLivePresenter.css');
 assert.match(teacher,/bml-presenter-surface" ref=\{stageRef\}/);
 assert.match(teacher,/MuseumFullscreenDock language=\{language\}/);
 assert.match(teacher,/document\.fullscreenElement===stageRef\.current/);
 assert.match(teacher,/stageRef\.current\.requestFullscreen\(\)/);
 assert.match(teacher,/document\.addEventListener\('fullscreenchange'/);
 assert.match(teacher,/data-testid="museum-fullscreen-panel"/);
 assert.match(teacher,/activeTool==='voice'\?<MuseumVoiceover/);
 assert.match(teacher,/activeTool==='video'\?<MuseumVideoLab/);
 assert.match(teacher,/activeTool==='resources'/);
 assert.match(teacher,/activeTool==='qr'/);
 assert.match(teacher,/activeTool==='survey'/);
 assert.match(teacher,/activeTool==='groups'/);
 assert.match(teacher,/activeTool==='explain'/);
 assert.match(dock,/onAction\('next'\)/);
 assert.match(dock,/onAction\('previous'\)/);
 assert.match(dock,/onAction\('end'\)/);
 assert.match(css,/\.bml-presenter-surface:fullscreen/);
 assert.match(css,/\.bml-presenter-panel-layer/);
 assert.match(css,/overscroll-behavior:contain/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('fullscreen keyboard and optional focus mode remain accessible without hijacking text input',()=>{
 const teacher=read('src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx');
 const dock=read('src/features/immersive-gallery/v3/MuseumFullscreenDock.jsx');
 for(const key of ['arrowright','arrowleft','v','r','y','f'])
  assert.ok(teacher.includes("key==='"+key+"'"),'Missing shortcut '+key);
 assert.match(teacher,/\['input','textarea','select'\]\.includes\(tag\)/);
 assert.match(dock,/focusMode\?/);
 assert.match(dock,/onFocus/);
 assert.match(dock,/onExit/);
});
