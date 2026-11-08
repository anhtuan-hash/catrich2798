import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const engine=read('src/components/gradebook/GradebookMacEngine.jsx');
const css=read('src/components/gradebook/GradebookMacEngine.css');
const hero=read('src/styles/GradebookHeroCommand.css');

test('advanced Gradebook tools remain optional and do not obstruct score entry',()=>{
  assert.match(engine,/gbmac-workspace/);
  assert.match(engine,/gbmac-more/);
  assert.match(engine,/insightsOpen \? createPortal/);
  assert.match(engine,/className="gbmac-tools-dialog"/);
  assert.match(engine,/onClick=\{\(\) => setInsightsOpen\(false\)\}/);
  assert.doesNotMatch(engine,/className="hr-panel hr-grade-toolbar"/);
  assert.match(css,/\.gbmac-tools-dialog/);
});

test('Excel/PDF exports remain live, visibly labelled and not icon-only',()=>{
  assert.match(engine,/<FileSpreadsheet size=\{16\} aria-hidden="true"\/> Xuất Excel/);
  assert.match(engine,/<FileText size=\{16\} aria-hidden="true"\/> Phiếu PDF/);
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
  assert.match(engine,/exportClassGradebookXlsx\(/);
  assert.match(engine,/exportStudentGradeReportPdf\(/);
  assert.match(css,/\.gbmac-primary-actions\{display:flex/);
});

test('assessment score tabs and save controls remain available and responsive',()=>{
  assert.match(engine,/className="gbmac-tabs"/);
  assert.match(engine,/VIEWS\.filter\(item=>item\.id!=='mock'\)\.map/);
  assert.match(engine,/aria-pressed=\{view===item\.id\}/);
  assert.match(engine,/onClick=\{save\} disabled=\{!dirty\|\|savePending\}/);
  assert.match(engine,/className="gbmac-save-state" role="status"/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/\.gbmac-tabs\{display:flex;overflow-x:auto/);
  assert.match(css,/\.gbmac-primary-actions\{width:100%;margin:0\}/);
});

test('scoring calculations and data persistence survive the visual redesign',()=>{
  assert.match(engine,/gradeRoundBonus\(activeRound/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/onClick=\{addRegularColumn\}/);
  assert.match(engine,/onClick=\{save\}/);
  assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
  assert.doesNotMatch(hero,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
});
