import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const glow=read('src/styles/BrianFloatingGlow.css');
const main=read('src/main.jsx');
const shared=read('src/styles/ThreeFloatingActions.css');
const motion=read('src/styles/UnifiedBubbleMotion.css');
const names=[
 '.bit-launcher','.bff-bubble','.bba-bubble','.bbd-board-fab',
 '.bfc-bubble','.bes-approval-root .bes-approval-fab',
 '.bes-kira-chat-root .bes-kira-chat-launcher'
];
function test(name,fn){fn();console.log('✓ '+name)}
test('All seven independent buttons receive distinct glowing color tokens',()=>{
 const lines=glow.split('\n');
 const colors=new Set();
 for(const selector of names){
   assert.ok(glow.includes(selector),selector+' must glow');
   const start=lines.findIndex(line=>line.includes('html body '+selector+' {'));
   assert.ok(start>=0,selector+' missing color token');
   const token=lines.slice(start,start+4).join('\n').match(/--bes-bubble-glow-rgb:([\d,]+)/);
   assert.ok(token,selector+' no colored halo');
   colors.add(token[1]);
 }
 assert.equal(colors.size,7,'Each bubble must have a distinct color');
});
test('Glow style loads after shared floating/motion CSS',()=>{
 const i=main.indexOf("import './styles/BrianFloatingGlow.css'");
 assert.ok(i>main.indexOf("import './styles/ThreeFloatingActions.css'"));
 assert.ok(i>main.indexOf("import './styles/UnifiedBubbleMotion.css'"));
});
test('Glow enhances idle, hover, keyboard focus and honors motion-off',()=>{
 assert.match(glow,/::before\s*\{/);
 assert.match(glow,/@keyframes bes-bubble-halo-pulse/);
 assert.match(glow,/@media\(hover:hover\)/);
 assert.match(glow,/:focus-visible\s*\{/);
 assert.match(glow,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(glow,/data-motion-bubble="none"/);
 assert.match(glow,/@media\(forced-colors:active\)/);
 assert.match(glow,/pointer-events:none/);
});
test('Never shift floating bubble positions, button size, or native transformations',()=>{
 assert.doesNotMatch(glow,/\b(?:right|bottom|top|left|width|height|padding)\s*:/);
 assert.doesNotMatch(glow,/(^|\n)\s*transform\s*:/);
 assert.doesNotMatch(glow,/setInterval|requestAnimationFrame|addEventListener/);
 assert.match(shared,/--bes-floating-edge/);
 assert.match(motion,/transform:translateY\(-3px\) scale\(1\.035\)/);
});
console.log('PASS: glowing, accessible, position-safe BRIAN bubble launchers.');
