import fs from 'node:fs';
import assert from 'node:assert/strict';

const component = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const cssPath = new URL('../src/components/attendance/AttendanceHistoryV3.css', import.meta.url);

assert.ok(fs.existsSync(cssPath), 'Attendance History V3 must use a new isolated stylesheet instead of layering more V2 overrides');
const css = fs.readFileSync(cssPath, 'utf8');

assert.match(component, /import ['"]\.\/attendance\/AttendanceHistoryV3\.css['"];/, 'History V3 stylesheet must be imported');
assert.doesNotMatch(component, /import ['"]\.\/attendance\/AttendanceHistoryV2\.css['"];/, 'History V2 stylesheet must no longer be imported by the attendance component');
assert.match(component, /className="ahv3"/, 'History root must use the clean V3 namespace');

for (const className of [
  'ahv3__sidebar',
  'ahv3__sidebar-head',
  'ahv3__search',
  'ahv3__filter',
  'ahv3__session-list',
  'ahv3__session',
  'ahv3__detail',
  'ahv3__hero',
  'ahv3__info-grid',
  'ahv3__summary',
  'ahv3__audit',
  'ahv3__proof',
  'ahv3__late',
  'ahv3__absent',
  'ahv3__footer',
]) assert.ok(component.includes(className), `History markup must expose ${className}`);

for (const legacyClass of [
  'attendance-history-search',
  'attendance-history-filters',
  'attendance-history-stat-grid',
  'attendance-history-info-grid',
  'attendance-history-proof',
  'attendance-history-footer-grid',
]) assert.doesNotMatch(component, new RegExp(`className=["'][^"']*\\b${legacyClass}\\b`), `V3 must not reuse legacy layout class ${legacyClass}`);

assert.match(css, /\.ahv3__search\s*\{[^}]*display:\s*flex/s, 'V3 search must be visible');
assert.match(css, /\.ahv3__sidebar-head\s*\{[^}]*display:\s*grid/s, 'Sidebar header must use a compact explicit layout');
assert.match(css, /\.ahv3__filter\s*\{[^}]*margin-top:\s*8px/s, 'Filter must sit directly under search');
assert.match(css, /\.ahv3__summary\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s, 'Desktop summary must keep all five cards on one row');
assert.doesNotMatch(css, /@media\s*\(max-width:\s*1180px\)[\s\S]*?\.ahv3__summary\s*\{[^}]*grid-template-columns:\s*repeat\([234],/s, 'V3 must not prematurely collapse the summary into an orphan-card layout');
assert.match(css, /\.ahv3__audit-proof\s*\{[^}]*grid-template-columns:\s*1fr/s, 'Audit and proof must stack instead of creating a blank side-by-side column');
assert.match(css, /\.ahv3__proof-image img\s*\{[^}]*max-height:\s*190px/s, 'Proof image must remain compact');
assert.match(css, /@media\s*\(max-width:\s*900px\)/, 'History V3 must have a narrow-screen fallback');
assert.doesNotMatch(css, /(^|\n)\s*(html|body|:root)\s*\{/m, 'History V3 must not alter global page styles');

for (const iconName of ['teacher', 'book', 'calendar', 'clock', 'room', 'periods', 'people', 'check', 'late', 'absent', 'camera']) {
  assert.match(component, new RegExp(`<Icon name=["']${iconName}["']`), `V3 must render the ${iconName} SVG icon`);
}

assert.match(component, /selectedSession\.present_count[\s\S]*?Có mặt[\s\S]*?Đã gồm học sinh đi trễ/, 'Present summary must continue to include tardy students');
assert.match(component, /selectedLateRecords\.length[\s\S]*?Đi trễ[\s\S]*?Vẫn tính có mặt/, 'V3 must keep a dedicated tardy metric');

console.log('Attendance history V3 isolated-layout contract OK');
