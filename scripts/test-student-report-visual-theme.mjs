import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const jsx=readFileSync('src/components/attendance/StudentAttendanceReport.jsx','utf8');
const css=readFileSync('src/components/attendance/StudentAttendanceReportTheme.css','utf8');
const original=readFileSync('src/components/attendance/StudentAttendanceReport.css','utf8');
assert.match(jsx,/import '.\/StudentAttendanceReportTheme.css'/);
assert.match(jsx,/<AttendancePanelHeading className="stud-att__intro"/,'Student report now shares the canonical header component');
for(const name of ['report','excel','pdf','students','periods','chart','watch','filter','refresh','person','case']) {
  assert.ok(jsx.includes('  '+name+':'), 'Missing student report icon: '+name);
}
for(const key of ['stud-att__intro','stud-att__hero-icon','stud-att__filter-panel','stud-att__filter-heading','stud-att__reporter','stud-att__filters','stud-att__metric--students','stud-att__metric--periods','stud-att__metric--rate','stud-att__metric--watch']) {
  assert.ok(jsx.includes(key), 'Missing UI section: '+key);
  assert.ok(css.includes('.'+key), 'Missing scoped theme: '+key);
}
for(const token of ['#d8ecff','#d5f5e6','#e9d9ff','#ffebcb','@media(max-width:700px)','focus-visible','prefers-reduced-motion']) {
  assert.ok(css.includes(token), 'Theme missing: '+token);
}
assert.ok(css.split('\n').filter(line=>line.trim().startsWith('.')).every(line=>line.trim().startsWith('.stud-att')||line.trim().startsWith('.stud-att__')), 'Do not style teacher report or application globally');
assert.match(jsx,/buildStudentAttendanceReport\(/, 'Keep student attendance computation unchanged');
assert.match(jsx,/downloadStudentAttendanceExcel\(/);
assert.match(jsx,/printStudentAttendancePdf\(/);
assert.ok(original.includes('.stud-att__chart'),'Retain chart base styles');
console.log('Student report visual theme and business logic contract passed.');
