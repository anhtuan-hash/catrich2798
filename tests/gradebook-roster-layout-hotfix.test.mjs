import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const fix=read('src/styles/GradebookRosterLayoutHotfix.css');
const engine=read('src/components/gradebook/GradebookEngine.jsx');
assert.match(page,/import '..\/styles\/GradebookSpectrumV4.css';\s*import '..\/styles\/GradebookRosterLayoutHotfix.css';/);
for (const part of ['.gb-roster-workbench {','.gb-roster-workbench-main {','.gb-roster-workbench-side {','.gb-roster-missing > span {','.gb-roster-search input {','@media (max-width: 850px)','@media (max-width: 620px)']) {
  assert.ok(fix.includes(part),'Layout repair missing '+part);
}
assert.match(fix,/grid-template-columns:\s*minmax\(0,\s*1fr\) !important/);
assert.match(fix,/min-width:\s*190px !important/);
assert.match(fix,/white-space:\s*nowrap !important/);
assert.match(fix,/writing-mode:\s*horizontal-tb !important/);
assert.match(fix,/#root \.gradebook-studio \.hr-gradebook/);
assert.equal((fix.match(/\{/g)||[]).length,(fix.match(/\}/g)||[]).length,'balanced hotfix CSS');
assert.match(engine,/className="gb-roster-missing"/);
assert.match(engine,/Chỉ học sinh còn thiếu điểm/);
assert.match(engine,/className="gb-roster-workbench"/);
assert.match(engine,/className="gb-roster-workbench-side"/);
assert.match(engine,/onChange=\{\(event\) => setMissingOnly\(event.target.checked\)\}/);
assert.match(engine,/onChange=\{\(event\) => setSortBy\(event.target.value\)\}/);
assert.match(engine,/onChange=\{\(event\) => setStudentQuery\(event.target.value\)\}/);
console.log('PASS Gradebook roster layout hotfix preserves working filters and prevents character-wide label');
