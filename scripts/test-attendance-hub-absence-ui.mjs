import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  ROUTE_PERMISSION_IDS,
  createAllAccessPermissions,
  getAllowedIdsFromPermissions,
  getPermissionItem,
  hasExplicitPermissionId,
  hasPermissionId,
  hasRouteAccess,
  normalizePermissions,
} from '../src/utils/permissions.js';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const utility = fs.readFileSync(new URL('../src/utils/extraClassAttendance.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url), 'utf8');
const polishUrl = new URL('../public/attendance-ui-polish.css', import.meta.url);
const polishCss = fs.existsSync(polishUrl) ? fs.readFileSync(polishUrl, 'utf8') : '';
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const searchRemovalRuntime = fs.readFileSync(new URL('../public/bes-remove-visible-search-bars.js', import.meta.url), 'utf8');
const permissionMigration = fs.readFileSync(new URL('../supabase/migrations/20260908_admin_grant_attendance_permission.sql', import.meta.url), 'utf8');
const uiSource = `${attendance}\n${utility}`;

assert.equal(ROUTE_PERMISSION_IDS.attendance, 'route:attendance', 'Attendance must have a dedicated route permission id');

const teacherWithFullNormalAccess = {
  id: 'teacher-all',
  role: 'teacher',
  permissions: createAllAccessPermissions(),
};
assert.equal(hasExplicitPermissionId(teacherWithFullNormalAccess, ROUTE_PERMISSION_IDS.attendance), false,
  'Full teacher access must not implicitly grant attendance');
assert.equal(hasPermissionId(teacherWithFullNormalAccess, ROUTE_PERMISSION_IDS.attendance), false,
  'Attendance must stay explicit even in all mode');
assert.equal(hasRouteAccess(teacherWithFullNormalAccess, 'attendance'), false,
  'Teacher without the explicit grant must not pass the attendance route guard');

const grantedAllPermissions = normalizePermissions({
  mode: 'all',
  allowed: [ROUTE_PERMISSION_IDS.attendance],
});
assert.deepEqual(grantedAllPermissions.allowed, [ROUTE_PERMISSION_IDS.attendance],
  'Normalizing all-mode permissions must preserve the explicit attendance grant');
assert.equal(getAllowedIdsFromPermissions(grantedAllPermissions).includes(ROUTE_PERMISSION_IDS.attendance), true,
  'Effective permission ids must include attendance after an explicit grant');

const grantedTeacher = {
  ...teacherWithFullNormalAccess,
  permissions: grantedAllPermissions,
};
assert.equal(hasExplicitPermissionId(grantedTeacher, ROUTE_PERMISSION_IDS.attendance), true);
assert.equal(hasPermissionId(grantedTeacher, ROUTE_PERMISSION_IDS.attendance), true);
assert.equal(hasRouteAccess(grantedTeacher, 'attendance'), true,
  'Teacher with the explicit attendance grant must pass the route guard');

const admin = {
  id: 'admin',
  role: 'admin',
  permissions: createAllAccessPermissions(),
};
assert.equal(hasRouteAccess(admin, 'attendance'), true, 'Admin must always retain attendance access');
assert.match(attendance, /ROUTE_PERMISSION_IDS\.attendance/, 'Attendance navigation must use the attendance permission id');
assert.match(attendance, /hasExplicitPermissionId/, 'Attendance navigation must enforce the explicit permission grant');
const attendancePermissionItem = getPermissionItem(ROUTE_PERMISSION_IDS.attendance);
assert.equal(attendancePermissionItem?.titleVi, 'Điểm danh', 'Admin permission editor data must expose the attendance permission label');
assert.match(attendancePermissionItem?.descVi || '', /quản trị viên cấp riêng/i, 'Attendance grant must be described as an explicit admin permission');
assert.match(permissionMigration, /can_manage_extra_class_attendance/, 'Database migration must update the shared attendance RLS gate');
assert.match(permissionMigration, /route:attendance/, 'Database attendance gate must honor the explicit attendance permission');

assert.match(attendance, /Tìm nhanh lớp/i, 'Quick attendance must provide a fast class search');
assert.match(attendance, /ATTENDANCE_SUBJECT_HUB/, 'Quick attendance must render the shared subject hub');
for (const label of ['Tất cả', 'Toán', 'Toán/Casio', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí']) {
  assert.match(uiSource, new RegExp(label), `Subject hub must include ${label}`);
}

assert.match(searchRemovalRuntime, /\[data-bes-keep-search=["']true["']\]/, 'Global visible-search remover must keep explicitly approved search surfaces');
assert.match(
  attendance,
  /className=["']att-m3-class-discovery["']\s+data-bes-keep-search=["']true["']|data-bes-keep-search=["']true["']\s+className=["']att-m3-class-discovery["']/,
  'Attendance class discovery must opt out of the global visible-search remover so search and subject filters stay visible at runtime',
);
assert.ok(polishCss, 'Dedicated attendance UI polish stylesheet must exist');
assert.match(indexHtml, /attendance-ui-polish\.css/i, 'Attendance UI polish stylesheet must be loaded by the application shell');
assert.match(
  polishCss,
  /\.attendance-shell\s+\.attendance-class-list\s*\{[^}]*grid-template-rows\s*:\s*auto\s+auto\s+minmax\(0\s*,\s*1fr\)/i,
  'Attendance class list must reserve separate rows for header, discovery controls, and scrollable class results',
);
assert.match(
  polishCss,
  /\.attendance-shell\s+\.att-m3-class-discovery\s*\{[^}]*(?:min-height\s*:\s*[1-9]\d*px|flex-shrink\s*:\s*0)/i,
  'Attendance class discovery must not collapse between the header and class results',
);
assert.match(polishCss, /\.attendance-shell\s+\.att-m3-class-search\s+input\s*\{[^}]*width\s*:\s*100%/i,
  'Attendance class search input must render full width inside the discovery surface');

assert.match(attendance, /ABSENCE_REASON_OPTIONS/, 'Absent rows must render the shared absence reason options');
for (const label of ['Có phép', 'Không phép', 'Ốm', 'Việc gia đình', 'Khác']) {
  assert.match(uiSource, new RegExp(label), `Absence reason UI must include ${label}`);
}
assert.match(attendance, /Phòng học/);
assert.match(attendance, /Thời gian dạy/);
assert.match(attendance, /p_absence_details/);
assert.match(attendance, /p_teaching_room/);
assert.match(attendance, /p_teaching_time_range/);
assert.match(attendance, /absence_reason_code/);
assert.match(attendance, /absence_note/);
assert.match(utility, /ABSENCE_REASON_OPTIONS/);
assert.match(utility, /attendanceSubjectKey/);
assert.match(utility, /absence_reason_code:\s*''/);
assert.match(utility, /absence_note:\s*''/);
for (const token of ['is-subject-math', 'is-subject-casio', 'is-subject-literature', 'is-subject-english', 'is-subject-physics', 'is-subject-chemistry', 'is-subject-biology', 'is-subject-history', 'is-subject-geography']) {
  assert.match(css, new RegExp(token), `Material 3 CSS must define ${token}`);
}

console.log('Attendance class hub, explicit access permission, database gate, visible discovery, subject colors, room/time and absence UI contract OK');
