import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLocalAudioWav,createIOSMediaSounds} from '../src/components/BrianBombArena/arenaIOSAudio.js';
import {createArenaSound} from '../src/components/BrianBombArena/arenaSound.js';

const check=(name,fn)=>{fn();console.log('✓ '+name);};
const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
const originalAudio=globalThis.Audio;
const players=[];
const mediaSession={type:'ambient'};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15',
  maxTouchPoints:5,audioSession:mediaSession,
}});
class FakeAudio{
  constructor(src=''){
    this.src=src;this.readyState=0;this.volume=1;this.playCount=0;players.push(this);
  }
  setAttribute(){}
  pause(){}
  load(){}
  removeAttribute(){}
  play(){this.playCount++;return Promise.resolve();}
}
globalThis.Audio=FakeAudio;
try{
  check('All sound categories produce locally encoded PCM RIFF/WAVE blobs',()=>{
    for(const category of ['flip','points','bigpoints','bomb','bank','wrong','win']){
      const wav=createLocalAudioWav(category);
      assert.equal(wav.type,'audio/wav');assert.ok(wav.size>1000);
    }
  });
  check('Browser user agent is recognized as iOS without extra libraries',()=>{
    const engine=createIOSMediaSounds();
    assert.equal(engine.isIOS(),true);
    engine.close();
  });
  check('Sound engine uses media elements for scoring, not a suspended iOS AudioContext',()=>{
    const engine=createArenaSound();
    const before=players.length;
    assert.equal(engine.play('points',{volume:75}),true);
    assert.equal(players.length,before+1);
    assert.equal(players.at(-1).playCount,1);
    assert.match(players.at(-1).src,/^blob:/);
    assert.equal(mediaSession.type,'playback');
    engine.close();
  });
  check('The recorded explosion uses an offline local WAV fallback on iOS when media is not ready',()=>{
    const engine=createArenaSound();
    const before=players.length;
    assert.equal(engine.play('bomb',{style:'recorded',volume:85}),true);
    assert.ok(players.length>=before+2); // remote attempted preload + immediate local fallback
    assert.match(players.at(-1).src,/^blob:/);
    assert.equal(players.at(-1).playCount,1);
    engine.close();
  });
  check('iOS can request audio playback even in silent-switch mode using playback session',()=>{
    const player=createIOSMediaSounds();
    mediaSession.type='ambient';
    player.play('bank',80);
    assert.equal(mediaSession.type,'playback');
    assert.equal(players.at(-1).playCount,1);
    player.close();
  });
  check('iOS UI includes test controls and opt-in FX, while Reduce Motion preserves visible feedback',()=>{
    const jsx=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.jsx',import.meta.url),'utf8');
    const css=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.css',import.meta.url),'utf8');
    assert.match(jsx,/const testAudio=/);assert.match(jsx,/const testVisual=/);
    assert.match(jsx,/soundRef\.current\.unlock/);
    assert.match(jsx,/onClick=\{testAudio\}/);assert.match(jsx,/onClick=\{testVisual\}/);
    assert.match(jsx,/bba-allow-fx/);assert.match(css,/prefers-reduced-motion:reduce/);
    assert.match(css,/bba-fx-fireball/);assert.match(css,/bba-allow-fx/);
    assert.match(css,/position:fixed!important/);
  });
  console.log('PASS: iOS audio route, local WAV generation, playback activation and visible FX fallback.');
}finally{
  if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);
  else delete globalThis.navigator;
  if(originalAudio===undefined)delete globalThis.Audio;
  else globalThis.Audio=originalAudio;
}
