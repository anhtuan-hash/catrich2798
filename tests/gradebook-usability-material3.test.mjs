import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=load('src/styles/GradebookAcademicWorkspace.css');
const productivityCss=load('src/components/gradebook/GradebookProductivityPanel.css');
const editor=load('src/components/gradebook/GradebookEngine.jsx');
const productivity=load('src/components/gradebook/GradebookProductivityPanel.jsx');

test('scores display is a large independent scroll area, with a full-class expansion button',()=>{
  assert.match(css,/max-height:clamp\(610px,84vh,830px\)/);
  assert.match(editor,/const \[showFullRoster, setShowFullRoster\] = useState\(\(\) => students\.length <= 45\)/);
  assert.match(editor,/\[workspace\.id, students\.length\]/);
  assert.match(editor,/className="gbv3-expand-table" aria-pressed=\{showFullRoster\}/);
  assert.match(editor,/setShowFullRoster\(\(value\) => !value\)/);
  assert.match(editor,/hr-grade-table-wrap\$\{showFullRoster \? ' gbv3-table-expanded' : ''\}/);
  assert.match(css,/\.hr-grade-table-wrap\.gbv3-table-expanded\s*\{[\s\S]*?max-height:none/);
  assert.match(css,/\.hr-gradebook \.hr-grade-table-wrap\s*\{[\s\S]*?overflow:auto/);
  assert.match(css,/\.hr-grade-table \.hr-grade-index\s*\{[\s\S]*?position:sticky;[\s\S]*?left:0/);
  assert.match(css,/\.hr-grade-table \.hr-grade-student\s*\{[\s\S]*?position:sticky;[\s\S]*?left:48px/);
});

test('all semester and score tabs remain present with legible two-row layout',()=>{
  assert.match(editor,/SEMESTERS\.map\(/);
  assert.match(editor,/VIEWS\.map\(/);
  assert.match(css,/Gradebook Material 3 usability refinement/);
  assert.match(css,/\.hr-grade-navigation-dock\.is-always-visible \.hr-grade-views\s*\{[\s\S]*?grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:740px\)/);
  assert.match(css,/@media\(max-width:430px\)/);
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

test('preserve all scoring calculations, permissions, undo and exports',()=>{
  assert.match(editor,/gradeRoundBonus\(activeRound/);
  assert.match(editor,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(editor,/await onCommit\(/);
  assert.match(editor,/disabled=\{finalized\}/);
  assert.match(editor,/onClick=\{save\}>Lưu điểm/);
  assert.match(editor,/onClick=\{discard\}>Hoàn tác/);
  assert.match(editor,/onClick=\{openClassGradebook\}/);
  assert.match(editor,/onClick=\{openStudentReport\}/);
  assert.match(editor,/GradebookProductivityPanel/);
});

test('strict route scoping: no global nav/footer selectors or extra CSS authorities',()=>{
  assert.doesNotMatch(css+productivityCss,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer)/);
  for(const source of [css,productivityCss]) assert.equal((source.match(/\{/g)||[]).length,(source.match(/\}/g)||[]).length);
});
