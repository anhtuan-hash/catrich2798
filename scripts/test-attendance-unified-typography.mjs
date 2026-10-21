import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const entry=readFileSync('src/components/GlobalAttendanceNavigationTab.jsx','utf8');
const core=readFileSync('src/components/attendance/AttendanceTypography.css','utf8');
const views=readFileSync('src/components/attendance/AttendanceTypographyViews.css','utf8');
assert.match(entry,/import '.\/attendance\/AttendanceTypography.css';/);
assert.match(entry,/import '.\/attendance\/AttendanceTypographyViews.css';/);
assert.ok(entry.indexOf('AttendanceTypographyViews.css')>entry.indexOf('AttendanceHistoryV2.css'));
const sizes={'--att-type-meta':'11px','--att-type-label':'12px','--att-type-body':'13px','--att-type-control':'13px','--att-type-section':'16px','--att-type-title':'21px','--att-type-metric':'26px'};
for(const [key,value] of Object.entries(sizes)){
  assert.ok(core.includes(key+':'+value), 'Missing desktop token '+key);
}
assert.match(core,/@media\(max-width:760px\)/);
assert.match(core,/font-size:16px!important;/,'iPhone native control auto-zoom protection');
for(const feature of [
  'attendance-class-list','attendance-roster',
  'attendance-manage-result-count','ahv3__shell',
  'attendance-daily-overview','att-report-m3',
  'stud-att','attendance-archive','bes-supplemental-dialog',
]) assert.ok(core.includes(feature)||views.includes(feature),'Missing feature '+feature);
assert.ok(!core.includes('@page')&&!views.includes('@page'),'PDF/print type must be unchanged');
assert.ok(!core.includes('font-family:')&&!views.includes('font-family:'),'Keep user-chosen font families');
assert.ok(!core.includes('document.body')&&!views.includes('document.body'),'No global document selectors');
console.log('Attendance shared typography contract passed.');
