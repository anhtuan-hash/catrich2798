import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeGradebookProgress} from '../src/utils/gradebookProgressDeck.js';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const engine=read('src/components/gradebook/GradebookMacEngine.jsx');
const compat=read('src/components/gradebook/GradebookEngine.jsx');
const page=read('src/pages/GradebookStudio.jsx');
const css=read('src/components/gradebook/GradebookMacEngine.css');
const hero=read('src/styles/GradebookHeroCommand.css');
const mock=read('src/components/gradebook/GradebookMockExams.jsx');

// The V5 test name is historical. The active Gradebook is MacEngine with a
// native picture/video Hero v4. Keep all score, export and data guards.
assert.match(page,/gbmac-hero-command/);
assert.match(page,/gbmac-hero-media/);
assert.match(page,/const switchGradebookClass = \(nextId\) =>/);
assert.match(page,/if \(!canLeaveGradebook\(\)\) return/);
assert.match(page,/window\.confirm\('Sổ điểm đang có thay đổi chưa lưu/);
assert.match(page,/onClick=\{openStudentRoster\}/);
assert.match(compat,/export \{ default \} from '\.\/GradebookMacEngine\.jsx'/);
assert.match(engine,/const VIEWS = \[/);
assert.match(engine,/VIEWS\.filter\(item=>item\.id!=='mock'\)\.map/);
assert.match(engine,/aria-pressed=\{view===item\.id\}/);
assert.match(engine,/className="gbmac-workspace"/);
assert.match(engine,/className="gbmac-table-viewport"/);
assert.match(engine,/className="gbmac-tools-dialog"/);
assert.match(engine,/insightsOpen \? createPortal/);
assert.match(engine,/onClick=\{save\} disabled=\{!dirty\|\|savePending\}/);
assert.match(engine,/onClick=\{discard\}/);
assert.match(engine,/if \(!dirty \|\| savePending\) return/);
assert.match(engine,/const commitResult = await onCommit/);
assert.match(engine,/onClick=\{openClassGradebook\}/);
assert.match(engine,/onClick=\{openStudentReport\}/);
assert.match(engine,/gradeRoundBonus\(activeRound/);
assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
assert.match(engine,/updateRegularScore\(student\.id/);
assert.match(engine,/GradebookMockExams/);
assert.match(mock,/selectVisibleMockExams/);
for (const token of [
 '.gbmac-tabs','.gbmac-primary-actions','.gbmac-search','.gbmac-table-viewport',
 '.gbmac-tools-dialog','@media(max-width:760px)','@media(prefers-reduced-motion:reduce)'
]) assert.ok(css.includes(token),'Active Mac Gradebook style missing: '+token);
assert.match(hero,/gbmac-hero-command/);
assert.match(hero,/backdrop-filter: blur\(11px\)/);
assert.doesNotMatch(css,/\.brian-nav\b|\.bes-top-chrome|#root\s*\{/);
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
const score=summarizeGradebookProgress([{id:'a'},{id:'b'}],{
 regular:Array.from({length:4},()=>({columns:[{id:'x'}],scores:{a:{x:'0'},b:{x:''}}})),
 midterm:{scores:{a:'7'}},final:{scores:{}}
});
assert.equal(score.filled,5);
assert.equal(score.total,12);
assert.equal(score.missing,7);
console.log('PASS Gradebook focus compatibility: current owner, save, data, exports, scroll, accessibility and zero-score math.');
