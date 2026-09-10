import fs from 'node:fs';
import assert from 'node:assert/strict';

const navigation = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassManagementWorkspace.jsx', import.meta.url), 'utf8');
const workspaceCss = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassManagementWorkspace.css', import.meta.url), 'utf8');
const editor = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassEditor.jsx', import.meta.url), 'utf8');
const editorCss = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassEditor.css', import.meta.url), 'utf8');
const searchRemoval = fs.readFileSync(new URL('../public/bes-remove-visible-search-bars.js', import.meta.url), 'utf8');

assert.match(navigation, /import AttendanceClassManagementWorkspace from ['"]\.\/attendance\/AttendanceClassManagementWorkspace\.jsx['"];/,
  'Global attendance source must import the direct React class-management workspace.');
assert.match(navigation, /<AttendanceClassManagementWorkspace\b/,
  'Manage branch must render the new workspace directly.');
assert.doesNotMatch(navigation, /<div className="attendance-management-grid"><aside className="attendance-manage-classes"/,
  'Legacy split-view class list + detail layout must be removed from the original component.');
assert.doesNotMatch(workspace, /MutationObserver|querySelector|innerHTML/,
  'Two-step class management must remain direct React, not a DOM runtime overlay.');

assert.match(workspace, /const \[manageDetailOpen,\s*setManageDetailOpen\]\s*=\s*useState\(false\)/,
  'Manage workspace must own an explicit overview/detail state.');
assert.match(workspace, /const \[manageClassQuery,\s*setManageClassQuery\]/,
  'Manage overview must have its own class search state.');
assert.match(workspace, /const \[manageTypeFilter,\s*setManageTypeFilter\]/,
  'Manage overview must filter class type independently.');
assert.match(workspace, /const \[manageGradeFilter,\s*setManageGradeFilter\]/,
  'Manage overview must filter grade independently.');
assert.match(workspace, /filteredManageClasses/,
  'Manage overview must derive a filtered class tile collection.');
assert.match(workspace, /attendance-manage-overview/,
  'Manage tab must render a dedicated overview state.');
assert.match(workspace, /attendance-manage-tile-grid/,
  'Overview must render classes as a tile grid.');
assert.match(workspace, /attendance-manage-class-tile/,
  'Each class must render as a dedicated tile.');
assert.match(workspace, /onSelectClass\?\.\(classRow\.id\)[\s\S]{0,260}setManageDetailOpen\(true\)/,
  'Clicking a class tile must select that class and open the detail state.');
assert.match(workspace, /Quay lại danh sách lớp/,
  'Detail state must expose explicit navigation back to the class grid.');
assert.match(workspace, /setManageDetailOpen\(false\)/,
  'Back navigation must return to overview without closing Attendance.');
assert.match(workspace, /attendance-manage-detail/,
  'Selected class must render in a dedicated full-width detail state.');

for (const token of [
  'Tìm kiếm tên lớp, môn học, giáo viên',
  'Phụ đạo',
  'Bồi dưỡng',
  'Khối 10',
  'Khối 11',
  'Khối 12',
  'attendance-manage-tile__room',
  'attendance-manage-tile__weekday',
  'attendance-manage-tile__time',
  'attendance-manage-tile__students',
  'attendance-manage-tile__teacher',
  'Sửa thông tin lớp',
  'Thêm học sinh',
  'Thêm giáo viên',
  'Xóa lớp',
  'Xuất danh sách',
]) {
  assert.ok(workspace.includes(token), `Approved two-step workspace must include ${token}`);
}

for (const token of [
  '.attendance-manage-overview',
  '.attendance-manage-overview-toolbar',
  '.attendance-manage-filter-chips',
  '.attendance-manage-tile-grid',
  '.attendance-manage-class-tile',
  '.attendance-manage-detail',
  '.attendance-manage-detail-back',
  '.attendance-manage-detail-hero',
  '.attendance-manage-detail-stats',
  '.attendance-manage-detail-body',
]) {
  assert.ok(workspaceCss.includes(token), `Approved two-step manage CSS must include ${token}`);
}

assert.match(workspaceCss, /\.attendance-manage-tile-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s,
  'Desktop overview must use a four-column tile grid like the approved mockup.');
assert.match(workspaceCss, /@media[^}]*max-width:\s*1100px[\s\S]*\.attendance-manage-tile-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/,
  'Tablet overview must collapse to two tile columns.');
assert.match(workspaceCss, /@media[^}]*max-width:\s*680px[\s\S]*\.attendance-manage-tile-grid\s*\{[^}]*grid-template-columns:\s*1fr/,
  'Mobile overview must collapse to one tile column.');
assert.match(workspaceCss, /\.attendance-manage-detail-body\s*\{[^}]*grid-template-columns:/s,
  'Detail state must use a dedicated full-width information/roster grid.');

assert.match(searchRemoval, /data-bes-keep-search="true"/,
  'Global search-removal runtime must preserve explicitly opted-in local search controls.');
assert.match(workspace, /<label className="attendance-manage-search" data-bes-keep-search="true">/,
  'Class-management search must opt out of the global persistent-search removal runtime.');
assert.match(workspaceCss, /\.attendance-manage-class-tile\s*\{[^}]*border-left:\s*5px solid var\(--manage-accent\)/s,
  'Class tiles must have a strong subject-color rail for quick visual grouping.');
assert.match(workspaceCss, /\.attendance-manage-tile__title\s*\{[^}]*-webkit-line-clamp:\s*2[^}]*padding-block:\s*2px/s,
  'Class names must have a two-line readable title box with vertical breathing room to avoid glyph clipping.');
for (const color of ['#2563eb', '#8b5cf6', '#0f8b8d', '#4f46e5', '#e11d48', '#16a34a', '#d97706', '#0891b2']) {
  assert.ok(workspaceCss.includes(color), `Subject palette must include strengthened accent ${color}.`);
}
assert.match(workspaceCss, /\.attendance-manage-tile__type\.is-remedial\s*\{[^}]*border:\s*1px solid #86efac/s,
  'Remedial badge must have a clearly defined green border.');
assert.match(workspaceCss, /\.attendance-manage-tile__type\.is-gifted\s*\{[^}]*border:\s*1px solid #93c5fd/s,
  'Gifted badge must have a clearly defined blue border.');

assert.match(editor, /attendance-class-info-card/, 'Existing class edit behavior must remain in AttendanceClassEditor.');
assert.match(editor, /showEditButton/, 'Class editor must support the hero-owned edit action without duplicating controls.');
assert.match(editor, /Sửa thông tin lớp/, 'Class edit action must remain available for standalone editor use.');
assert.match(editor, /Sửa học sinh/, 'Student edit action must remain available.');
assert.match(editor, /Xóa khỏi lớp/, 'Student removal action must remain available.');
assert.match(editorCss, /attendance-class-info-grid/, 'Class editor styling must remain available in detail state.');

console.log('Attendance two-step class tile management contract OK');
