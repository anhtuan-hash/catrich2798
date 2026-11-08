import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const eng=read('src/components/gradebook/GradebookMacEngine.jsx');
const product=read('src/components/gradebook/GradebookProductivityPanel.jsx');
const css=read('src/styles/GradebookAcademicWorkspace.css');
const pc=read('src/components/gradebook/GradebookProductivityPanel.css');
const art=read('public/gradebook-material3-hero.svg');

test('native media hero is composed and limited to Gradebook route',()=>{
  const live=read('src/styles/GradebookHeroCommand.css');
  assert.match(page,/gbmac-hero-command/);
  assert.match(page,/gbmac-hero-default-art/);
  assert.match(page,/gbmac-art-chip is-blue/);
  assert.match(page,/gradebookHero\.backgroundType === 'video'/);
  assert.match(page,/onPreview=\{setGradebookHeroPreview\}/);
  assert.match(live,/backdrop-filter: blur\(11px\)/);
  assert.doesNotMatch(live+pc,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
});

test('live KPIs use real roster, completed score rounds and active coverage',()=>{
  for(const token of ['totalRegularColumns','completedFourRounds','activeRoundCoverage','students.length','gradeRoundBonus(activeRound'])
    assert.ok(eng.includes(token),token);
  assert.match(eng,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(eng,/const studentIds = useMemo/);
});

test('editable score columns retain semantic tones, real scoring and save',()=>{
  const current=read('src/components/gradebook/GradebookMacEngine.css');
  for(const tone of ['blue','red','yellow','green','purple','orange','cyan'])
    assert.ok(current.includes('.gbmac-tabs button[data-tone="'+tone+'"]'),tone);
  assert.match(eng,/activeRound\.columns\.map/);
  assert.match(eng,/updateRegularScore\(student\.id/);
  assert.match(eng,/gradeRoundBonus\(activeRound/);
  assert.match(eng,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(eng,/await onCommit\(/);
  assert.match(eng,/onClick=\{save\}/);
  assert.match(eng,/onClick=\{openClassGradebook\}/);
  assert.match(eng,/onClick=\{openStudentReport\}/);
});

test('all ten tool actions retain their React handlers and each displays a vector icon',()=>{
  for(const id of ['paste','progress','heatmap','alerts','quality','history','finalize','rubric','report','recovery']){
    assert.match(product,new RegExp('id:\\x27'+id+'\\x27,icon:<'));
    assert.match(pc,new RegExp('button\\[data-tab="'+id+'"\\]'));
  }
  assert.match(product,/from 'lucide-react'/);
  assert.match(product,/data-tab=\{item\.id\}/);
  assert.match(product,/className="gb-prod-tab-art"/);
  assert.match(product,/onClick=\{\(\)=>\{setTab\(item\.id\);setNotice\(''\);\}\}/);
  assert.match(product,/onClick=\{commitIntervention\}/);
  assert.match(product,/readGradebookXlsx/);
});

test('data table stays horizontally scrollable for 42 columns and mobile geometry is preserved',()=>{
  assert.match(css,/\.hr-gradebook \.hr-grade-table-wrap\s*\{[\s\S]*?overflow:auto/);
  assert.match(css,/\.hr-gradebook \.hr-grade-table\s*\{[\s\S]*?table-layout:auto/);
  assert.match(css,/\.hr-grade-table \.hr-grade-index\s*\{[\s\S]*?position:sticky;[\s\S]*?left:0/);
  assert.match(css,/\.hr-grade-table \.hr-grade-student\s*\{[\s\S]*?position:sticky;[\s\S]*?left:48px/);
  assert.match(css,/@media\(max-width:740px\)/);
  assert.match(pc,/@media\(max-width:970px\)/);
  for(const style of [css,pc])assert.equal((style.match(/\{/g)||[]).length,(style.match(/\}/g)||[]).length);
});
