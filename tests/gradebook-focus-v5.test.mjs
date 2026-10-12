import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeGradebookProgress} from '../src/utils/gradebookProgressDeck.js';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const engine=read('src/components/gradebook/GradebookEngine.jsx');
const page=read('src/pages/GradebookStudio.jsx');
const focus=read('src/components/gradebook/GradebookFocusBar.jsx');
const css=read('src/styles/GradebookFocusV5.css');
const mock=read('src/components/gradebook/GradebookMockExams.jsx');
assert.match(page,/import '..\/styles\/GradebookRosterLayoutHotfix.css';\s*import '..\/styles\/GradebookFocusV5.css';/);
assert.match(page,/gradebook-studio gb4-spectrum gb5-focus/);
assert.match(page,/switchGradebookClass\(event\.target\.value\)/);
assert.match(engine,/import GradebookFocusBar from '\.\/GradebookFocusBar.jsx'/);
assert.match(engine,/const \[insightsOpen, setInsightsOpen\] = useState\(false\)/);
const after=engine.slice(engine.indexOf('return <div className={\x60hr-tab-stack hr-gradebook'));
const positions=[
  '<GradebookNavigationPalette',
  '<GradebookFocusBar',
  'className="gb5-editor-anchor"',
  '{renderRosterToolbar()}',
  "view.startsWith('regular-') ? renderRegularTable()",
  'className="gb5-insights-drawer"',
  'className="hr-grade-overview"',
  '<GradebookProgressDeck',
  'className="gb-academic-administration"',
  '<GradebookProductivityPanel',
];
for (let i=1;i<positions.length;i++) {
 assert.ok(after.indexOf(positions[i-1])>=0 && after.indexOf(positions[i])>after.indexOf(positions[i-1]),
  'Focus-first order violation: '+positions[i-1]+' then '+positions[i]);
}
assert.match(engine,/insightsOpen \? <div className="gb5-insights-content">/);
assert.match(engine,/onToggle=\{\(event\) => setInsightsOpen\(event.currentTarget.open\)\}/);
assert.match(engine,/onOpenInsights=\{\(\) => \{/);
assert.match(engine,/onScrollToTable=\{\(\) => document\.querySelector/);
assert.match(engine,/onBulkPaste=\{bulkPasteMockExam\} onSetLock=\{setMockExamLock\}/);
assert.match(engine,/gradeRoundBonus\(activeRound, student\.id, studentIds\)/);
assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
assert.match(engine,/onChange=\{\(value\) => updateRegularScore\(student\.id, column\.id, value\)\}/);
assert.match(engine,/if \(!dirty \|\| savePending\) return;/);
assert.match(engine,/const commitResult = await onCommit/);
assert.match(engine,/className="gbv2-save-strip"/);
assert.match(focus,/summarizeGradebookProgress/);
assert.match(focus,/onToggleMissing/);
assert.match(focus,/onNextMissing/);
assert.match(focus,/onOpenInsights/);
assert.match(focus,/onScrollToTable/);
assert.match(focus,/view === 'mock'/);
assert.match(focus,/Không có điểm cộng và không tính điểm trung bình/);
assert.match(focus,/aria-pressed=\{missingOnly\}/);
for(const token of [
 '.gb-academic-heading','.gb-academic-class-list button',
 '.hr-grade-navigation-dock.is-always-visible','.gb5-focusbar','.gb5-focusbar-actions',
 '.gb5-score-progress','.gb5-editor-anchor','.gb5-insights-drawer',
 '.hr-grade-panel-head','.hr-grade-table-wrap',
 '@media(max-width:1150px)','@media(max-width:750px)','@media(max-width:500px)'
]) assert.ok(css.includes(token),'Missing V5 design: '+token);
assert.match(css,/#root \.gradebook-studio\.gb5-focus/);
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
assert.doesNotMatch(css,/\.brian-nav\b|\.bes-top-chrome|#root\s*\{/);
assert.match(mock,/selectVisibleMockExams/);
const score= summarizeGradebookProgress([{id:'a'},{id:'b'}],{
 regular:Array.from({length:4},()=>({columns:[{id:'x'}],scores:{a:{x:'0'},b:{x:''}}})),
 midterm:{scores:{a:'7'}},final:{scores:{}}
});
assert.equal(score.filled,5);
assert.equal(score.total,12);
assert.equal(score.missing,7);
console.log('PASS Gradebook V5 focus-first layout: data safety, lazy analytics, navigation, save, mocks, responsive and zero scores');
