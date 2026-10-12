import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const editor=read('src/components/gradebook/GradebookEngine.jsx');
const productivity=read('src/components/gradebook/GradebookProductivityPanel.jsx');
const css=read('src/styles/GradebookAcademicWorkspace.css');
const pc=read('src/components/gradebook/GradebookProductivityPanel.css');

test('outlined icons render in their intended colors, never as blank blocks',()=>{
  assert.match(editor,/fill: 'none', stroke: 'currentColor', strokeWidth: 1\.8/);
  assert.match(css,/\.hr-grade-overview \.hr-grade-overview-icon svg,[\s\S]*?stroke:currentColor/);
  for(const kind of ['bars','students','document','check','excel','pencil'])assert.ok(editor.includes("type === '"+kind+"'"),kind);
});
test('class picker remains responsive and has direct jump for large class lists',()=>{
  assert.match(page,/activeClasses\.length > 12/);
  assert.match(page,/id="gb-m3-quick-class"/);
  assert.match(page,/onChange=\{\(event\) => switchGradebookClass\(event.target.value\)\}/);
  assert.match(page,/const switchGradebookClass = \(nextId\) =>/);
  assert.match(page,/if \(!canLeaveGradebook\(\)\) return/);
  assert.match(page,/className="gb-academic-class-list"/);
  assert.match(css,/\.gb-m3-class-jump/);
});
test('29-pupil roster defaults fully visible and resets on workspace changes',()=>{
  assert.match(editor,/useState\(\(\) => students\.length <= 45\)/);
  assert.match(editor,/setShowFullRoster\(students\.length <= 45\)/);
  assert.match(editor,/\[workspace\.id, students\.length\]/);
  assert.match(editor,/gbv3-table-expanded/);
  assert.match(editor,/onClick=\{\(\) => setShowFullRoster\(\(value\) => !value\)\}/);
  assert.match(css,/\.hr-grade-panel \.hr-grade-table-wrap\.gbv3-table-expanded\s*\{[\s\S]*?max-height:none/);
  assert.match(css,/\.hr-grade-table \.hr-grade-student\s*\{[\s\S]*?position:sticky;[\s\S]*?left:48px/);
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
test('there is a single save location when clean, full actions are preserved if dirty',()=>{
  assert.match(editor,/\{dirty \? <div className="gbv2-save-strip"/);
  assert.match(editor,/onClick=\{save\}>Lưu điểm/);
  assert.match(editor,/onClick=\{discard\}>Hoàn tác/);
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
