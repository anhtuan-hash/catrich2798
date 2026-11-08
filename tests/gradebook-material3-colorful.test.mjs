import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const engine=read('src/components/gradebook/GradebookMacEngine.jsx');
const workspace=read('src/components/gradebook/GradebookWorkspace.jsx');
const css=read('src/components/gradebook/GradebookMacEngine.css');
const hero=read('src/styles/GradebookHeroCommand.css');
test('current Gradebook native colorful art and CMS media preserve the visual owner',()=>{
  for(const token of [
   'gbmac-hero-command','gbmac-hero-default-art','gbmac-art-chip is-blue',
   'gbmac-art-chip is-peach',"gradebookHero.backgroundType === 'video'",
   'onPreview={setGradebookHeroPreview}',"import '../styles/GradebookHeroCommand.css'"
  ])assert.ok(page.includes(token),'Missing current media feature '+token);
  assert.match(hero,/gbmac-hero-media/);
  assert.match(hero,/backdrop-filter: blur\(11px\)/);
  assert.doesNotMatch(workspace,/GradebookApprovedMockupFour|GradebookColorfulWorkspace/);
});
test('all seven color tones relate to real score views and KPI data',()=>{
  for(const tone of ['blue','red','yellow','green','purple','orange','cyan'])
    assert.ok(css.includes('.gbmac-tabs button[data-tone="'+tone+'"]'),tone);
  for(const token of ['totalRegularColumns','completedFourRounds','students.length','activeRoundCoverage'])
    assert.ok(engine.includes(token),'Gradebook calculation missing '+token);
  assert.match(engine,/gradeRoundBonus\(activeRound/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
});
test('teacher assignments, classes and student support are still wired',()=>{
  for(const token of [
    'onClick={() => openAssignment(assignment)}','const switchGradebookClass = (nextId) =>',
    'if (!canLeaveGradebook()) return','onClick={openStudentRoster}',
    'onClick={()=>setCreateOpen(value=>!value)}',
  ])assert.ok(page.includes(token),'Missing class operation '+token);
  assert.match(engine,/\{teachingOverview\}/);
  assert.match(engine,/\{classManagement\}/);
  assert.match(workspace,/openStudentSupport/);
  assert.match(engine,/onClick=\{save\}/);
  assert.match(engine,/onClick=\{discard\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
});
test('score data/Excel/PDF and sticky 42-column safety remain intact',()=>{
  for(const token of [
    'await onCommit(', 'onClick={openClassGradebook}',
    'exportClassGradebookXlsx(', 'exportStudentGradeReportPdf(',
  ])assert.ok(engine.includes(token),'Data/export operation missing '+token);
  assert.match(css,/\.gbmac-table-viewport[\s\S]*?overflow:auto/);
  assert.match(css,/position:sticky;left:0/);
  assert.match(css,/position:sticky;left:60px/);
  assert.match(css,/\.gbmac-table input\.hr-grade-input/);
});
test('styles remain scoped and responsive without altering the footer/navbar',()=>{
  assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
  assert.doesNotMatch(hero,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(hero,/@media/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
