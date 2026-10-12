import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const engine=read('src/components/gradebook/GradebookEngine.jsx');
const css=read('src/styles/GradebookAcademicWorkspace.css');
const admin=engine.slice(engine.indexOf('<details className="hr-panel gb-grade-tools">'),engine.indexOf('<GradebookProductivityPanel'));
test('tools are short collapsed details, rather than the oversized obsolete grade toolbar',()=>{
  assert.match(admin,/<details className="hr-panel gb-grade-tools">/);
  assert.ok(engine.indexOf('className="gb5-editor-anchor"')<engine.indexOf('<details className="hr-panel gb-grade-tools">'));
  assert.match(engine,/insightsOpen \? <div className="gb5-insights-content">/);
  assert.match(admin,/<summary className="gb-grade-tools-trigger">/);
  assert.match(admin,/className="gbv2-manage-subject"/);
  assert.match(admin,/className="gbv2-formula-details"/);
  assert.match(admin,/onClick=\{openSubject\}/);
  assert.doesNotMatch(admin,/className="hr-panel hr-grade-toolbar"/);
  assert.match(css,/\.gb-grade-tools-trigger\s*\{/);
  assert.match(css,/\.gb-grade-tools-content\s*\{/);
});
test('Excel/PDF section uses constrained nonfilled icon and a compact report card',()=>{
  assert.match(engine,/className="hr-grade-export-icon"[^>]*><GradebookUiIcon type="excel" \/>/);
  assert.match(css,/\.hr-grade-export-icon>svg\s*\{[\s\S]*?width:20px!important;[\s\S]*?height:20px!important;/);
  assert.match(css,/\.hr-grade-export-icon>svg path\s*\{[\s\S]*?fill:none!important;/);
  assert.match(css,/\.hr-grade-export-bar\s*\{[\s\S]*?min-height:76px!important;/);
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
});
test('all grade controls remain permanently visible with responsive multirow grid',()=>{
  assert.match(engine,/className="hr-grade-navigation-dock is-always-visible"/);
  assert.match(engine,/SEMESTERS\.map\(/);
  assert.match(engine,/VIEWS\.map\(/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important;/);
  assert.match(css,/@media\(max-width:430px\)/);
  assert.match(engine,/onClick=\{onSave\}>Lưu bảng điểm/);
});
test('score data and report calculations are not modified by the visual repair',()=>{
  assert.match(engine,/gradeRoundBonus\(activeRound/);
  assert.match(engine,/roundScore\(activeRound, student.id, studentIds\)/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/onClick=\{addRegularColumn\}/);
  assert.match(engine,/onClick=\{save\}>Lưu điểm/);
  assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
});
