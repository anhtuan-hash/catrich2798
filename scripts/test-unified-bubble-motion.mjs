import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const global=read('src/utils/globalMotionSystem.js');
const panel=read('src/components/admin/GlobalMotionAdminPanel.jsx');
const motion=read('src/utils/bubbleMotion.js');
const css=read('src/styles/UnifiedBubbleMotion.css');
const bomb=read('src/components/BrianBombArena/BrianBombArena.jsx');
const instant=read('src/components/BrianInstantTools/BrianInstantTools.jsx');
const focus=read('src/components/BrianFocus/BrianFocus.jsx');
const board=read('src/components/BrianBoard/BrianBoard.jsx');
const main=read('src/main.jsx');
const test=(name,fn)=>{fn();console.log('✓ '+name);};
test('One existing Motion Hub controls six shared floating-app effects',()=>{
 assert.match(global,/bubble: 'motionBubble'/);
 assert.match(global,/bubble: Object\.freeze\(/);
 for(const id of ['none','fade','zoom','glide','spring','cinematic'])assert.ok(global.includes("option('"+id+"'"));
 assert.match(panel,/SLOT_ORDER = \[[^\]]*'bubble'/);
 assert.match(global,/interaction: 'none', bubble: 'none'/);
 assert.match(global,/interaction: 'soft-press', bubble: 'zoom'/);
});
test('Shared timings honor OS Reduced Motion and global disable',()=>{
 assert.match(motion,/getGlobalMotionConfig/);
 assert.match(motion,/prefers-reduced-motion: reduce/);
 assert.match(motion,/effect==='none'\|\|reduced\?0/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/data-motion-bubble="none"/);
 assert.match(css,/--gm-slow/);
});
test('Bomb and Instant portals remain mounted during reversible closing',()=>{
 assert.match(bomb,/portalExitPending\.current=true;setPortalExiting\(true\)/);
 assert.match(bomb,/data-bubble-phase=\{portalExiting\?'exit':'enter'\}/);
 assert.match(bomb,/portalExitTimer\.current=window\.setTimeout\(finishPortalClose,duration\)/);
 assert.match(instant,/portalExitPending\.current=true;setPortalExiting\(true\)/);
 assert.match(instant,/data-bubble-phase=\{portalExiting\?'exit':'enter'\}/);
 assert.match(instant,/portalExitTimer\.current=window\.setTimeout\(finishClose,duration\)/);
 assert.match(instant,/onClick=\{closePanel\}/);
});
test('Focus and Board preserve their own transitions but honor motion-off',()=>{
 assert.match(focus,/readBubbleMotion\(\)\.duration === 0/);
 assert.match(board,/readBubbleMotion\(\)\.duration===0/);
 assert.match(focus,/startFocusEnter/);
 assert.match(board,/animating\.current=true;setPhase\('exiting'\)/);
 assert.match(board,/await persist\(docRef\.current\)/);
});
test('Launcher hover & app motion coexist with drawing and scoring',()=>{
 for(const selector of ['.bba-bubble','.bit-launcher','.bbd-board-fab','.bfc-bubble'])assert.ok(css.includes(selector));
 assert.match(css,/\.bba-shell \.bba-panel/);
 assert.match(css,/\.bba-shell \.bba-hero-icon/);
 assert.match(css,/never animate the tile hitbox/i);
 assert.match(bomb,/type:'ANSWER_CHOICE'/);
 assert.match(main,/UnifiedBubbleMotion\.css/);
 assert.ok(!css.includes('animation:infinite')&&!css.includes('setInterval('));
});
console.log('PASS: unified Bubble Motion settings and enter/exit lifecycle contracts.');
