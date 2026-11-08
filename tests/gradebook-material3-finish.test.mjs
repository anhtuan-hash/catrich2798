import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const editor=read('src/components/gradebook/GradebookMacEngine.jsx');
const productivity=read('src/components/gradebook/GradebookProductivityPanel.jsx');
const css=read('src/styles/GradebookAcademicWorkspace.css');
const pc=read('src/components/gradebook/GradebookProductivityPanel.css');

test('vector controls use visible SVG strokes and accessible button labels',()=>{
  const current=read('src/components/gradebook/GradebookMacEngine.css');
  assert.match(editor,/from 'lucide-react'/);
  assert.match(editor,/<FileSpreadsheet size=\{16\} aria-hidden="true"\/> Xuất Excel/);
  assert.match(editor,/<FileText size=\{16\} aria-hidden="true"\/> Phiếu PDF/);
  assert.match(current,/\.gbmac-button|\.gbmac-primary-actions/);
});

test('class picker uses guarded class switch and remains responsive',()=>{
  assert.match(page,/activeClasses\.map\(item=>/);
  assert.match(page,/onChange=\{\(event\)=>switchGradebookClass\(event\.target\.value\)\}/);
  assert.match(page,/const switchGradebookClass = \(nextId\) =>/);
  assert.match(page,/if \(!canLeaveGradebook\(\)\) return/);
  assert.match(page,/gbmac-shell-selectors/);
  assert.match(read('src/styles/GradebookHeroCommand.css'),/@media/);
});

test('small roster defaults fully visible and resets on class change',()=>{
  const current=read('src/components/gradebook/GradebookMacEngine.css');
  assert.match(editor,/useState\(\(\) => students\.length <= 45\)/);
  assert.match(editor,/setShowFullRoster\(students\.length <= 45\)/);
  assert.match(editor,/\[workspace\.id, students\.length\]/);
  assert.match(editor,/onClick=\{\(\)=>setShowFullRoster/);
  assert.match(current,/\.gbmac-table-viewport[\s\S]*?overflow:auto/);
  assert.match(current,/position:sticky;left:60px/);
});

test('alerts and intervention are distinct complete and accessible interactive cards',()=>{
  assert.match(productivity,/className="gb-prod-alerts-layout"/);
  assert.match(productivity,/aria-label="Thiết lập cảnh báo điểm"/);
  assert.match(productivity,/aria-label="Ghi nhận hỗ trợ học sinh"/);
  assert.match(productivity,/warnings\.length/);
  assert.match(productivity,/onClick=\{commitIntervention\}/);
  assert.match(productivity,/onChange=\{e=>updateSetting\('minimum'/);
  assert.match(productivity,/onChange=\{e=>updateSetting\('decline'/);
  assert.match(pc,/grid-template-columns:minmax\(0,\.87fr\) minmax\(0,1\.13fr\)/);
  assert.match(pc,/@media\(max-width:970px\)/);
});
test('professionalized tool bar makes all 10 actions accessible',()=>{
  assert.match(pc,/\.gb-prod-tabs\s*\{[\s\S]*?grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(pc,/scroll-snap-type:x proximity/);
  assert.match(productivity,/TABS\.map\(item/);
  assert.match(productivity,/onSetFinalization/);
  assert.match(productivity,/readGradebookXlsx/);
  assert.match(productivity,/onSetIntervention/);
});
test('single save action preserves dirty-state guards, undo, export and score operations',()=>{
  assert.match(editor,/className="gbmac-save-state" role="status"/);
  assert.match(editor,/onClick=\{save\} disabled=\{!dirty\|\|savePending\}/);
  assert.match(editor,/onClick=\{discard\}/);
  assert.match(editor,/onClick=\{openClassGradebook\}/);
  assert.match(editor,/onClick=\{openStudentReport\}/);
  assert.match(editor,/gradeRoundBonus\(activeRound/);
  assert.match(editor,/roundScore\(activeRound, student\.id, studentIds\)/);
  assert.match(editor,/await onCommit\(/);
});

test('global site navigation/footer and data contracts are never changed',()=>{
  assert.doesNotMatch(css+pc,/(?:\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer)/);
  assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
  assert.equal((pc.match(/\{/g)||[]).length,(pc.match(/\}/g)||[]).length);
});
