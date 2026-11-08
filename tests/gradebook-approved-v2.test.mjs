import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=load('src/pages/GradebookStudio.jsx');
const workspace=load('src/components/gradebook/GradebookWorkspace.jsx');
const compat=load('src/components/gradebook/GradebookEngine.jsx');
const engine=load('src/components/gradebook/GradebookMacEngine.jsx');
const css=load('src/components/gradebook/GradebookMacEngine.css');
const hero=load('src/styles/GradebookHeroCommand.css');

test('Gradebook v4 owns editable picture/video hero without DOM injection',()=>{
  assert.match(page,/gbmac-hero-command/);
  assert.match(page,/gbmac-hero-media/);
  assert.match(page,/gradebookHero\.backgroundType === 'video'/);
  assert.match(page,/onPreview=\{setGradebookHeroPreview\}/);
  assert.match(page,/canEditGradebookHero \? <button/);
  assert.match(page,/import '\.\.\/styles\/GradebookHeroCommand\.css'/);
  assert.match(compat,/GradebookMacEngine\.jsx/);
  assert.doesNotMatch(workspace,/installGradebookMaterialHero|GradebookEditorialV2|GradebookMaterialHeroRuntime|GradebookColorfulWorkspace|GradebookApprovedV2|GradebookApprovedMockupFour/);
});
test('Assignments, class switches, student support, grading and export remain wired',()=>{
  assert.match(page,/onClick=\{\(\) => openAssignment\(assignment\)\}/);
  assert.match(page,/const switchGradebookClass = \(nextId\) =>/);
  assert.match(page,/if \(!canLeaveGradebook\(\)\) return/);
  assert.match(page,/onClick=\{openStudentRoster\}/);
  assert.match(page,/SubjectStudentsTab/);
  assert.match(engine,/\{teachingOverview\}/);
  assert.match(engine,/\{classManagement\}/);
  assert.match(engine,/onClick=\{save\}/);
  assert.match(engine,/onClick=\{discard\}/);
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
  assert.match(workspace,/openStudentSupport/);
});
test('Automatic scores use live data and the authorized commit method',()=>{
  assert.match(engine,/gradeRoundBonus\(activeRound/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/updateRegularScore/);
  assert.match(engine,/updateExamScore/);
  assert.match(engine,/gbmac-table-viewport/);
});
test('CSS remains locally scoped, responsive, and preserves sticky table',()=>{
  assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
  assert.doesNotMatch(hero,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
  assert.match(css,/\.gbmac-table-viewport[\s\S]*?overflow:auto/);
  assert.match(css,/position:sticky;left:0/);
  assert.match(css,/position:sticky;left:60px/);
  assert.match(hero,/backdrop-filter: blur\(11px\)/);
  assert.match(css,/@media/);
});
