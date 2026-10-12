import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=load('src/pages/GradebookStudio.jsx');
const workspace=load('src/components/gradebook/GradebookWorkspace.jsx');
const engine=load('src/components/gradebook/GradebookEngine.jsx');
const css=load('src/styles/GradebookAcademicWorkspace.css');

test('Academic Workspace owns Gradebook hero, not a DOM observer',()=>{
  assert.match(page,/className="gradebook-studio-hero gb-academic-hero"/);
  assert.match(page,/gradebook-studio-hero gb-academic-hero/);
  assert.match(page,/setWorkspaceId\(item.id\)/);
  assert.doesNotMatch(workspace,/installGradebookMaterialHero|GradebookEditorialV2|GradebookMaterialHeroRuntime|GradebookColorfulWorkspace|GradebookApprovedV2|GradebookApprovedMockupFour/);
  assert.match(page,/import '\.\.\/styles\/GradebookAcademicWorkspace.css'/);
});
test('Class-management, assignments, support, grading, and export actions still exist',()=>{
  assert.match(page,/onClick=\{\(\) => openAssignment\(assignment\)\}/);
  assert.match(page,/setCreateOpen\(\(value\) => !value\)/);
  assert.match(page,/setView\('students'\)/);
  assert.match(page,/teachingOverview=\{teachingOverview\} classManagement=\{classManagement\}/);
  assert.match(engine,/className="gb-academic-administration"/);
  assert.match(workspace,/onClick=\{openStudentSupport\}/);
  assert.match(engine,/onClick=\{save\}>Lưu điểm/);
  assert.match(engine,/onClick=\{discard\}>Hoàn tác/);
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
});
test('Score storage and automatic scores remain unchanged',()=>{
  assert.match(engine,/gradeRoundBonus\(activeRound/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/renderRegularTable\(/);
  assert.match(engine,/renderExamTable\(/);
  assert.match(engine,/renderSummary\(/);
  assert.match(engine,/value=\{activeSubjectKey\} onChange=\{\(event\) => setActiveSubjectKey\(event.target.value\)\}/);
});
test('Visual styling does not override global navigation or footer',()=>{
  assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
  assert.match(css,/#root \.gradebook-studio/);
  assert.match(css,/@media\(max-width:500px\)/);
});
