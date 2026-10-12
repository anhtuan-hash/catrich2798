import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const get=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=get('src/pages/GradebookStudio.jsx');
const engine=get('src/components/gradebook/GradebookEngine.jsx');
const workspace=get('src/components/gradebook/GradebookWorkspace.jsx');
const runtime=get('src/utils/gradebookMaterialHeroRuntime.js');
const css=get('src/styles/GradebookApprovedMockupFour.css');

test('Mockup 4 isolates visual changes to Gradebook and preserves global navigation/footer',()=>{
  assert.match(css,/Mockup 4/);
  assert.doesNotMatch(css,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer|#root\s*>\s*footer)/);
  assert.match(workspace,/import gradebookMockupFourCss/);
  assert.match(workspace,/<style>\{gradebookMockupFourCss\}<\/style>/);
});

test('Hero gives teachers real class, semester, entry, summary and PDF controls',()=>{
  for(const action of ['class','semester','view','pdf','students','add-class']){
    assert.ok(runtime.includes('data-gbe-action="'+action+'"'),action);
  }
  for(const klass of ['gb4-hero-main','gb4-class-picker','gb4-quick-toolbar','gb4-quick-primary','gb4-quick-secondary']){
    assert.ok(runtime.includes(klass),klass);
  }
  assert.match(runtime,/function selectClass\(/);
  assert.match(runtime,/function openPdfDialog\(/);
  assert.match(runtime,/function clickInnerControl\(/);
});

test('Actual assignment buttons and class manager are repositioned, never duplicated',()=>{
  const section=page.slice(page.indexOf('const teachingOverview ='),page.indexOf('return <div className="page hr-page gradebook-studio">'));
  assert.equal((section.match(/className="gradebook-assignment-grid"/g)||[]).length,1);
  assert.equal((section.match(/className="gradebook-studio-actions"/g)||[]).length,1);
  assert.match(section,/onClick=\{\(\) => openAssignment\(assignment\)\}/);
  assert.match(section,/setWorkspaceId\(event.target.value\)/);
  assert.match(page,/teachingOverview=\{teachingOverview\} classManagement=\{classManagement\}/);
  assert.match(engine,/\{teachingOverview\}[\s\S]*?\{classManagement\}/);
  assert.match(page,/view !== 'gradebook' \|\| !workspace/);
});

test('Statistics precede classroom cards, which precede the live score table',()=>{
  const stats=engine.indexOf('<section className="hr-grade-overview"');
  const classes=engine.indexOf('{teachingOverview}',stats);
  const manager=engine.indexOf('{classManagement}',classes);
  const palette=engine.indexOf('<GradebookNavigationPalette',manager);
  const table=engine.indexOf("view.startsWith('regular-') ? renderRegularTable()",palette);
  const exports=engine.indexOf('hr-grade-export-bar',table);
  assert.ok(stats>=0&&stats<classes&&classes<manager&&manager<palette&&palette<table&&table<exports);
  assert.match(engine,/onClick=\{save\}>Lưu điểm/);
  assert.match(engine,/onClick=\{discard\}>Hoàn tác/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(engine,/gradeRoundBonus\(/);
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
  assert.match(workspace,/onClick=\{openStudentSupport\}/);
});

test('Mockup responds across screens with equal-width KPI and assignment cards',()=>{
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:1220px\)/);
  assert.match(css,/@media\(max-width:820px\)/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});