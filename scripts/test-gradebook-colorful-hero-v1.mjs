import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// "Colorful Hero V1" is a historical test name. The active Gradebook UI is
// GradebookMacEngine + the full-bleed Gradebook Hero Command (v4).
// Assert current live functionality; do not recreate retired gb-academic UI.
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [page, workspace, compatibility, engine, css, engineCss] = await Promise.all([
  read('src/pages/GradebookStudio.jsx'),
  read('src/components/gradebook/GradebookWorkspace.jsx'),
  read('src/components/gradebook/GradebookEngine.jsx'),
  read('src/components/gradebook/GradebookMacEngine.jsx'),
  read('src/styles/GradebookHeroCommand.css'),
  read('src/components/gradebook/GradebookMacEngine.css'),
]);

for (const marker of [
  'gbmac-hero-command', 'gbmac-hero-content', 'gbmac-hero-media',
  'gbmac-shell-selectors', 'gbmac-shell-utilities', 'gbmac-hero-edit',
  'gbmac-hero-save-state', 'gbmac-hero-default-art',
]) assert.ok(page.includes(marker), 'Current native Gradebook Hero missing: ' + marker);
assert.match(page, /import '\.\.\/styles\/GradebookHeroCommand\.css'/);
assert.match(page, /canEditGradebookHero \? <button/);
assert.match(page, /onClick=\{\(\)=>setGradebookHeroEditorOpen\(true\)\}/);
assert.match(page, /gradebookHero\.backgroundType === 'video'/);
assert.match(page, /onPreview=\{setGradebookHeroPreview\}/);
assert.match(page, /onChange=\{\(event\)=>switchGradebookClass\(event\.target\.value\)\}/);
assert.match(page, /activeClasses\.map\(item=>/);
assert.match(page, /if \(!canLeaveGradebook\(\)\) return/);
assert.match(page, /window\.confirm\('Sổ điểm đang có thay đổi chưa lưu/);
assert.match(page, /if\(gradebookDirty\)\{window\.alert\(/);
assert.match(page, /onClick=\{openStudentRoster\}/);
assert.match(page, /onClick=\{\(\)=>setCreateOpen\(value=>!value\)\}/);

assert.match(workspace, /return <GradebookMacEngine key=\{props\.workspace\?\.id\}/);
assert.match(compatibility, /export \{ default \} from '\.\/GradebookMacEngine\.jsx'/);
assert.doesNotMatch(workspace, /installGradebookMaterialHero|GradebookApprovedMockupFour/);

// Functional pathways remain on the current engine: score commit/undo, XLSX,
// per-student PDF, score table, frozen index and student columns.
for (const marker of [
  'await onCommit(', 'onClick={save}', 'onClick={discard}',
  'exportClassGradebookXlsx(', 'exportStudentGradeReportPdf(',
  'onClick={openStudentReport}', 'onClick={openClassGradebook}',
  'gbmac-table-viewport', 'gbmac-pin-index', 'gbmac-pin-name',
]) assert.ok(engine.includes(marker), 'Active Gradebook engine missing: ' + marker);
assert.match(engineCss, /\.gbmac-table-viewport[\s\S]*?overflow:auto/);
assert.match(engineCss, /position:sticky;left:0/);
assert.match(engineCss, /position:sticky;left:60px/);
assert.match(css, /backdrop-filter: blur\(11px\)/);
assert.match(css, /gbmac-hero-media/);
assert.match(css, /object-fit: var\(--gbmac-hero-fit/);
assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
console.log('PASS: native Gradebook v4 full-bleed hero, live score, export, CSS and permissions.');
