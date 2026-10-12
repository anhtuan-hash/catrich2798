import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(new URL('../'+path,import.meta.url),'utf8'); }
const page=read('src/pages/GradebookStudio.jsx');
const workspace=read('src/components/gradebook/GradebookWorkspace.jsx');
const runtime=read('src/utils/gradebookMaterialHeroRuntime.js');
const engine=read('src/components/gradebook/GradebookEngine.jsx');
const css=read('src/styles/GradebookApprovedV2.css');
const four=read('src/styles/GradebookApprovedMockupFour.css');

test('approved design stays scoped to gradebook, leaving navigation and footer untouched',()=>{
  assert.match(css,/\/\* Gradebook Approved Redesign V2/);
  assert.match(css,/\.gradebook-studio \{/);
  assert.doesNotMatch(css,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer|#root\s*>\s*footer)/);
  assert.match(workspace,/approvedGradebookCss from '\.\.\/\.\.\/styles\/GradebookApprovedV2\.css\?inline'/);
  assert.match(workspace,/<style>\{approvedGradebookCss\}<\/style>/);
  assert.match(workspace,/<style>\{gradebookMockupFourCss\}<\/style>/);
});

test('hero has live class selection, semester selection and real feature shortcuts',()=>{
  for (const action of ['class','semester','view','pdf','students','add-class']) {
    assert.ok(runtime.includes('data-gbe-action="'+action+'"'),action);
  }
  assert.match(runtime,/class="gb4-hero-shell"/);
  assert.match(runtime,/class="gb4-class-picker"/);
  assert.match(runtime,/HTMLSelectElement\.prototype/);
  assert.match(runtime,/function openPdfDialog\(/);
  assert.match(runtime,/function clickInnerControl\(/);
  assert.match(runtime,/function selectClass\(/);
  assert.doesNotMatch(runtime,/gbe-m3-live-panel/);
  assert.doesNotMatch(runtime,/gbe-m3-preview-row/);
});

test('optional class administration and student assistance remain accessible but collapsed',()=>{
  assert.match(page,/const teachingOverview = teachingAssignments.length/);
  assert.match(page,/className="gradebook-assignment-panel hr-panel gb4-assignment-panel"/);
  assert.match(page,/const classManagement =/);
  assert.match(page,/className="gradebook-studio-switcher hr-panel gb4-class-manager"/);
  assert.match(engine,/\{teachingOverview\}[\s\S]*?\{classManagement\}/);
  assert.match(page,/onClick=\{\(\) => openAssignment\(assignment\)\}/);
  assert.match(page,/setCreateOpen\(\(value\) => !value\)/);
  assert.match(workspace,/<GradebookEngine \{\.\.\.props\} \/>/);
  assert.match(workspace,/<details className="gbv2-support-extra">/);
  assert.match(workspace,/onClick=\{openStudentSupport\}/);
});

test('score entry remains data-backed with semantic filters, real save/discard and correct export order',()=>{
  assert.match(engine,/const renderTableControls = \(\) =>/);
  assert.match(engine,/value=\{semesterId\} onChange=\{\(event\) => setSemesterId\(event.target.value\)\}/);
  assert.match(engine,/value=\{view\} onChange=\{\(event\) => setView\(event.target.value\)\}/);
  assert.match(engine,/value=\{activeSubjectKey\} onChange=\{\(event\) => setActiveSubjectKey\(event.target.value\)\}/);
  assert.match(engine,/className="gbv2-save-strip"/);
  assert.match(engine,/onClick=\{save\}>Lưu điểm/);
  assert.match(engine,/onClick=\{discard\}>Hoàn tác/);
  assert.match(engine,/gradeRoundBonus\(/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  const view=engine.indexOf("view === 'summary' ? renderSummary()");
  const reports=engine.indexOf('<section className="hr-panel hr-grade-export-bar"');
  assert.ok(view>=0&&reports>view,'export controls follow main table');
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
  assert.match(engine,/className="gbv2-formula-details"/);
});

test('design works at desktop and mobile sizes without forcing global styles',()=>{
  assert.match(css,/@media\(max-width:1100px\)/);
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(four,/\.gb4-class-picker/);
  assert.match(css,/\.gbv2-table-controls/);
  assert.match(css,/\.gbv2-save-strip/);
  assert.equal((four.match(/\{/g)||[]).length,(four.match(/\}/g)||[]).length);
  assert.doesNotMatch(four,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer)/);
});
