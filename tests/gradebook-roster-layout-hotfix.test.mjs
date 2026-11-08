import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const workspace=read('src/components/gradebook/GradebookWorkspace.jsx');
const engine=read('src/components/gradebook/GradebookMacEngine.jsx');
const css=read('src/components/gradebook/GradebookMacEngine.css');
// The historical Roster Hotfix is replaced by the live Mac scoring toolbar.
assert.match(page,/const switchGradebookClass = \(nextId\) =>/);
assert.match(page,/if \(!canLeaveGradebook\(\)\) return/);
assert.match(page,/onClick=\{openStudentRoster\}/);
assert.match(workspace,/return <GradebookMacEngine key=\{props\.workspace\?\.id\}/);
for(const token of [
 "const [studentQuery, setStudentQuery] = useState('')",
 "const [sortBy, setSortBy] = useState('original')",
 "setSortBy('original')",
 "value=\"missing-first\"",
 "onClick={focusNextEmptyScore}",
 "onClick={openClassGradebook}",
 "onClick={openStudentReport}",
 "onClick={save}",
 "onClick={discard}",
 "gbmac-table-viewport",
 "gbmac-pin-name",
 "gbmac-pin-index",
])assert.ok(engine.includes(token),'Current Gradebook roster/score action missing: '+token);
assert.match(engine,/filterGradebookStudentView\(/);
assert.match(engine,/disabled=\{finalized\|\|!visibleStudents\.length\}/);
assert.match(css,/\.gbmac-search\{/);
assert.match(css,/\.gbmac-toggle\{/);
assert.match(css,/\.gbmac-sort\{/);
assert.match(css,/\.gbmac-toolbar\{/);
assert.match(css,/\.gbmac-primary-actions\{width:100%;margin:0\}/);
assert.match(css,/\.gbmac-table-viewport[\s\S]*?overflow:auto/);
assert.match(css,/position:sticky;left:0/);
assert.match(css,/position:sticky;left:60px/);
assert.match(css,/@media\(max-width:760px\)/);
assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|\.signature-footer/);
assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
console.log('PASS current Gradebook roster: safe class switching, filters, exports, scroll, sticky columns and mobile layout.');
