import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=load('src/components/gradebook/GradebookMacEngine.css');
const productivityCss=load('src/components/gradebook/GradebookProductivityPanel.css');
const editor=load('src/components/gradebook/GradebookMacEngine.jsx');
const productivity=load('src/components/gradebook/GradebookProductivityPanel.jsx');

test('score viewport scrolls independently, has a small-class expansion state and frozen roster',()=>{
  assert.match(css,/\.gbmac-table-viewport[\s\S]*?overflow:auto/);
  assert.match(css,/max-height:min\(67vh,730px\)/);
  assert.match(editor,/useState\(\(\) => students\.length <= 45\)/);
  assert.match(editor,/setShowFullRoster\(students\.length <= 45\)/);
  assert.match(editor,/\[workspace\.id, students\.length\]/);
  assert.match(editor,/setShowFullRoster/);
  assert.match(css,/position:sticky;left:0/);
  assert.match(css,/position:sticky;left:60px/);
});

test('seven persistent score tabs remain readable with mobile horizontal scroll',()=>{
  assert.match(editor,/const SEMESTERS = \[/);
  assert.match(editor,/const VIEWS = \[/);
  assert.match(editor,/VIEWS\.filter\(item=>item\.id!=='mock'\)\.map/);
  assert.match(editor,/aria-pressed=\{view===item\.id\}/);
  assert.match(css,/\.gbmac-tabs\{/);
  assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/\.gbmac-tabs\{display:flex;overflow-x:auto/);
});

test('Excel xlsx flow is available but not expanded with quick paste by default',()=>{
  assert.match(productivity,/<details className="gb-prod-excel">/);
  assert.match(productivity,/<summary className="gb-prod-excel-trigger">/);
  assert.match(productivity,/<div className="gb-prod-excel-content">/);
  assert.match(productivity,/<\/details>:null\}/);
  assert.match(productivity,/loadExcel\(file\)/);
  assert.match(productivity,/applyExcel/);
  assert.match(productivity,/readGradebookXlsx/);
  assert.match(productivityCss,/\.gb-prod-excel-trigger/);
  assert.match(productivityCss,/\.gb-prod-excel-content/);
});

test('actual score calculation, lock permissions, undo/save and Excel/PDF remain wired',()=>{
  for(const token of [
    'gradeRoundBonus(activeRound','roundScore(activeRound, student.id, studentIds)',
    'await onCommit(', 'disabled={finalized}', 'onClick={save}','onClick={discard}',
    'onClick={openClassGradebook}', 'onClick={openStudentReport}',
    'GradebookProductivityPanel'
  ])assert.ok(editor.includes(token),'Score/existing permission missing '+token);
});

test('strict route scoping: no global nav/footer selectors or extra CSS authorities',()=>{
  assert.doesNotMatch(css+productivityCss,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer)/);
  for(const source of [css,productivityCss]) assert.equal((source.match(/\{/g)||[]).length,(source.match(/\}/g)||[]).length);
});
