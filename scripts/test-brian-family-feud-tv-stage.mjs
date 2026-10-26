import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFamilyFeud,feudReducer} from '../src/components/BrianFamilyFeud/familyFeudEngine.js';
import {FAMILY_FEUD_BANK} from '../src/components/BrianFamilyFeud/familyFeudBank.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('src/components/BrianFamilyFeud/BrianFamilyFeud.jsx');
const tv=read('src/components/BrianFamilyFeud/FamilyFeudTV.css');
const legacy=read('src/components/BrianFamilyFeud/BrianFamilyFeud.css');
const main=read('src/main.jsx');
const motion=read('src/utils/bubbleMotion.js');
const check=(description,run)=>{run();console.log('✓ '+description);};

check('Large heading, team score, answer text and answer numbers use dedicated TV styles',()=>{
 assert.match(ui,/className="bff-tv-question"/);
 assert.match(ui,/data-classroom-ui="v2"/);
 assert.match(ui,/import '\.\/FamilyFeudTV\.css'/);
 for(const selector of [
  '.bff-tv-question','.bff-team .bff-score-number','.bff-team button',
  '.bff-answer-tile','.bff-answer-rank','.bff-answer-text',
  '.bff-answer-points','.bff-round-banner','.bff-actions .bff-action',
  '.bff-control-card','.bff-board-panel'
 ])assert.ok(tv.includes(selector),'TV missing '+selector);
 assert.match(tv,/--bff-font-bonus/);
 assert.match(tv,/font-size:clamp\(31px,calc\(2\.65vw/);
 assert.match(tv,/min-height:clamp\(63px,7\.3vh,93px\)/);
 assert.match(tv,/grid-template-columns:minmax\(0,2\.45fr\) minmax\(300px,1fr\)/);
});
check('Real A-/A+ controls change typography and persist on device',()=>{
 assert.match(ui,/FONT_STEPS=\[\.94,1\.06,1\.18,1\.3,1\.42\]/);
 assert.match(ui,/bff-classroom-font-scale/);
 assert.match(ui,/setFontScale\(value=>/);
 assert.match(ui,/changeScale\(-1\)/);
 assert.match(ui,/changeScale\(1\)/);
 assert.match(ui,/aria-label=\{tr\('Tăng cỡ chữ'/);
 assert.match(ui,/aria-label=\{tr\('Giảm cỡ chữ'/);
 assert.match(ui,/--bff-font-bonus':Math\.round\(\(fontScale-1\.18\)\*40\)\+'px'/);
});
check('Score visibly counts up with requestAnimationFrame while the reducer remains authoritative',()=>{
 assert.match(ui,/function LiveTeamScore\(/);
 assert.match(ui,/requestAnimationFrame\(tick\)/);
 assert.match(ui,/cancelAnimationFrame\(raf\)/);
 assert.match(ui,/Math\.round\(from\+\(value-from\)\*ease\)/);
 assert.match(ui,/<LiveTeamScore value=\{team\.score\} animate=\{motionOn\}\/>/);
 assert.match(tv,/@keyframes bff-stage-score-pop/);
});
check('Starting rounds, advancing and banking use distinct game-show effects',()=>{
 assert.match(ui,/animate\('round',tr\('BẮT ĐẦU!'/);
 assert.match(ui,/animate\('score',tr\('ĐÃ CHỐT ĐIỂM!'/);
 assert.match(ui,/const isFinal=game\.roundIndex\+1>=game\.roundLimit/);
 assert.match(ui,/animate\(isFinal\?'win':'round'/);
 assert.match(ui,/data-round-scene="enter"/);
 assert.match(ui,/key=\{'round-'\+game\.roundIndex\}/);
 assert.match(tv,/@keyframes bff-stage-sweep/);
 assert.match(tv,/@keyframes bff-stage-board/);
 assert.match(tv,/@keyframes bff-stage-tile/);
 assert.match(tv,/@keyframes bff-stage-reveal/);
 assert.match(tv,/@keyframes bff-stage-strike/);
 assert.match(tv,/@keyframes bff-stage-overlay-in/);
});
check('Result FX still uses the original controlled lifecycle and cleanup',()=>{
 assert.match(ui,/window\.clearTimeout\(fxTimer\.current\)/);
 assert.match(ui,/fxTimer\.current=window\.setTimeout\(\(\)=>setFx\(null\),/);
 assert.match(ui,/const doReveal=index=>/);
 assert.match(ui,/dispatch\(\{type:'REVEAL',index\}\)/);
 assert.match(ui,/dispatch\(\{type:'STRIKE'\}\)/);
 assert.match(ui,/dispatch\(\{type:'NEXT_ROUND'\}\)/);
 assert.match(ui,/dispatch\(\{type:'END_ROUND'\}\)/);
});
check('Reduced Motion, global Motion OFF, short projectors and smartphone access',()=>{
 assert.match(tv,/\[data-motion-kind="none"\] \*/);
 assert.match(tv,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(tv,/@media \(min-width:1100px\) and \(max-height:960px\)/);
 assert.match(tv,/@media\(max-width:1080px\)/);
 assert.match(tv,/@media\(max-width:790px\)/);
 assert.match(tv,/@media\(max-width:420px\)/);
 assert.match(motion,/prefers-reduced-motion: reduce/);
 assert.match(ui,/const motion=readBubbleMotion\(\)/);
});
check('Core scoring, three-strike steals and original app mounts remain safe',()=>{
 const start=()=>feudReducer(createFamilyFeud({bank:FAMILY_FEUD_BANK,teamCount:2,roundLimit:3}),{type:'START_ROUND'});
 let s=start();
 s=feudReducer(s,{type:'REVEAL',index:0});
 assert.equal(s.pointsPot,32);
 assert.equal(s.teams[0].score,0);
 for(let i=0;i<3;i++)s=feudReducer(s,{type:'STRIKE'});
 assert.equal(s.phase,'steal');
 s=feudReducer(s,{type:'STRIKE'});
 assert.equal(s.teams[0].score,32);
 assert.match(main,/<BrianBombArena currentUser=\{currentUser\} language=\{language\}\/>/);
 assert.match(main,/<BrianFamilyFeud key=\{currentUser\.id\} currentUser=\{currentUser\} language=\{language\}\/>/);
 assert.ok(legacy.includes('.bff-strikes'));
});
console.log('PASS: Brian Family Feud TV-first Stage v2 readability, motion, accessibility, scoring and regression guards.');
