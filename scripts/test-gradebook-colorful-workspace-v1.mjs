import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Retained CI step name for compatibility. Real Gradebook owner is the Mac
// engine and the v4 hero, not the retired colorful academic workspace.
const read=(file)=>readFile(new URL('../'+file,import.meta.url),'utf8');
const [workspace, engine, page, css, hero] = await Promise.all([
  read('src/components/gradebook/GradebookWorkspace.jsx'),
  read('src/components/gradebook/GradebookMacEngine.jsx'),
  read('src/pages/GradebookStudio.jsx'),
  read('src/components/gradebook/GradebookMacEngine.css'),
  read('src/styles/GradebookHeroCommand.css'),
]);

// Student support lives in the existing specialist area, not a cloned panel.
assert.match(workspace,/className="gbmac-support-tools"/);
assert.match(workspace,/openStudentSupport/);
assert.match(workspace,/buildStudentSupportHash\(/);
assert.match(workspace,/students\.map\(\(student\) =>/);
assert.match(workspace,/return <GradebookMacEngine key=\{props\.workspace\?\.id\}/);
assert.doesNotMatch(workspace,/GradebookColorfulWorkspace\.css\?inline|installGradebookMaterialHero/);

// Class selection always uses the safe dirty-state guard.
assert.match(page,/const switchGradebookClass = \(nextId\) =>/);
assert.match(page,/if \(!canLeaveGradebook\(\)\) return/);
assert.match(page,/onChange=\{\(event\)=>switchGradebookClass\(event\.target\.value\)\}/);
assert.match(page,/onClick=\{openStudentRoster\}/);
assert.match(page,/onClick=\{\(\)=>setCreateOpen\(value=>!value\)\}/);

// The single active engine still owns save/undo, real PDF/XLSX and a full
// eight-view score workflow with typed inputs.
for (const token of [
 'function GradebookUiIcon({ type })',
 'gbmac-workspace', 'gbmac-toolbar', 'gbmac-primary-actions',
 'gbmac-table-viewport', 'gbmac-pin-index', 'gbmac-pin-name',
 "id: 'regular-0'", "id: 'midterm'", "id: 'final'", "id: 'summary'",
 'onClick={save}', 'onClick={discard}', 'onClick={openStudentReport}',
 'onClick={openClassGradebook}', 'exportClassGradebookXlsx(',
 'exportStudentGradeReportPdf(', 'await onCommit(', '{supportPanel}',
]) assert.ok(engine.includes(token),'Live Gradebook workflow missing: '+token);

assert.match(engine,/import '\.\/GradebookMacEngine\.css'/);
assert.match(css,/\.gbmac-table-viewport[\s\S]*?overflow:auto/);
assert.match(css,/position:sticky;left:0/);
assert.match(css,/position:sticky;left:60px/);
assert.match(hero,/gbmac-hero-media/);
assert.match(hero,/backdrop-filter: blur\(11px\)/);
assert.ok(!css.includes('signature-footer'),'Gradebook styling must not affect the sitewide footer');
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length,'Active engine CSS braces');
assert.equal((hero.match(/\{/g)||[]).length,(hero.match(/\}/g)||[]).length,'Hero CSS braces');
console.log('PASS: live Gradebook v4 support, export, scoring grid and sticky columns preserved.');
