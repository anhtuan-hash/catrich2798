import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const entry=readFileSync('src/components/GlobalAttendanceNavigationTab.jsx','utf8');
const css=readFileSync('src/components/attendance/AttendanceUnifiedDesign.css','utf8');
const base=readFileSync('src/components/attendance/AttendanceTypography.css','utf8');
const tabs=[
  '.attendance-quick-layout','.attendance-daily-overview__metric',
  '.attendance-manage-detail-hero','.ahv3__list',
  '.bes-supplemental-dialog','.att-report-m3__toolbar',
  '.stud-att__intro','.attendance-archive__hero','.bes-attendance-time-settings'
];
for(const selector of tabs)assert.ok(css.includes(selector),'Missing UI surface: '+selector);
for(const token of ['--att-ui-primary','--att-ui-accent','--att-ui-border','--att-ui-radius','--att-ui-shadow'])assert.ok(css.includes(token+':'),'Missing shared token: '+token);
assert.ok(entry.indexOf("AttendanceUnifiedDesign.css")>entry.indexOf("AttendanceTypographyViews.css"),'Common theme must load after typography');
assert.ok(css.includes('.attendance-shell')&&css.includes('.bes-supplemental-dialog'),'Global and supplemental attendance scopes must be present');
assert.ok(css.includes('is-active.is-present')&&css.includes('is-active.is-late')&&css.includes('is-active.is-absent'),'Attendance status colors must remain distinct');
assert.ok(!css.includes('.bes-supplemental-status-buttons button.is-active'),'Supplemental status buttons must keep semantic colors');
assert.ok(!css.includes('@page')&&!css.includes('font-family:'),'Do not affect PDF font families or paper layout');
assert.ok(!css.includes('body{')&&!css.includes('html{'),'No cross-app global HTML resets');
assert.ok(!css.includes('overflow:hidden!important'),'Never globally disable scrolling');
assert.ok(base.includes('--att-type-body'),'Existing shared type scale retained');
console.log('Unified attendance UI design covers all seven views and preserves semantic/status behavior.');
