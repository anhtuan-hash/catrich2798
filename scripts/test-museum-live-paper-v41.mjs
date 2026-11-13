import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LIVE_STAGES,LIVE_TOTAL_MINUTES,LIVE_PERIOD_MINUTES} from '../src/features/immersive-gallery/v3/liveLesson.js';
const component=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx','utf8');
const styles=fs.readFileSync('src/features/immersive-gallery/v3/museumLivePaper.css','utf8');
const cards=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLivePaperCards.jsx','utf8');
const art=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLivePaperArt.jsx','utf8');
test('all eleven lesson stages render inside one shared paper shell without replacing the real lesson model',()=>{
 assert.equal(LIVE_STAGES.length,11);
 assert.equal(LIVE_TOTAL_MINUTES,90);
 assert.deepEqual(LIVE_PERIOD_MINUTES,[45,45]);
 assert.match(component,/bml-live-screen--paper/);
 assert.match(component,/MuseumLivePaperArt/);
 assert.match(component,/MuseumLivePaperCards/);
 assert.match(component,/data-stage-index=\{currentIndex\}/);
 assert.match(component,/stage\?\.kind==='vote'/);
 assert.match(component,/stage\?\.kind==='quiz'/);
 assert.match(component,/!\['vote','quiz'\]\.includes\(stage\.kind\)/);
 assert.match(styles,/\.bml-live-screen--paper:fullscreen/);
 assert.match(styles,/\.bml-live-slide\{[\s\S]*overflow-x:hidden;overflow-y:auto/);
 assert.match(styles,/\.bml-live-bottom\{[\s\S]*display:grid/);
});
test('each non-quiz, non-vote stage has its own distinct plan; no fake research results',()=>{
 const specialized=LIVE_STAGES.filter(s=>!['vote','quiz'].includes(s.kind));
 for(const s of specialized){
  assert.ok(cards.includes("'"+s.id+"':["),'Missing paper-card plan for '+s.id);
 }
 assert.equal(specialized.length,8);
 assert.doesNotMatch(cards,/(?:75%|180 g|45 g|students saved|survey found)/i);
 assert.match(component,/surveyChartPng\(state\.survey\)/);
 assert.match(component,/state\?\.survey/);
});
test('teacher resources are not placed over the screen and original controls still work',()=>{
 assert.match(component,/showResources\?<div className="bml-paper-resource-drawer"/);
 assert.match(component,/setShowResources/);
 assert.match(component,/onClick=\{fullscreen\}/);
 assert.match(component,/onClick=\{\(\)=>act\('next'\)\}/);
 assert.match(component,/onClick=\{\(\)=>act\('previous'\)\}/);
 assert.match(component,/onClick=\{\(\)=>act\('pause'\)\}/);
 assert.match(component,/onClick=\{freeze\}/);
 assert.match(component,/showNotes\?<div className="bml-live-notes"/);
 assert.match(component,/session\.stageOpen/);
 assert.doesNotMatch(styles,/\.bml-appbar|\.bml-sidebar|\.brian-(?:navbar|header)/);
});
test('paper art is vector, accessible decoration, not a remote fetch or screen-image overlay',()=>{
 assert.match(art,/<svg className="bml-paper-illustration"/);
 assert.match(art,/aria-hidden="true"/);
 assert.match(art,/<path /);
 assert.match(art,/<circle /);
 assert.doesNotMatch(art,/fetch\(|https?:\/\//);
 assert.match(styles,/prefers-reduced-motion/);
});
