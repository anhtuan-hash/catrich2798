import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const get=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const engine=get('src/components/gradebook/GradebookEngine.jsx');
const css=get('src/styles/GradebookAcademicWorkspace.css');
const start=engine.indexOf('function GradebookNavigationPalette(');
const end=engine.indexOf('export default function HomeroomLearningGradebook',start);
const nav=engine.slice(start,end);

test('two semesters and all seven grading tabs are permanently rendered',()=>{
  assert.match(nav,/SEMESTERS\.map\(/);
  assert.match(nav,/VIEWS\.map\(/);
  for(const label of ['Học kỳ I','Học kỳ II','TX · Đợt 1','TX · Đợt 2','TX · Đợt 3','TX · Đợt 4','Giữa kỳ','Cuối kỳ','Tổng hợp'])
    assert.ok(engine.includes(label),label);
  assert.match(nav,/className="hr-grade-navigation-dock is-always-visible"/);
  assert.match(nav,/aria-pressed=\{semesterId === semester\.id\}/);
  assert.match(nav,/aria-pressed=\{view === item\.id\}/);
});
test('no collapsing mechanism remains in the live Gradebook palette',()=>{
  for(const token of [
    'setPreference','readHomeroomGradeNavigationPreference',
    'writeHomeroomGradeNavigationPreference','HOMEROOM_NAV_PALETTE_IDLE_MS',
    'createHomeroomNavigationScrollTracker','updateHomeroomNavigationScrollTracker',
    'hr-grade-navigation-launcher','hr-grade-navigation-options',
    'collapse(true)','scrollY','setTimeout','aria-hidden','inert=',
  ]) assert.ok(!nav.includes(token),token+' should not be in GradebookNavigationPalette');
  assert.ok(!engine.includes('hr-grade-navigation-launcher'));
});
test('status and save action always remain, with original save handler',()=>{
  assert.match(nav,/dirty \? 'Có thay đổi chưa lưu' : 'Dữ liệu đã lưu'/);
  assert.match(nav,/onClick=\{onSave\}>Lưu bảng điểm/);
  assert.match(nav,/disabled=\{!dirty\}/);
  assert.match(nav,/onClick=\{onDiscard\}>Hoàn tác/);
  assert.match(nav,/onClick=\{\(\) => onSemesterChange\(semester.id\)\}/);
  assert.match(nav,/onClick=\{\(\) => onViewChange\(item.id\)\}/);
});
test('responsive palette wraps, not horizontally clips or hides buttons',()=>{
  assert.match(css,/Permanent grade navigation:/);
  assert.match(css,/\.hr-grade-navigation-dock\.is-always-visible \.hr-grade-views\s*\{[\s\S]*?flex-wrap:wrap;[\s\S]*?overflow:visible/);
  assert.match(css,/\.hr-grade-navigation-dock\.is-always-visible > \.hr-grade-navigation\s*\{[\s\S]*?visibility:visible/);
  assert.match(css,/@media\(max-width:740px\)/);
  assert.doesNotMatch(css,/\.brian-nav|\.bes-top-chrome|html body footer|\.signature-footer/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
