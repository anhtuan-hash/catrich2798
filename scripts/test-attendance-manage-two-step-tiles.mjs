import fs from 'node:fs';
import assert from 'node:assert/strict';

const navigation = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassManagementWorkspace.jsx', import.meta.url), 'utf8');
const workspaceCss = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassManagementWorkspace.css', import.meta.url), 'utf8');
const detailMockupCssPath = new URL('../src/components/attendance/AttendanceClassManagementDetailMockup.css', import.meta.url);
const detailMockupCss = fs.existsSync(detailMockupCssPath) ? fs.readFileSync(detailMockupCssPath, 'utf8') : '';
const editor = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassEditor.jsx', import.meta.url), 'utf8');
const editorCss = fs.readFileSync(new URL('../src/components/attendance/AttendanceClassEditor.css', import.meta.url), 'utf8');
const searchRemoval = fs.readFileSync(new URL('../public/bes-remove-visible-search-bars.js', import.meta.url), 'utf8');
const detailCss = `${workspaceCss}\n${detailMockupCss}`;

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
assert.match(workspace, /onSelectClass\?\.\(classRow\.id\)[\s\S]{0,320}setManageDetailOpen\(true\)/,
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
  '.attendance-manage-detail-body',
]) {
  assert.ok(detailCss.includes(token), `Approved two-step manage CSS must include ${token}`);
}

assert.match(workspaceCss, /\.attendance-manage-tile-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s,
  'Desktop overview must use a four-column tile grid like the approved mockup.');
assert.match(workspaceCss, /@media[^}]*max-width:\s*1100px[\s\S]*\.attendance-manage-tile-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/,
  'Tablet overview must collapse to two tile columns.');
assert.match(workspaceCss, /@media[^}]*max-width:\s*680px[\s\S]*\.attendance-manage-tile-grid\s*\{[^}]*grid-template-columns:\s*1fr/,
  'Mobile overview must collapse to one tile column.');

assert.match(searchRemoval, /KEEP_SELECTOR[\s\S]{0,240}\.attendance-manage-search/,
  'Global search-removal runtime must explicitly preserve the local class-management search control.');
assert.match(workspaceCss, /\.attendance-manage-class-tile\s*\{[^}]*border-left:\s*5px solid var\(--manage-accent\)/s,
  'Class tiles must have a strong subject-color rail for quick visual grouping.');
const titleRule = workspaceCss.match(/\.attendance-manage-tile__title\s*\{[^}]*\}/s)?.[0] || '';
assert.match(titleRule, /-webkit-line-clamp:\s*2/,
  'Class names must allow two lines instead of clipping to one line.');
assert.match(titleRule, /padding-block:\s*2px/,
  'Class title box must include vertical breathing room to avoid Vietnamese glyph clipping.');
for (const color of ['#2563eb', '#8b5cf6', '#0f8b8d', '#4f46e5', '#e11d48', '#16a34a', '#d97706', '#0891b2']) {
  assert.ok(workspaceCss.includes(color), `Subject palette must include strengthened accent ${color}.`);
}
assert.match(workspaceCss, /\.attendance-manage-tile__type\.is-remedial\s*\{[^}]*border:\s*1px solid #86efac/s,
  'Remedial badge must have a clearly defined green border.');
assert.match(workspaceCss, /\.attendance-manage-tile__type\.is-gifted\s*\{[^}]*border:\s*1px solid #93c5fd/s,
  'Gifted badge must have a clearly defined blue border.');

// Approved detail mockup: hero identity + compact stats/actions + one-line information strip.
for (const token of [
  'attendance-manage-detail-hero__meta',
  'attendance-manage-detail-quick-stats',
  'attendance-manage-detail-quick-stat',
  'Đang hoạt động',
  'attendance-manage-detail-info-strip',
  'attendance-manage-detail-info-item',
  'Môn học',
  'Lịch học',
  'Giáo viên phụ trách',
  'attendance-manage-detail-roster-card',
  'attendance-manage-detail-roster-title',
  'attendance-manage-detail-roster-footer',
  'Hiển thị',
  'MEMBERS_PER_PAGE = 5',
]) {
  assert.ok(workspace.includes(token), `Approved detail mockup must include ${token}`);
}
assert.match(workspace, /className="attendance-manage-detail-actions"[\s\S]{0,1000}Thêm học sinh[\s\S]{0,500}Sửa thông tin lớp[\s\S]{0,500}Thêm giáo viên[\s\S]{0,500}Xóa lớp/,
  'Approved hero must order actions with Add student first, then edit, teacher, and delete.');
