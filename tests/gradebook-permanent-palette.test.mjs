import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const engine = read('src/components/gradebook/GradebookMacEngine.jsx');
const workspace = read('src/components/gradebook/GradebookWorkspace.jsx');
const compatibilityEntry = read('src/components/gradebook/GradebookEngine.jsx');
const css = read('src/components/gradebook/GradebookMacEngine.css');

// The V1-V13 GradebookNavigationPalette was retired. Validate the actual
// macOS Gradebook displayed in production, never a dead compatibility file.
test('the live Gradebook has a single, active macOS engine', () => {
  assert.match(workspace, /import GradebookMacEngine from/);
  assert.match(workspace, /<GradebookMacEngine/);
  assert.match(compatibilityEntry, /export \{ default \} from '\.\/GradebookMacEngine\.jsx'/);
  assert.doesNotMatch(workspace, /GradebookNavigationPalette|GradebookApprovedMockupFour/);
});
test('both semesters and assessment views are selectable', () => {
  assert.match(engine, /id: 'semester1', label: 'Học kỳ I'/);
  assert.match(engine, /id: 'semester2', label: 'Học kỳ II'/);
  assert.match(engine, /const \[semesterId, setSemesterId\]/);
  assert.match(engine, /const \[view, setView\]/);
  assert.match(engine, /gbmac-tabs/);
  for (const view of ['regular-0','midterm','final','summary']) assert.ok(engine.includes(view), view);
});
test('gradebook saves through the original commit handler', () => {
  assert.match(engine, /const \[dirty, setDirty\]/);
  assert.match(engine, /const \[savePending, setSavePending\]/);
  assert.match(engine, /await onCommit\(/);
  assert.match(engine, /const save = async/);
  assert.match(engine, /const discard =/);
});
test('macOS gradebook tabs remain keyboard-operable and responsive', () => {
  assert.match(css, /\.gbmac-tabs\s*\{/);
  assert.match(css, /\.gbmac-tabs button/);
  assert.match(css, /\.gbmac :is\(button,input,select,summary\):focus-visible/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /\.gbmac-tabs\{display:flex;overflow-x:auto/);
  assert.match(css, /\.gbmac-table-viewport\s*\{/);
  assert.match(css, /overflow:auto/);
  assert.doesNotMatch(css, /\.brian-nav|\.bes-top-chrome|html body footer|\.signature-footer/);
  assert.equal((css.match(/\{/g)||[]).length, (css.match(/\}/g)||[]).length);
});
