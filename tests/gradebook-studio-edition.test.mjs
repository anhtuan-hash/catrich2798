import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const engine=read('src/components/gradebook/GradebookMacEngine.jsx');
const prod=read('src/components/gradebook/GradebookProductivityPanel.jsx');
const css=read('src/styles/GradebookAcademicWorkspace.css');
const pc=read('src/components/gradebook/GradebookProductivityPanel.css');
const art=read('public/gradebook-material3-hero.svg');

test('current media Hero has responsive real artwork and no baked bitmap requirement',()=>{
  const media=read('src/styles/GradebookHeroCommand.css');
  for(const token of [
   'gbmac-hero-command','gbmac-hero-default-art',
   'gbmac-art-chip is-blue','gbmac-art-chip is-peach',
   "gradebookHero.backgroundType === 'video'"
  ])assert.ok(page.includes(token),'Live Gradebook Hero missing '+token);
  assert.match(media,/gbmac-hero-media/);
  assert.match(media,/backdrop-filter: blur\(11px\)/);
  assert.doesNotMatch(media,/\.brian-nav|\.bes-top-chrome|\.signature-footer/);
});

test('native Header controls invoke grade operations with current class guards',()=>{
  assert.match(page,/from 'lucide-react'/);
  for(const token of [
    'const requestGradebookAction = (action) =>',
    'setGradebookAction((current) => ({ action, workspaceId, seq:',
    'onClick={openStudentRoster}',
    'const openStudentRoster = () =>','if (!canLeaveGradebook()) return',
    'onClick={()=>setCreateOpen(value=>!value)}','gbmac-shell-selectors',
  ])assert.ok(page.includes(token),'Current header action missing '+token);
  const live=read('src/components/gradebook/GradebookMacEngine.jsx');
  for(const name of ['onClick={openClassGradebook}','onClick={openStudentReport}','VIEWS.filter(item=>item.id'])assert.ok(live.includes(name),'Live Gradebook action missing '+name);
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

test('current Mac score grid scrolls independently with sticky identifiers and preserves math',()=>{
  const mac=read('src/components/gradebook/GradebookMacEngine.css');
  assert.match(mac,/\.gbmac-table-viewport[\s\S]*?overflow:auto/);
  assert.match(mac,/position:sticky;left:0/);
  assert.match(mac,/position:sticky;left:60px/);
  assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(engine,/gradeRoundBonus\(activeRound/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/onClick=\{save\}/);
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
