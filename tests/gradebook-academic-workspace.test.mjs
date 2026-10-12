import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=get('src/pages/GradebookStudio.jsx');
const engine=get('src/components/gradebook/GradebookEngine.jsx');
const workspace=get('src/components/gradebook/GradebookWorkspace.jsx');
const styles=get('src/styles/GradebookAcademicWorkspace.css');

test('exactly one active design stylesheet and native hero, no injected legacy UI',()=>{
  assert.match(page,/import '\.\.\/styles\/GradebookAcademicWorkspace.css';/);
  for (const legacy of ['GradebookEditorialV2','GradebookMaterialHeroRuntime','GradebookColorfulWorkspace','GradebookApprovedV2','GradebookApprovedMockupFour']){
    assert.ok(!workspace.includes(legacy),'Old CSS still active: '+legacy);
    assert.ok(!page.includes(legacy),'Old CSS active on page: '+legacy);
  }
  assert.match(page,/className="gradebook-studio-hero gb-academic-hero"/);
  assert.doesNotMatch(workspace,/installGradebookMaterialHero/);
});

test('all record pathways are still connected to data and permissions',()=>{
  assert.match(page,/onClick=\{\(\) => openAssignment\(assignment\)\}/);
  assert.match(page,/setWorkspaceId\(item.id\)/);
  assert.match(page,/setView\('students'\)/);
  assert.match(page,/setCreateOpen\(\(value\) => !value\)/);
  assert.match(page,/SubjectStudentsTab/);
  assert.match(engine,/\{teachingOverview\}/);
  assert.match(engine,/\{classManagement\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(workspace,/openStudentSupport/);
  assert.match(engine,/onClick=\{save\}>Lưu điểm/);
  assert.match(engine,/onClick=\{discard\}>Hoàn tác/);
  assert.match(engine,/await onCommit\(/);
});

test('score table is horizontally scrollable and sticky columns are preserved',()=>{
  assert.match(styles,/\.hr-grade-table-wrap\s*\{[\s\S]*?overflow:auto/);
  assert.match(styles,/\.hr-gradebook \.hr-grade-table\s*\{[\s\S]*?table-layout:auto/);
  assert.match(styles,/\.hr-grade-table \.hr-grade-index\s*\{[\s\S]*?position:sticky;[\s\S]*?left:0/);
  assert.match(styles,/\.hr-grade-table \.hr-grade-student\s*\{[\s\S]*?position:sticky;[\s\S]*?left:48px/);
  assert.match(styles,/\.hr-grade-table .hr-grade-attempt-head\s*\{[\s\S]*?min-width:118px/);
  assert.match(styles,/\.hr-grade-input\s*\{[\s\S]*?min-height:35px/);
  assert.match(engine,/activeRound\.columns\.length \* 104/);
  assert.match(styles,/word-break:normal/);
});
test('table and grade navigation are scoped; no sticky palette under global top nav',()=>{
  assert.match(styles,/\.hr-grade-navigation-dock\s*\{[\s\S]*?position:relative;[\s\S]*?top:auto/);
  assert.doesNotMatch(styles,/\.brian-nav|\.bes-top-chrome|html body footer|\.signature-footer/);
  assert.match(styles,/@media\(max-width:740px\)/);
  assert.match(styles,/@media\(max-width:500px\)/);
  assert.equal((styles.match(/\{/g)||[]).length,(styles.match(/\}/g)||[]).length);
});
test('statistics and advanced tools precede live score table',()=>{
  const stats=engine.indexOf('<section className="hr-grade-overview"');
  const advanced=engine.indexOf('<details className="gb-academic-administration"');
  const table=engine.indexOf("view.startsWith('regular-') ? renderRegularTable()");
  const reports=engine.indexOf('hr-grade-export-bar',table);
  assert.ok(stats>=0&&stats<advanced&&advanced<table&&table<reports);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(engine,/gradeRoundBonus\(activeRound/);
});
