import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workspace = await readFile(new URL('../src/components/gradebook/GradebookWorkspace.jsx', import.meta.url), 'utf8');
const engine = await readFile(new URL('../src/components/gradebook/GradebookEngine.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/GradebookColorfulWorkspace.css', import.meta.url), 'utf8');

for (const token of [
  "import workspaceColorCss from '../../styles/GradebookColorfulWorkspace.css?inline';",
  '<style>{workspaceColorCss}</style>',
  'gradebook-student-support',
  'Hỗ trợ &amp; tra cứu học sinh',
  'gradebook-student-support-icon',
]) {
  assert.ok(workspace.includes(token), `Gradebook workspace mockup token missing: ${token}`);
}

for (const token of [
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
]) {
  assert.ok(engine.includes(token), `Gradebook colorful structure token missing: ${token}`);
}

for (const token of [
  'Gradebook Colorful Workspace V1',
  '.gradebook-student-support',
  '.hr-grade-toolbar',
  '.hr-grade-overview article.tone-blue',
  '.hr-grade-overview article.tone-purple',
  '.hr-grade-overview article.tone-green',
  '.hr-grade-overview article.tone-yellow',
  '.hr-grade-export-bar',
  '.hr-grade-table .hr-grade-plus-head',
  '.hr-grade-table .hr-grade-bonus-head',
  '.hr-grade-table .hr-grade-result-head',
  'linear-gradient(90deg, #2d7de8 0 26%, #ef4e78 26% 48%, #8e66e8 48% 68%, #f7b942 68% 84%, #23b97a 84%)',
]) {
  assert.ok(css.includes(token), `Gradebook colorful workspace CSS missing: ${token}`);
}

assert.ok(css.includes('--gbw-font: var(--bes-global-font-family'), 'Workspace must use the global/custom font authority.');
assert.ok(!css.includes('.gradebook-studio-hero'), 'Workspace CSS must not modify the approved Gradebook hero.');
assert.ok(!css.includes('signature-footer'), 'Workspace CSS must not modify the global footer.');

const opens=(css.match(/{/g)||[]).length;
const closes=(css.match(/}/g)||[]).length;
assert.equal(opens, closes, 'Gradebook colorful workspace CSS braces must be balanced.');

console.log('PASS: Gradebook body matches the approved colorful mockup while leaving hero/footer untouched.');
