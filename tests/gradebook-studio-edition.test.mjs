import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const engine=read('src/components/gradebook/GradebookEngine.jsx');
const prod=read('src/components/gradebook/GradebookProductivityPanel.jsx');
const css=read('src/styles/GradebookAcademicWorkspace.css');
const pc=read('src/components/gradebook/GradebookProductivityPanel.css');
const art=read('public/gradebook-material3-hero.svg');

test('Studio Edition has deliberately composed crisp scalable artwork',()=>{
  assert.match(art,/viewBox="0 0 620 265"/);
  assert.match(art,/<linearGradient id="iris"/);
  assert.match(art,/<linearGradient id="paper"/);
  assert.match(art,/<linearGradient id="mint"/);
  assert.match(art,/>A\+<\/text>/);
  assert.match(art,/#104DAE/);
  assert.doesNotMatch(art,/<image\b|data:image\/jpeg|\.png/);
  assert.match(page,/src="\/gradebook-material3-hero\.svg"/);
});

test('Native hero actions use accessible vector icons but unchanged real action handlers',()=>{
  assert.match(page,/from 'lucide-react'/);
  for(const name of ['Sparkles','ClipboardPenLine','ChartNoAxesCombined','FileDown','UsersRound','Plus']){
    assert.match(page,new RegExp('<'+name+'\\s'));
  }
  assert.match(page,/requestGradebookAction\('entry'\)/);
  assert.match(page,/requestGradebookAction\('summary'\)/);
  assert.match(page,/requestGradebookAction\('pdf'\)/);
  assert.match(page,/onClick=\{openStudentRoster\}/);
  assert.match(page,/const openStudentRoster = \(\) =>/);
  assert.match(page,/if \(!canLeaveGradebook\(\)\) return/);
  assert.match(page,/onClick=\{\(\) => setCreateOpen\(\(value\) => !value\)\}/);
  assert.match(page,/className="gb-academic-class-list"/);
});

test('One cohesive themed route, readable hierarchy and responsive interactions',()=>{
  assert.match(css,/BRiAN Gradebook • Material 3 Studio Edition/);
  assert.match(css,/--gb-studio-cobalt:#255ef0/);
  assert.match(css,/--gb-studio-iris:#6856de/);
  assert.match(css,/--gb-studio-teal:#079d90/);
  assert.match(css,/gb-academic-class-meta/);
  assert.match(css,/hr-grade-overview article::before/);
  assert.match(css,/hr-grade-table thead th\.gb-m3-attempt--0/);
  assert.match(css,/hr-grade-table tbody td\.gb-m3-score-cell--3/);
  assert.match(css,/@media\(max-width:740px\)/);
  assert.match(css,/@media\(max-width:440px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(pc,/Material 3 Studio Edition/);
  assert.match(pc,/gb-prod-tabs button\[data-tab="alerts"\]/);
  assert.doesNotMatch(css+pc,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer)/);
  for(const source of [css,pc])assert.equal((source.match(/\{/g)||[]).length,(source.match(/\}/g)||[]).length);
});

test('Table has safe independent scrolling, pinned names and unchanged grading formulas',()=>{
  assert.match(css,/\.hr-gradebook \.hr-grade-table-wrap\s*\{[\s\S]*?overflow:auto/);
  assert.match(css,/\.hr-gradebook \.hr-grade-table\s*\{[\s\S]*?table-layout:auto/);
  assert.match(css,/\.hr-grade-table \.hr-grade-student\s*\{[\s\S]*?position:sticky;[\s\S]*?left:48px/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(engine,/gradeRoundBonus\(activeRound/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/onClick=\{save\}>Lưu điểm/);
  assert.match(engine,/onClick=\{openClassGradebook\}/);
  assert.match(engine,/onClick=\{openStudentReport\}/);
});

test('Ten original real gradebook tools and import actions remain intact',()=>{
  const ids=['paste','progress','heatmap','alerts','quality','history','finalize','rubric','report','recovery'];
  for(const id of ids){
    assert.match(prod,new RegExp("id:'"+id+"',icon:<"));
    assert.match(pc,new RegExp('button\\[data-tab="'+id+'"\\]'));
  }
  assert.match(prod,/onClick=\{commitIntervention\}/);
  assert.match(prod,/readGradebookXlsx/);
  assert.match(prod,/onClick=\{\(\)=>\{setTab\(item\.id\);setNotice\(''\);\}\}/);
});
