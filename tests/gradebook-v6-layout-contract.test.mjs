import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { summarizeGradebookProgress } from '../src/utils/gradebookProgressDeck.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const css = read('src/styles/GradebookFocusV5.css');
const engine = read('src/components/gradebook/GradebookEngine.jsx');
const root = postcss.parse(css);
const key = '#root .gradebook-studio.gb5-focus .hr-gradebook .hr-grade-navigation-dock.is-always-visible';
const viewSelector = key + ' .hr-grade-views';
const saveSelector = key + ' .hr-grade-save-actions';
const semesterSelector = key + ' .hr-grade-semesters';
const navSelector = key + ' > .hr-grade-navigation';
const selectors = [viewSelector, saveSelector, semesterSelector, navSelector];
for (const selector of selectors) {
  const rootRules = root.nodes.filter((rule) => rule.type === 'rule' && rule.selector === selector);
  assert.equal(rootRules.length, 1, 'Navigation has more than one default CSS authority: ' + selector);
}
// No old unqualified .hr-grade-views rules in V5 can bypass the authority.
root.walkRules((rule) => {
  if (!/\.hr-grade-(?:views|semesters|save-actions)/.test(rule.selector)) return;
  assert.ok(rule.selector.startsWith(key), 'Legacy navigation rule retained in V5: ' + rule.selector);
});
assert.match(css, /container-name:gb-navigation/);
assert.match(css, /@container gb-navigation \(max-width:1050px\)/);
assert.match(css, /@container gb-navigation \(max-width:720px\)/);
assert.match(css, /@container gb-navigation \(max-width:460px\)/);
assert.match(css, /repeat\(7,minmax\(0,1fr\)\)/);
for (const n of [4,3,2]) assert.ok(css.includes('repeat('+n+',minmax(0,1fr))'));
assert.match(css, /\.gb6-tab-fill/);
assert.match(css, /width:var\(--gb6-progress,0%\)/);
assert.match(css, /\.hr-grade-table\.gb5-table-fill/);
assert.match(engine, /summarizeGradebookProgress\(students, activeSemester\)/);
assert.match(engine, /progressSections=\{semesterEntryProgress\.sections\}/);
assert.match(engine, /progressById\[item\.id\]\.filled/);
assert.match(engine, /progressById\[item\.id\]\.total/);
assert.match(engine, /'--gb6-progress'/);
assert.match(engine, /className="gb6-tab-fill"/);
assert.match(engine, /brian-gradebook-density-v6/);
assert.doesNotMatch(engine, /setDensity\('comfortable'\)/);
assert.match(engine, /gradeRoundBonus\(activeRound/);
assert.match(engine, /roundScore\(activeRound, student\.id, studentIds\)/);
assert.match(engine, /onBulkPaste=\{bulkPasteMockExam\} onSetLock=\{setMockExamLock\}/);
const students = [{id:'a'},{id:'b'},{id:'archived',active:false}];
const semester = {regular:[
  { columns:[{id:'x'}],scores:{a:{x:'0'},b:{x:'8.5'}} },
  { columns:[{id:'y'}],scores:{a:{y:''},b:{y:'9'}} },
  { columns:[{id:'z'}],scores:{} },
  { columns:[{id:'w'}],scores:{} },
],midterm:{scores:{a:'0',b:'6'}},final:{scores:{}},mockExams:[{scores:{a:10,b:10}}]};
const before = JSON.stringify({students,semester});
const progress = summarizeGradebookProgress(students,semester);
assert.equal(progress.students, 2);
assert.equal(progress.sections.length, 6);
assert.equal(progress.sections[0].filled, 2);
assert.equal(progress.sections[4].filled, 2);
assert.equal(progress.total, 12);
assert.equal(progress.filled, 5);
assert.equal(progress.nextView, 'regular-1');
assert.equal(JSON.stringify({students,semester}), before);
console.log('PASS gradebook V6: one navigation geometry authority, container hardening, progress strips, persistent density and unchanged grade math');
