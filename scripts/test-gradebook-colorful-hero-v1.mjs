import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// The Academic Workspace V1 hero was retired. The active page renders the
// configurable Mac Hero canvas and a single MacEngine scoring surface.
const page=await readFile(new URL('../src/pages/GradebookStudio.jsx',import.meta.url),'utf8');
const workspace=await readFile(new URL('../src/components/gradebook/GradebookWorkspace.jsx',import.meta.url),'utf8');
const engine=await readFile(new URL('../src/components/gradebook/GradebookMacEngine.jsx',import.meta.url),'utf8');
const css=await readFile(new URL('../src/components/gradebook/GradebookMacEngine.css',import.meta.url),'utf8');

for (const token of [
 'gbmac-hero-canvas','gbmac-hero-refined','gbmac-hero-command',
 'gbmac-hero-default-art','gbmac-shell-selectors','gbmac-hero-save-state',
 'switchGradebookClass(event.target.value)','requestGradebookAction',
 'gradebookHeroHasMedia','GradebookHeroEditor',
]) assert.ok(page.includes(token),'Missing current Gradebook hero feature: '+token);

assert.ok(page.includes("window.confirm('Sổ điểm đang có thay đổi chưa lưu"),'Guard class changes with unsaved scores');
assert.ok(workspace.includes('GradebookMacEngine'),'Only current scoring engine must render');
assert.ok(!workspace.includes('installGradebookMaterialHero'),'Legacy DOM-observed hero must stay disabled');
assert.ok(!workspace.includes('GradebookApprovedMockupFour'),'Legacy mockup must stay disabled');
assert.ok(engine.includes('openStudentReport'),'Student PDF export must remain available');
assert.ok(engine.includes('await onCommit('),'Score save must retain original persisted commit handler');
assert.ok(css.includes('overflow:auto')&&css.includes('position:sticky'),'Table must scroll with frozen roster columns');
assert.ok(css.includes('focus-visible'),'Keyboard accessibility must remain');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'Gradebook stylesheet braces must be balanced');
console.log('PASS: Current configurable macOS Gradebook hero, unsaved changes guard, scoring, export and layout.');
