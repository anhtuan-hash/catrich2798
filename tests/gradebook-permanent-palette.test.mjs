import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const get=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const engine=get('src/components/gradebook/GradebookMacEngine.jsx');
const page=get('src/pages/GradebookStudio.jsx');
const css=get('src/components/gradebook/GradebookMacEngine.css');

test('two semesters and all seven score views remain available',()=>{
  assert.match(engine,/const SEMESTERS = \[/);
  assert.match(engine,/const VIEWS = \[/);
  for(const label of ['Học kỳ I','Học kỳ II','TX · Đợt 1','TX · Đợt 2','TX · Đợt 3','TX · Đợt 4','Giữa kỳ','Cuối kỳ','Tổng hợp'])
    assert.ok(engine.includes(label),'Missing semester or score view: '+label);
  assert.match(page,/value=\{selectedSemester\}/);
  assert.match(page,/setSelectedSemester\(event\.target\.value\)/);
  assert.match(engine,/VIEWS\.filter\(item=>item\.id!=='mock'\)\.map/);
  assert.match(engine,/aria-pressed=\{view===item\.id\}/);
  assert.match(engine,/onClick=\{\(\)=>changeView\(item\.id\)\}/);
  assert.match(engine,/className="gbmac-tabs"/);
});

test('active score tabs stay mounted; no timer-based palette collapse',()=>{
  const start=engine.indexOf('<nav className="gbmac-tabs"');
  const end=engine.indexOf('</nav>',start);
  assert.ok(start>=0&&end>start);
  const nav=engine.slice(start,end);
  assert.doesNotMatch(nav,/setTimeout|scrollY|collapse\(|inert=|aria-hidden|hr-grade-navigation-launcher/);
  assert.match(nav,/VIEWS\.filter/);
  assert.doesNotMatch(engine,/hr-grade-navigation-launcher/);
});

test('saved/unsaved state and explicit save/undo stay associated with current data',()=>{
  assert.match(engine,/className="gbmac-save-state" role="status" aria-live="polite"/);
  assert.match(engine,/dirty\?'Có thay đổi chưa lưu':'Đã lưu'/);
  assert.match(engine,/onClick=\{save\} disabled=\{!dirty\|\|savePending\}/);
  assert.match(engine,/onClick=\{discard\}/);
  assert.match(engine,/await onCommit\(/);
  assert.match(engine,/if \(!dirty \|\| savePending\) return/);
});

test('responsive tabs preserve scroll accessibility and do not alter global chrome',()=>{
  assert.match(css,/\.gbmac-tabs\{display:flex;overflow-x:auto/);
  assert.match(css,/@media/);
  assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|html body footer|\.signature-footer/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
