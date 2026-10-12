import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const page=await readFile(new URL('../src/pages/GradebookStudio.jsx',import.meta.url),'utf8');
const workspace=await readFile(new URL('../src/components/gradebook/GradebookWorkspace.jsx',import.meta.url),'utf8');
const engine=await readFile(new URL('../src/components/gradebook/GradebookEngine.jsx',import.meta.url),'utf8');
const css=await readFile(new URL('../src/styles/GradebookAcademicWorkspace.css',import.meta.url),'utf8');
for (const token of [
  'gb-academic-hero','gb-academic-class-list','gb-academic-actions',
  'gb-academic-primary','switchGradebookClass(item.id)',
  'requestGradebookAction(\'entry\')',
  'requestGradebookAction(\'summary\')',
  'requestGradebookAction(\'pdf\')',
]) assert.ok(page.includes(token), 'Missing native Gradebook feature: '+token);
assert.ok(page.includes("window.confirm('Sổ điểm đang có thay đổi chưa lưu"), 'Guard class changes when scores are unsaved');
assert.ok(!workspace.includes('installGradebookMaterialHero'),'DOM-observed legacy hero must not be mounted');
assert.ok(!workspace.includes('GradebookApprovedMockupFour'),'Legacy CSS must be inactive');
assert.ok(engine.includes('className="gb-academic-administration"'),'Class tools remain available');
assert.ok(engine.includes('onClick={openStudentReport}'),'PDF export preserved');
assert.ok(css.includes('font-family:var(--bes-global-font-family'),'Global font must be inherited');
assert.ok(css.includes('overflow:auto')&&css.includes('position:sticky'),'Table must scroll with frozen identification columns');
const opens=(css.match(/\{/g)||[]).length, closes=(css.match(/\}/g)||[]).length;
assert.equal(opens,closes,'Gradebook stylesheet braces must be balanced');
console.log('PASS: Native Academic Workspace hero, preserved shortcuts and scoped styling.');