assert.match(workspace, /attendance-manage-detail-actions__primary/,
  'Add student must be the single primary hero action.');
assert.match(workspace, /showClassInfo=\{editingClass\}/,
  'Normal detail view must not duplicate the old class-info card; it should appear only while editing.');
assert.match(workspace, /memberTableVariant="mockup"/,
  'Workspace must request the approved mockup member table variant.');
assert.match(workspace, /data-bes-keep-search="true"[\s\S]{0,300}Tìm kiếm học sinh/,
  'Detail student search must opt out of the global search-removal runtime.');

for (const token of [
  '.attendance-manage-detail-quick-stats',
  '.attendance-manage-detail-quick-stat',
  '.attendance-manage-detail-info-strip',
  '.attendance-manage-detail-info-item',
  '.attendance-manage-detail-roster-card',
  '.attendance-manage-detail-roster-footer',
]) {
  assert.ok(detailCss.includes(token), `Approved detail CSS must include ${token}`);
}
assert.match(detailCss, /\.attendance-manage-detail-info-strip\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/s,
  'Desktop detail information strip must contain six equal summary cells.');
assert.match(detailCss, /\.attendance-manage-detail-body\s*\{[^}]*grid-template-columns:\s*1fr/s,
  'Approved detail body must dedicate the full width to the student table.');
assert.match(detailCss, /\.attendance-manage-detail-hero\s*\{[^}]*background:[^;}]*linear-gradient/s,
  'Approved hero must use the soft blue mockup treatment instead of a flat white panel.');

// Approved student table: STT, avatar/name, class, student code, status pill, compact actions/menu.
assert.match(editor, /showClassInfo\s*=\s*true/,
  'AttendanceClassEditor must allow the workspace to hide the duplicate normal class-info card.');
assert.match(editor, /memberTableVariant\s*=\s*['"]default['"]/,
  'AttendanceClassEditor must expose a member-table variant without changing standalone defaults.');
for (const token of [
  'attendance-member-table__index',
  'attendance-member-avatar',
  'Mã HS',
  'attendance-member-status-pill',
  'attendance-member-menu-button',
  'attendance-member-row-menu',
]) {
  assert.ok(editor.includes(token), `Approved student table must include ${token}`);
}
assert.match(editor, />Sửa<\/button>/,
  'Mockup member row must use the compact Sửa action label.');
assert.match(editor, /aria-label=\{`Mở thao tác cho \$\{member\.student_full_name\}`\}/,
  'Ellipsis action must be accessible for each student.');
assert.match(detailCss, /\.attendance-member-table\.is-mockup\s+\.attendance-member-table-head[\s\S]{0,500}grid-template-columns:/,
  'Mockup member table must define its own six-column grid.');
assert.match(detailCss, /\.attendance-member-status-pill\.is-active/,
  'Active student state must render as a green status pill.');
assert.match(detailCss, /\.attendance-member-avatar/,
  'Student rows must render compact initial avatars like the approved mockup.');

assert.match(editor, /attendance-class-info-card/, 'Existing class edit behavior must remain in AttendanceClassEditor.');
assert.match(editor, /showEditButton/, 'Class editor must support the hero-owned edit action without duplicating controls.');
assert.match(editor, /Sửa thông tin lớp/, 'Class edit action must remain available for standalone editor use.');
assert.match(editor, /Xóa khỏi lớp/, 'Student removal action must remain available.');
assert.match(editorCss, /attendance-class-info-grid/, 'Class editor styling must remain available in detail state.');

console.log('Attendance two-step class tile management contract OK');
