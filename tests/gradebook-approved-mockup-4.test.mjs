import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const get=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=get('src/pages/GradebookStudio.jsx');
const engine=get('src/components/gradebook/GradebookMacEngine.jsx');
const compat=get('src/components/gradebook/GradebookEngine.jsx');
const workspace=get('src/components/gradebook/GradebookWorkspace.jsx');

test('Mockup 4 was superseded by native Hero v4 without lost controls',()=>{
  for(const marker of ['gbmac-hero-command','gbmac-shell-selectors','gbmac-shell-utilities','gbmac-hero-media','gbmac-hero-save-state']) {
    assert.ok(page.includes(marker),'Active Gradebook Hero missing: '+marker);
  }
  assert.match(page,/gradebookHero\.backgroundType === 'video'/);
  assert.match(page,/canEditGradebookHero \? <button/);
  assert.match(page,/onClick=\{openStudentRoster\}/);
  assert.match(page,/activeClasses\.map\(item=>/);
  assert.match(workspace,/return <GradebookMacEngine key=\{props\.workspace\?\.id\}/);
  assert.match(compat,/export \{ default \} from '\.\/GradebookMacEngine\.jsx'/);
  assert.doesNotMatch(workspace,/import gradebookMockupFourCss|installGradebookMaterialHero/);
});
test('Header requests are scoped to the current class and real report dialogs',()=>{
  assert.match(page,/gradebookAction=\{gradebookAction\}/);
  assert.match(page,/\{ action, workspaceId, seq:/);
  assert.match(engine,/gradebookAction\.workspaceId !== workspace\.id/);
  assert.match(engine,/gradebookAction\.action === 'summary'/);
  assert.match(engine,/gradebookAction\.action === 'pdf'\) openStudentReport\(\)/);
  assert.match(engine,/gradebookAction\.action === 'class-report'\) openClassGradebook\(\)/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(engine,/exportClassGradebookXlsx\(/);
  assert.match(engine,/exportStudentGradeReportPdf\(/);
});
