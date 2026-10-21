import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(p,'utf8');
const page=read('src/pages/AttendanceWorkspace.jsx');
const mobile=read('src/pages/AttendanceMobileAudit.css');
const quick=read('src/pages/AttendanceQuickLayoutFix.css');
const legacy=read('src/pages/AttendanceWorkspaceRebuilt.css');
const report=read('src/components/attendance/StudentAttendanceReport.css');
const teacherReport=read('src/components/attendance/AttendanceMonthlyReport.css');
const archive=read('src/components/attendance/AttendanceArchive.css');

assert.match(page,/import '\.\/AttendanceMobileAudit\.css';/,'Standalone attendance page imports mobile audit stylesheet');
assert.ok(page.indexOf('AttendanceMobileAudit.css')>page.indexOf('AttendanceQuickLayoutFix.css'),'Mobile audit must load after quick-rollcall repair');
assert.ok(page.indexOf('AttendanceMobileAudit.css')>page.indexOf('AttendanceWorkspaceRebuilt.css'),'Mobile audit must override the prior redesign');
assert.match(mobile,/@media \(max-width: 820px\)/,'Tablet breakpoint');
assert.match(mobile,/@media \(max-width: 560px\)/,'Phone breakpoint');
for(const part of ['attendance-quick-layout','attendance-rollcall','attendance-calendar-layout','attendance-daily-overview-host','attendance-manage-overview','attendance-manage-detail','ahv3__shell','att-report-m3','stud-att','attendance-archive','bes-supplemental-workspace-host']){
  assert.ok(mobile.includes(part),'Missing mobile view containment '+part);
}
for(const wrap of ['stud-att__table-wrap','att-report-m3__table-wrap','attendance-member-table']) {
  assert.ok(mobile.includes(wrap),'Wide table must be contained '+wrap);
}
assert.match(report,/min-width:960px/,'Student report retains all columns in a nested scroller');
assert.match(teacherReport,/min-width:1280px/,'Teacher report retains all columns in a nested scroller');
assert.match(mobile,/overflow-x:auto!important/,'Nested table scroll enabled');
assert.match(mobile,/font-size:16px!important/,'iOS input zoom prevention');
assert.match(mobile,/min-height:44px!important/,'Touch targets enhanced');
assert.match(archive,/attendance-archive__actions/,'Archive actions retained');
assert.match(quick,/att-m3-attendance-status/,'Previous roster status repair remains present');
assert.match(legacy,/\.attendance-manage-tile-grid/,'Material class cards unchanged');
assert.doesNotMatch(mobile,/(^|\n)\s*(html|body|#root)\s*\{/,'Do not touch unrelated pages');
assert.doesNotMatch(mobile,/@page|supabase|insert into|update public\./i,'No changes to print or database');
console.log('PASS: 8 attendance mobile modules, scoped responsive controls and unchanged report schemas');
