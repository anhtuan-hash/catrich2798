import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const eng=read('src/components/gradebook/GradebookEngine.jsx');
const product=read('src/components/gradebook/GradebookProductivityPanel.jsx');
const css=read('src/styles/GradebookAcademicWorkspace.css');
const pc=read('src/components/gradebook/GradebookProductivityPanel.css');
const art=read('public/gradebook-material3-hero.svg');

test('approved colorful Material 3 design uses a crisp SVG asset and route-only visual styles',()=>{
  assert.match(page,/src="\/gradebook-material3-hero\.svg"/);
  assert.match(art,/<svg[^>]*viewBox="0 0 620 265"/);
  assert.match(art,/<linearGradient/);
  assert.match(art,/>A\+</);
  assert.match(art,/#104DAE/); // graduation cap
  assert.match(css,/BRIAN COLORFUL MATERIAL 3 · Approved visual revision/);
  assert.match(css,/background:linear-gradient\(112deg,#e5f4ff,#d3eaff\)!important/);
  assert.match(css,/background:linear-gradient\(112deg,#e4fff1,#d3f6e7\)!important/);
  assert.match(css,/background:linear-gradient\(112deg,#f3eaff,#e6dbff\)!important/);
  assert.match(css,/background:linear-gradient\(112deg,#fff5df,#ffe9c4\)!important/);
  assert.doesNotMatch(css+pc,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer)/);
});

test('live KPIs retain real figures and completion progress is based on class data',()=>{
  assert.match(eng,/\{totalRegularColumns\}/);
  assert.match(eng,/\{students\.length\}/);
  assert.match(eng,/\{subjectEntries\.length\}/);
  assert.match(eng,/\{completedFourRounds\}\/\{students\.length\}/);
  assert.match(eng,/--gb-completion/);
  assert.match(eng,/Math\.round\(completedFourRounds \/ students\.length \* 100\)/);
  assert.match(css,/--gb-completion,0%/);
  for(const tone of ['blue','green','purple','yellow'])assert.match(eng,new RegExp('className="tone-'+tone+'"'));
});

test('editable score columns get tonal styling by index, no scoring logic is replaced',()=>{
  assert.match(eng,/activeRound\.columns\.map\(\(column, columnIndex\) => <th/);
  assert.match(eng,/gb-m3-attempt--\$\{columnIndex % 4\}/);
  assert.match(eng,/activeRound\.columns\.map\(\(column, columnIndex\) => <td/);
  assert.match(eng,/gb-m3-score-cell--\$\{columnIndex % 4\}/);
  assert.match(eng,/onChange=\{\(value\) => updateRegularScore\(student\.id, column\.id, value\)\}/);
  assert.match(eng,/gradeRoundBonus\(activeRound/);
  assert.match(eng,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(eng,/await onCommit\(/);
  assert.match(eng,/onClick=\{save\}>Lưu điểm/);
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
