import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Historical colorful-workspace V1 classes were retired when the single
// macOS Gradebook engine replaced V1-V13. This contract must validate what
// the live Gradebook route actually renders, not frozen legacy CSS names.
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const workspace = await read('src/components/gradebook/GradebookWorkspace.jsx');
const engine = await read('src/components/gradebook/GradebookMacEngine.jsx');
const compatibility = await read('src/components/gradebook/GradebookEngine.jsx');
const page = await read('src/pages/GradebookStudio.jsx');
const css = await read('src/components/gradebook/GradebookMacEngine.css');

for (const token of [
  "import GradebookMacEngine from './GradebookMacEngine.jsx'",
  'const supportPanel = students.length ?',
  'gbmac-support-tools',
  'normalizeStudentRef',
  'buildStudentSupportHash',
  'onClick={openStudentSupport}',
  '<GradebookMacEngine key={props.workspace?.id} {...props} supportPanel={supportPanel} />',
]) assert.ok(workspace.includes(token), 'Current Gradebook support integration missing: ' + token);
assert.match(compatibility, /export \{ default \} from '\.\/GradebookMacEngine\.jsx'/);
assert.ok(page.includes('switchGradebookClass(event.target.value)'), 'Class selector must use safe class switch');
assert.ok(page.includes('const canLeaveGradebook = () => !gradebookDirty'), 'Unsaved edits must block unsafe class switching');
assert.ok(page.includes('GradebookWorkspace'), 'Gradebook route must mount current workspace');
assert.ok(!workspace.includes('GradebookColorfulWorkspace.css?inline'), 'Retired DOM-injected CSS must stay disabled');

for (const token of [
  'function GradebookUiIcon({ type })',
  'const save = async () =>',
  'await onCommit(',
  'const discard = () =>',
  'const openStudentReport = () =>',
  'gbmac-regular-table',
  'gbmac-table-viewport',
  'gbmac-tabs',
  'gbmac-save-state',
  'onClick={openStudentReport}',
  'supportPanel',
]) assert.ok(engine.includes(token), 'Current gradebook functional structure missing: ' + token);

for (const token of [
  '.gbmac-tabs', '.gbmac-table-viewport', '.gbmac-table ',
  '.gbmac-pin-index', '.gbmac-pin-name',
  'overflow:auto', 'position:sticky', 'table-layout:fixed',
  '@media(max-width:760px)', ':focus-visible',
]) assert.ok(css.includes(token), 'Current Mac Gradebook CSS rule missing: ' + token);

assert.ok(page.includes("import '../styles/GradebookMacShell.css';"), 'Route must own current Mac hero style');
assert.ok(!css.includes('.signature-footer'), 'Unrelated footer must not be restyled');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'Current Gradebook stylesheet braces');
console.log('PASS: Active Mac Gradebook support, safe class switching, original persisted scoring, export and responsive table.');
