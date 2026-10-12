import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path, import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const engine=read('src/components/gradebook/GradebookEngine.jsx');
const workspace=read('src/components/gradebook/GradebookWorkspace.jsx');
const css=read('src/styles/GradebookAcademicWorkspace.css');
const art=read('public/gradebook-material3-hero.svg');

test('Material 3 approved layout has colorful native hero and ONE active route stylesheet',()=>{
  assert.match(page,/gb-academic-hero/);
  assert.match(page,/className="gb-m3-hero-illustration"/);
  assert.match(page,/src="\/gradebook-material3-hero\.svg"/);
  assert.match(art,/<svg[^>]+viewBox="0 0 620 265"/);
  assert.match(art,/<linearGradient/);
  assert.match(css,/Material 3 Colorful · approved gradebook visual edition/);
  for(const cls of ['gb-academic-hero','gb-m3-hero-illustration','hr-grade-overview','gb-academic-administration','gradebook-assignment-grid'])assert.ok(css.includes('.'+cls),cls);
  assert.match(page,/import '\.\.\/styles\/GradebookAcademicWorkspace\.css'/);
  assert.doesNotMatch(page,/GradebookColorfulWorkspace|GradebookApprovedMockupFour|GradebookEditorialV2/);
  assert.doesNotMatch(workspace,/GradebookColorfulWorkspace|GradebookApprovedMockupFour|GradebookEditorialV2/);
});

test('Dynamic KPI colors use four distinct tonal surfaces, not replacement data',()=>{
  for(const tone of ['tone-blue','tone-green','tone-purple','tone-yellow']){
    assert.match(engine,new RegExp('className="'+tone+'"'));
    assert.match(css,new RegExp('article\\.'+tone+'\\{[\\s\\S]*?background:linear-gradient'));
  }
  assert.match(engine,/\{totalRegularColumns\}/);
  assert.match(engine,/\{students\.length\}/);
  assert.match(engine,/\{subjectEntries\.length\}/);
  assert.match(engine,/\{completedFourRounds\}\/\{students\.length\}/);
});

test('Teachers can still manage classes, subjects, students and assigned work',()=>{
  assert.match(page,/onClick=\{\(\) => openAssignment\(assignment\)\}/);
  assert.match(page,/switchGradebookClass\(item.id\)/);
  assert.match(page,/const switchGradebookClass = \(nextId\) =>/);
  assert.match(page,/if \(!canLeaveGradebook\(\)\) return/);
  assert.match(page,/setView\('students'\)/);
  assert.match(page,/setCreateOpen\(\(value\) => !value\)/);
  assert.match(engine,/className="gb-academic-administration"/);
  assert.doesNotMatch(engine,/className="gb-academic-administration" defaultOpen/);
  assert.match(engine,/\{teachingOverview\}/);
  assert.match(engine,/\{classManagement\}/);
  assert.match(engine,/openSubject/);
  assert.match(engine,/GradebookNavigationPalette/);
  assert.match(workspace,/className="gbv2-support-extra" defaultOpen/);
  assert.match(workspace,/onClick=\{openStudentSupport\}/);
});

test('Score data, export/save and 42-column safe geometry stay unchanged',()=>{
  assert.match(engine,/gradeRoundBonus\(activeRound/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/onClick=\{save\}>Lưu điểm/);
  assert.match(engine,/onClick=\{discard\}>Hoàn tác/);
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
  assert.match(css,/\.hr-gradebook \.hr-grade-table-wrap\s*\{[\s\S]*?overflow:auto/);
  assert.match(css,/\.hr-gradebook \.hr-grade-table\s*\{[\s\S]*?table-layout:auto/);
  assert.match(css,/\.hr-grade-table \.hr-grade-index\s*\{[\s\S]*?position:sticky;[\s\S]*?left:0/);
  assert.match(css,/\.hr-grade-table \.hr-grade-student\s*\{[\s\S]*?position:sticky;[\s\S]*?left:48px/);
  assert.match(css,/\.hr-grade-input\s*\{[\s\S]*?min-height:35px/);
});

test('Design does not change global navigation or footer, remains mobile safe',()=>{
  assert.doesNotMatch(css,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer)/);
  assert.match(css,/@media\(max-width:740px\)/);
  assert.match(css,/@media\(max-width:500px\)/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
