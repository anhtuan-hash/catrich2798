import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=load('src/pages/GradebookStudio.jsx');
const engine=load('src/components/gradebook/GradebookMacEngine.jsx');
const css=load('src/components/gradebook/GradebookMacEngine.css');
const hero=load('src/styles/GradebookHeroCommand.css');
// Historical Spectrum V4 no longer owns the Gradebook. The current Mac
// Gradebook has seven semantic tones and a configurable image/video Hero.
for(const token of [
  "import '../styles/GradebookHeroCommand.css'",'gbmac-hero-command',
  "gradebookHero.backgroundType === 'video'",'onPreview={setGradebookHeroPreview}',
  'onClick={openStudentRoster}','const switchGradebookClass = (nextId) =>',
  'if (!canLeaveGradebook()) return',
])assert.ok(page.includes(token),'Current Gradebook route missing '+token);
for(const token of [
  'const VIEWS = [','VIEWS.filter(item=>item.id!==\'mock\').map',
  'aria-pressed={view===item.id}','onClick={()=>changeView(item.id)}',
  'gradeRoundBonus(activeRound','roundScore(activeRound, student.id, studentIds)',
  'mockExams: normalizeMockExams(source.mockExams)',
  'onBulkPaste={bulkPasteMockExam} onSetLock={setMockExamLock}',
  'onClick={save}','onClick={discard}',
])assert.ok(engine.includes(token),'Current Gradebook operation missing '+token);
for(const tone of ['blue','red','yellow','green','purple','orange','cyan'])
  assert.ok(css.includes('.gbmac-tabs button[data-tone="'+tone+'"]'),'Semantic tone missing '+tone);
for(const t of [
  '.gbmac-tabs button.is-selected','.gbmac-table tbody tr:hover td',
  '@media(max-width:760px)','@media(prefers-reduced-motion:reduce)'
])assert.ok(css.includes(t),'Current Gradebook CSS missing '+t);
assert.match(hero,/backdrop-filter: blur\(11px\)/);
assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer|#root\s*\{/);
assert.doesNotMatch(hero,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer/);
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
assert.equal((hero.match(/\{/g)||[]).length,(hero.match(/\}/g)||[]).length);
console.log('PASS Gradebook Spectrum continuity: semantic tones, actual scoring, reduced motion, media and accessibility');
