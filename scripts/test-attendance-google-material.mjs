import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const manage=read('src/components/attendance/AttendanceClassManagementWorkspace.jsx');
const nav=read('src/components/GlobalAttendanceNavigationTab.jsx');
const material=read('src/pages/AttendanceWorkspaceRebuilt.css');
const print=read('src/components/attendance/StudentAttendanceReport.jsx');
for(const field of ['Môn học','Giáo viên','Phòng học','Thời gian','Sĩ số']){
  assert.ok(manage.includes(field),'Missing visible class card field '+field);
}
for(const binding of ['classRow.class_name','classRow.subject','classRow.grade_level','studentCount','teacher','weekday','time','room']){
  assert.ok(manage.includes(binding),'Card must use live data: '+binding);
}
assert.match(manage,/const \[manageDisplay, setManageDisplay\] = useState\('grid'\)/,'Grid/list toggle must be interactive React state');
assert.match(manage,/aria-pressed=\{manageDisplay === 'grid'\}/,'Grid option has accessible state');
assert.match(manage,/aria-pressed=\{manageDisplay === 'list'\}/,'List option has accessible state');
assert.match(manage,/setManageDisplay\('grid'\)/);
assert.match(manage,/setManageDisplay\('list'\)/);
assert.match(manage,/classSubjectIcon\(subjectKey\)/,'Card icon depends on actual subject');
assert.match(manage,/onClick=\{\(\) => openClass\(classRow\)\}/,'Clicking class opens its real details');
assert.match(manage,/onClick=\{\(\) => setManageTypeFilter\(value\)\}/);
assert.match(manage,/onClick=\{\(\) => setManageGradeFilter\(value\)\}/);
assert.match(manage,/importExcel\?\.\(event\.target\.files\?\.\[0\]\)/,'Real Excel import unchanged');
assert.match(nav,/tone:'green',icon:'manage'/);
assert.match(nav,/tone:'violet',icon:'users'/);
for(const subject of ['geography','chemistry','math','english','literature','physics','history','biology']){
  assert.ok(material.includes('is-subject-'+subject),'Subject contrast missing: '+subject);
}
assert.match(material,/\.attendance-tabs>button\.is-active\s*\{[^}]*inset 0 -3px 0/,'Material tab must use active underline');
assert.match(material,/\.attendance-manage-tile-grid\.is-list/,'List toggle styled');
assert.match(material,/@media\(max-width:700px\)/,'Responsive mobile layout');
assert.match(material,/Visual refinement 2026-10-21/,'Consolidated final Material refinement required');
assert.doesNotMatch(material,/@page/,'Print layout must be independent');
assert.match(print,/In \/ Lưu PDF|doPdf/,'Student PDF action retained');
assert.doesNotMatch(manage,/\+\s*2\s*so với|so với tháng trước|mức tăng|↑ \+18/,'No fabricated growth indicators from mockup');
console.log('PASS: Material UI semantic colors, live data, controls, grid/list toggle and PDF isolation.');
