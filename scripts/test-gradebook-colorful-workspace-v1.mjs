import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const workspace=await readFile(new URL('../src/components/gradebook/GradebookWorkspace.jsx',import.meta.url),'utf8');
const engine=await readFile(new URL('../src/components/gradebook/GradebookEngine.jsx',import.meta.url),'utf8');
const page=await readFile(new URL('../src/pages/GradebookStudio.jsx',import.meta.url),'utf8');
const css=await readFile(new URL('../src/styles/GradebookAcademicWorkspace.css',import.meta.url),'utf8');

for(const token of [
  'gradebook-student-support',
  'Hỗ trợ &amp; tra cứu học sinh',
  'gradebook-student-support-icon',
  '<GradebookEngine key={props.workspace?.id} {...props} />'
]) assert.ok(workspace.includes(token),'Student support or gradebook engine missing: '+token);
assert.ok(page.includes('switchGradebookClass(item.id)'), 'Navigation must use safe class switch');
assert.ok(!workspace.includes('GradebookColorfulWorkspace.css?inline'),'Legacy mockup must no longer be mounted');

for(const token of [
  'function GradebookUiIcon({ type })',
  'hr-grade-title-icon',
  'hr-grade-overview-icon',
  'GradebookUiIcon type="students"',
  'GradebookUiIcon type="document"',
  'GradebookUiIcon type="bars"',
  'GradebookUiIcon type="check"',
  'hr-grade-export-icon',
  'GradebookUiIcon type="excel"',
  'hr-grade-panel-icon',
  'hr-grade-table-wrap',
  'gbv2-save-strip',
]) assert.ok(engine.includes(token),'Gradebook functional structure missing: '+token);

for(const token of [
  '.gb-academic-hero',
  '.hr-grade-overview article',
  '.hr-grade-table-wrap',
  '.hr-grade-table .hr-grade-index',
  '.hr-grade-table .hr-grade-student',
  '.hr-grade-export-bar',
  '.gbv2-support-extra',
  'overflow:auto',
  'position:sticky',
  'table-layout:auto'
]) assert.ok(css.includes(token),'Academic Workspace CSS rule missing: '+token);
assert.ok(page.includes("import '../styles/GradebookAcademicWorkspace.css';"),'Route must own design');
assert.ok(css.includes('var(--bes-global-font-family'),'Must honor global typeface');
assert.ok(!css.includes('signature-footer'),'Footer must not be restyled');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'Academic Workspace stylesheet braces');
console.log('PASS: Gradebook support, scoring grid and responsive Academic Workspace preserved.');
