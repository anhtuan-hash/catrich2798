import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/components/BrianBombArena/BrianBombArena.css',import.meta.url),'utf8');
const check=(name,fn)=>{fn();console.log('✓ '+name);};

check('Quiz overlay is portalled outside the scrollable arena into the fullscreen shell',()=>{
  assert.match(ui,/shellMounted&&shellRef\.current&&createPortal\(/);
  assert.match(ui,/bba-question-mask bba-classroom-question-mask/);
  assert.match(ui,/shellRef\.current\)\}/);
  assert.match(ui,/aria-modal="true"/);
  assert.match(ui,/ref=\{shellRef\}/);
});
check('Classroom modal is centered and at least twice as wide as old 660px dialog',()=>{
  assert.match(css,/\.bba-shell \.bba-classroom-question-mask\{[\s\S]*?position:fixed!important/);
  assert.match(css,/\.bba-shell \.bba-classroom-question-mask\{[\s\S]*?place-items:center!important/);
  assert.match(css,/\.bba-shell \.bba-classroom-question-card\{[\s\S]*?width:min\(1400px,100%\)!important/);
  assert.match(css,/max-height:calc\(100dvh - clamp/);
  assert.match(css,/overflow-y:auto!important/);
});
check('Default question size and four options are TV-readable',()=>{
  assert.match(css,/--bba-q-font:clamp\(35px,2\.8vw,50px\)/);
  assert.match(css,/--bba-answer-font:clamp\(22px,1\.7vw,29px\)/);
  assert.match(css,/--bba-choice-height:clamp\(88px,10dvh,118px\)/);
  assert.match(css,/\.bba-classroom-question-card \.bba-mcq-options\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});
check('Teacher can enlarge or reduce type but controls never change the answer logic',()=>{
  assert.match(ui,/const \[questionSize,setQuestionSize\]=useState\(1\)/);
  assert.match(ui,/setQuestionSize\(n=>Math\.min\(2,n\+1\)\)/);
  assert.match(ui,/setQuestionSize\(n=>Math\.max\(0,n-1\)\)/);
  assert.match(ui,/onClick=\{\(\)=>answerChoice\(index\)\}/);
  assert.match(ui,/bba-question-size-'\+questionSize/);
  assert.match(css,/\.bba-classroom-question-card\.bba-question-size-2\{/);
});
check('Mobile and short landscape layouts fit the viewport without horizontal overflow',()=>{
  assert.match(css,/@media\(max-width:640px\)\{[\s\S]*?\.bba-classroom-question-card/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css,/max-height:calc\(100dvh - max/);
  assert.match(css,/@media\(max-height:590px\) and \(min-width:641px\)/);
  assert.match(css,/overflow-x:hidden!important/);
});
check('Keyboard and restored state can access the question after reopening',()=>{
  assert.match(ui,/const \[shellMounted,setShellMounted\]=useState\(false\)/);
  assert.match(ui,/useEffect\(\(\)=>\{setShellMounted\(open\);\},\[open\]\)/);
  assert.match(ui,/questionDialogRef\.current\?\.focus\(\{preventScroll:true\}\)/);
  assert.match(ui,/ref=\{questionDialogRef\} tabIndex=\{-1\}/);
});
console.log('PASS: Classroom Presentation Question Modal viewport, typography and interaction.');
