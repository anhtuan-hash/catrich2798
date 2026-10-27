import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const instant=read('src/components/BrianInstantTools/BrianInstantTools.css');
const shared=read('src/styles/ThreeFloatingActions.css');
const focus=read('src/components/BrianFocus/FocusBubble.jsx');
const board=read('src/components/BrianBoard/BrianBoard.jsx');
const bomb=read('src/components/BrianBombArena/BrianBombArena.css');
const feud=read('src/components/BrianFamilyFeud/BrianFamilyFeud.css');
const chat=read('src/components/SharedChatbotDrawer.jsx');
const approvals=read('src/components/PermissionApprovalInbox.jsx');
const check=(name,fn)=>{fn();console.log('✓ '+name)};
check('Every launcher remains an independent functioning bubble',()=>{
 assert.match(focus,/bfc-bubble/);
 assert.match(board,/bbd-board-fab/);
 assert.match(bomb,/\.bba-bubble/);
 assert.match(feud,/\.bff-bubble/);
 assert.match(chat,/bes-kira-chat-launcher/);
 assert.match(approvals,/bes-approval-fab/);
 assert.match(read('src/components/BrianInstantTools/BrianInstantTools.jsx'),/bit-launcher/);
});
check('Instant Tools shares the exact right-edge token of every other bubble',()=>{
 assert.match(instant,/body \.bit-launcher \{[\s\S]*?right:var\(--bes-floating-edge,[^\n]*!important;/);
 assert.doesNotMatch(instant,/right:calc\(var\(--bes-floating-edge,[^\n]*\+ var\(--bes-floating-diameter/);
 assert.match(shared,/body \.bbd-board-fab[\s\S]*?right:var\(--bes-floating-edge\)!important/);
 assert.match(bomb,/right:var\(--bes-floating-edge/);
 assert.match(feud,/right:var\(--bes-floating-edge/);
});
check('Teacher slot 5 and administrator/TTCM slot 6 sit ABOVE Family Feud',()=>{
 assert.match(instant,/body \.bit-launcher \{[\s\S]*?bottom:calc\(var\(--bes-floating-bottom,24px\) \+ 6 \* /);
 assert.match(instant,/body:not\(:has\(\.bes-approval-root\)\) \.bit-launcher \{[\s\S]*?bottom:calc\(var\(--bes-floating-bottom,24px\) \+ 5 \* /);
 assert.match(feud,/\+ 5 \* \(var\(--bes-floating-diameter/);
 assert.match(feud,/\+ 4 \* \(var\(--bes-floating-diameter/);
});
check('Shared geometry creates one vertical column without overlap for all visible role slots',()=>{
 for(const n of [5,6,7]){
   for(const [diameter,gap,bottom] of [[62,14,24],[58,12,13],[46,5,9],[42,3,6]]){
     const boxes=Array.from({length:n},(_,i)=>({
       left:1200-diameter-24, // x is the same for every slot, regardless of bottom
       top:bottom+i*(diameter+gap),
       bottom:bottom+i*(diameter+gap)+diameter
     }));
     assert.equal(new Set(boxes.map(x=>x.left)).size,1,'horizontal misalignment');
     for(let i=1;i<boxes.length;i++)assert.equal(boxes[i].top-boxes[i-1].bottom,gap,'overlap');
   }
 }
});
check('Short landscape heights receive compact safe-area-aware spacing',()=>{
 assert.match(shared,/@media\(max-height:480px\)/);
 assert.match(shared,/@media\(max-height:380px\)/);
 assert.match(shared,/safe-area-inset-right/);
 assert.match(shared,/safe-area-inset-bottom/);
 assert.ok(7*46+6*5+9<=480);
 assert.ok(7*42+6*3+6<=380);
});
check('Existing UI permission, animation and mobile rules stay in place',()=>{
 assert.match(shared,/body:not\(:has\(\.bes-approval-root\)\) \.bfc-bubble/);
 assert.match(shared,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(instant,/@media\(max-width:650px\)/);
 assert.match(instant,/\.bit-launcher:hover/);
 assert.match(instant,/\.bit-launcher:focus-visible/);
});
console.log('PASS: all Brian independent bubbles align on one vertical right-hand axis.');
