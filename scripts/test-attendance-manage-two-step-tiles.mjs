import fs from 'node:fs';
import assert from 'node:assert/strict';

const navigation = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const navigationCss = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.css', import.meta.url), 'utf8');
const editor = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassEditor.jsx', import.meta.url), 'utf8');
const editorCss = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassEditor.css', import.meta.url), 'utf8');

assert.match(navigation, /const \[manageDetailOpen,\s*setManageDetailOpen\]\s*=\s*useState\(false\)/,
  'Manage tab must own an explicit overview/detail state.');
assert.match(navigation, /const \[manageClassQuery,\s*setManageClassQuery\]/,
  'Manage overview must have its own class search state.');
assert.match(navigation, /const \[manageTypeFilter,\s*setManageTypeFilter\]/,
  'Manage overview must filter class type independently.');
assert.match(navigation, /const \[manageGradeFilter,\s*setManageGradeFilter\]/,
  'Manage overview must filter grade independently.');
assert.match(navigation, /filteredManageClasses/,
  'Manage overview must derive a filtered class tile collection.');
assert.match(navigation, /attendance-manage-overview/,
  'Manage tab must render a dedicated overview state.');
assert.match(navigation, /attendance-manage-tile-grid/,
  'Overview must render classes as a tile grid.');
assert.match(navigation, /attendance-manage-class-tile/,
  'Each class must render as a dedicated tile.');
assert.match(navigation, /setSelectedClassId\(classRow\.id\)[\s\S]{0,220}setManageDetailOpen\(true\)/,
  'Clicking a class tile must select that class and open the detail state.');
assert.match(navigation, /Quay lại danh sách lớp/,
  'Detail state must expose explicit navigation back to the class grid.');
assert.match(navigation, /setManageDetailOpen\(false\)/,
  'Back navigation must return to overview without closing Attendance.');
assert.match(navigation, /attendance-manage-detail/,
  'Selected class must render in a dedicated full-width detail state.');
assert.doesNotMatch(navigation, /<div className="attendance-management-grid"><aside className="attendance-manage-classes"/,
  'Legacy split-view class list + detail layout must be removed.');

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
]) {
  assert.ok(navigation.includes(token), `Approved tile overview must include ${token}`);
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
  assert.ok(navigationCss.includes(token), `Approved two-step manage CSS must include ${token}`);
}

assert.match(navigationCss, /\.attendance-manage-tile-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s,
  'Desktop overview must use a four-column tile grid like the approved mockup.');
assert.match(navigationCss, /@media[^}]*max-width:\s*1100px[\s\S]*\.attendance-manage-tile-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/,
  'Tablet overview must collapse to two tile columns.');
assert.match(navigationCss, /@media[^}]*max-width:\s*680px[\s\S]*\.attendance-manage-tile-grid\s*\{[^}]*grid-template-columns:\s*1fr/,
  'Mobile overview must collapse to one tile column.');
assert.match(navigationCss, /\.attendance-manage-detail-body\s*\{[^}]*grid-template-columns:/s,
  'Detail state must use a dedicated full-width information/roster grid.');

assert.match(editor, /attendance-class-info-card/, 'Existing class edit behavior must remain in AttendanceClassEditor.');
assert.match(editor, /Sửa thông tin lớp/, 'Class edit action must remain available.');
assert.match(editor, /Sửa học sinh/, 'Student edit action must remain available.');
assert.match(editor, /Xóa khỏi lớp/, 'Student removal action must remain available.');
assert.match(editorCss, /attendance-class-info-grid/, 'Class editor styling must remain available in detail state.');

console.log('Attendance two-step class tile management contract OK');
