import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const get=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=get('src/pages/GradebookStudio.jsx');
const engine=get('src/components/gradebook/GradebookEngine.jsx');
const workspace=get('src/components/gradebook/GradebookWorkspace.jsx');
test('Previous mockup 4 layout is safely superseded without feature removal',()=>{
  assert.match(page,/gb-academic-class-list/);
  assert.match(page,/gb-academic-primary-actions/);
  assert.match(engine,/\{teachingOverview\}/);
  assert.match(engine,/\{classManagement\}/);
  assert.match(engine,/GradebookNavigationPalette/);
  assert.match(engine,/gbv2-table-controls/);
  assert.match(workspace,/gbv2-support-extra/);
  assert.doesNotMatch(workspace,/import gradebookMockupFourCss/);
});
test('Header action requests are class-scoped and invoke existing report dialog',()=>{
  assert.match(page,/gradebookAction=\{gradebookAction\}/);
  assert.match(page,/\{ action, workspaceId, seq:/);
  assert.match(engine,/gradebookAction\.workspaceId !== workspace\.id/);
  assert.match(engine,/gradebookAction.action === 'summary'/);
  assert.match(engine,/gradebookAction.action === 'pdf'\) openStudentReport\(\)/);
  assert.match(engine,/openClassGradebook/);
});
