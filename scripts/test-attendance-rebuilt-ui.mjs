import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(p,'utf8');
const ui=read('src/components/attendance/AttendanceWorkspaceUI.jsx');
const nav=read('src/components/GlobalAttendanceNavigationTab.jsx');
const manage=read('src/components/attendance/AttendanceClassManagementWorkspace.jsx');
const archive=read('src/components/attendance/AttendanceArchivePanel.jsx');
const teacher=read('src/components/attendance/AttendanceMonthlyReport.jsx');
const student=read('src/components/attendance/StudentAttendanceReport.jsx');
const page=read('src/pages/AttendanceWorkspace.jsx');
const css=read('src/pages/AttendanceWorkspaceRebuilt.css');
const old=read('src/pages/AttendanceWorkspace.css');
for(const component of ['AttendanceViewHeader','AttendancePanelHeading','AttendanceStatCard','AttendanceEmpty','AttendanceUiIcon']){
  assert.match(ui,new RegExp('export function '+component+'\\('),'Reusable '+component+' missing');
}
for(const tab of ['quick','calendar','manage','history','report','archive','supplemental','teacher']){
  assert.ok(ui.includes(tab+':{eyebrow:'),'Missing shared heading metadata for '+tab);
}
assert.match(nav,/<AttendanceViewHeader view=\{view\}/,'Root tab heading must use shared React view component');
assert.match(nav,/view === 'history' \? \[/,'History should report dynamic data');
assert.match(nav,/view === 'manage' \? \[/,'Manage should report dynamic data');
assert.match(nav,/view === 'quick' \? \[/,'Quick should report dynamic data');
assert.match(manage,/attendance-manage-list-heading/,'Class list uses a compact inline heading instead of duplicating the main hero');
assert.match(archive,/<AttendancePanelHeading className="attendance-archive__hero"/);
assert.match(archive,/<AttendanceStatCard icon="archive"/);
assert.match(manage,/<AttendanceEmpty title="Không có lớp phù hợp"/);
assert.match(teacher,/<AttendancePanelHeading className="att-report-m3__hero-copy"/);
assert.match(student,/<AttendancePanelHeading className="stud-att__intro"/);
assert.match(page,/import '.\/AttendanceWorkspaceRebuilt.css';/);
assert.ok(page.indexOf("import './AttendanceWorkspaceRebuilt.css';")>page.indexOf("import './AttendanceWorkspace.css';"),'Canonical stylesheet must load last');
for(const token of ['--awu-navy:','--awu-blue:','--awu-teal:','--awu-border:','--awu-elev:','--awu-corner:']){
  assert.ok(css.includes(token),'Missing canonical design token '+token);
}
for(const selector of ['.awu-page-head','.awu-page-head__indicator','.awu-panel-head','.awu-stat-card','.awu-empty','.attendance-quick-layout','.attendance-manage-class-tile','.ahv3__section-title','.att-report-m3__toolbar','.stud-att__intro','.attendance-archive__hero','.bes-attendance-time-settings','.bes-supplemental-dialog']){
  assert.ok(css.includes(selector),'Unstyled shared view or panel '+selector);
}
for(const status of ['is-active.is-present','is-active.is-late','is-active.is-absent']) {
  assert.ok(css.includes(status),'Semantic attendance colors must remain');
}
assert.ok(css.includes('@media(max-width:790px)'),'Mobile must have a dedicated layout');
assert.ok(!/(?:^|\})\s*(?:body|html)\s*\{/m.test(css),'No global resets outside attendance');
assert.ok(!css.includes('@page'),'Printed reports must not inherit the screen dashboard styles');
assert.ok(old.includes('flex-direction:row!important;'),'Mockup-approved horizontal navigation must remain');
assert.ok(!css.includes('KHÔNG GIAN LÀM VIỆC'),'Retired sidebar styles must not return');
assert.ok(old.includes('height:auto!important;'),'Pages must grow to avoid clipped reports');
console.log('PASS: attendance page React components share headers, stats, empty states and one standalone design scale.');
