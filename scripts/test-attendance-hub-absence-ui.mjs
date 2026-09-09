import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  ATTENDANCE_PERMISSION_IDS,
  ATTENDANCE_PERMISSION_ITEMS,
  ROUTE_PERMISSION_IDS,
  createAllAccessPermissions,
  getAllowedIdsFromPermissions,
  getPermissionItem,
  hasAnyAttendanceAccess,
  hasAttendanceTabAccess,
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
const dailyOverviewCssUrl = new URL('../src/components/attendance/AttendanceDailyOverview.css', import.meta.url);
const dailyOverviewCss = fs.existsSync(dailyOverviewCssUrl) ? fs.readFileSync(dailyOverviewCssUrl, 'utf8') : '';
const dailyScheduleUrl = new URL('../src/components/attendance/AttendanceDailySchedule.jsx', import.meta.url);
const dailySchedule = fs.existsSync(dailyScheduleUrl) ? fs.readFileSync(dailyScheduleUrl, 'utf8') : '';
const legacyDailyOverviewModuleUrl = new URL('../src/attendanceDailyStatusOverview.js', import.meta.url);
const dailyRoomFilterUrl = new URL('../src/utils/attendanceDailyRoomFilter.js', import.meta.url);
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const searchRemovalRuntime = fs.readFileSync(new URL('../public/bes-remove-visible-search-bars.js', import.meta.url), 'utf8');
const permissionMigration = fs.readFileSync(new URL('../supabase/migrations/20260908_admin_grant_attendance_permission.sql', import.meta.url), 'utf8');
const uiSource = `${attendance}\n${utility}`;

assert.equal(ROUTE_PERMISSION_IDS.attendance, 'route:attendance', 'Legacy Attendance route id must remain available during migration');

const teacherWithFullNormalAccess = {
  id: 'teacher-all',
  role: 'teacher',
  permissions: createAllAccessPermissions(),
};
assert.equal(hasAnyAttendanceAccess(teacherWithFullNormalAccess), false,
  'Full teacher access must not implicitly grant attendance');
assert.equal(hasRouteAccess(teacherWithFullNormalAccess, 'attendance'), false,
  'Teacher without an explicit attendance tab grant must not pass the attendance route guard');

const legacyPermissions = normalizePermissions({ mode: 'all', allowed: [ROUTE_PERMISSION_IDS.attendance] });
for (const permissionId of Object.values(ATTENDANCE_PERMISSION_IDS)) {
  assert.equal(legacyPermissions.allowed.includes(permissionId), true, 'Legacy Attendance grant must expand to each granular tab permission');
}
const legacyTeacher = { ...teacherWithFullNormalAccess, permissions: legacyPermissions };
assert.equal(hasAnyAttendanceAccess(legacyTeacher), true);
assert.equal(hasAttendanceTabAccess(legacyTeacher, 'quick'), true);
assert.equal(hasRouteAccess(legacyTeacher, 'attendance'), true);

const admin = { id: 'admin', role: 'admin', permissions: createAllAccessPermissions() };
assert.equal(hasRouteAccess(admin, 'attendance'), true, 'Admin must always retain attendance access');
assert.match(attendance, /hasAttendanceTabAccess/, 'Attendance navigation must enforce granular tab permissions');
assert.match(permissionMigration, /can_manage_extra_class_attendance/, 'Earlier database migration must retain the compatibility gate');
assert.match(permissionMigration, /route:attendance/, 'Earlier database migration must still document the legacy Attendance permission');

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

// Daily schedule must now be rendered directly by React, with no deleted runtime in the boot chain.
assert.equal(fs.existsSync(legacyDailyOverviewModuleUrl), false, 'Deleted daily attendance DOM runtime must stay deleted');
assert.doesNotMatch(indexHtml, /attendanceDailyStatusOverview\.js/, 'Application shell must not load the deleted daily attendance runtime');
assert.ok(dailySchedule, 'Direct React daily attendance schedule must exist');
assert.match(attendance, /import\s+AttendanceDailySchedule\s+from\s+['"]\.\/attendance\/AttendanceDailySchedule\.jsx['"];/, 'Attendance navigation must import the direct daily schedule');
assert.match(attendance, /<AttendanceDailySchedule\b/, 'Attendance calendar branch must render the daily schedule directly');
assert.doesNotMatch(attendance, /\bcalendarMonth\b|\bmonthlySessions\b|\bloadMonthlySessions\b/, 'Attendance navigation must not restore legacy monthly calendar state or loader');
assert.doesNotMatch(dailySchedule, /MutationObserver|querySelector|innerHTML|data-attendance-daily-status-root/, 'Daily schedule must use React rendering instead of DOM mutation');
assert.doesNotMatch(dailySchedule, /Theo lớp/, 'Attendance calendar must no longer expose the class-based mode');
assert.doesNotMatch(dailySchedule, /attendance-calendar-mode-switch/, 'Attendance calendar must no longer render a mode switcher');
assert.doesNotMatch(dailySchedule, /setCalendarMode\s*\(/, 'Attendance calendar must not switch back to the legacy class calendar');
const calendarPermissionItem = ATTENDANCE_PERMISSION_ITEMS.find((item) => item.tab === 'calendar');
assert.equal(calendarPermissionItem?.titleVi, 'Lịch điểm danh', 'Calendar tab source-of-truth must be renamed from Lịch tháng to Lịch điểm danh');
assert.match(attendance, /calendarDate/, 'Direct daily schedule must keep an independently selectable date');
assert.match(attendance, /loadCalendarSessions\(dateValue = calendarDate\)/, 'Attendance navigation must load attendance sessions for the selected day');
assert.match(attendance, /\.eq\(['"]attendance_date['"],\s*dateValue\)/, 'Daily session loader must query by the selected attendance date');
assert.match(dailySchedule, /isExtraClassScheduledOnDate\(classRow, date\)/, 'Daily schedule must derive scheduled classes from the official class schedule');
assert.match(dailySchedule, /sessionsByClass/, 'Daily schedule must match attendance sessions back to scheduled classes');
for (const label of ['Có lịch', 'Đã điểm danh', 'Chưa điểm danh', 'Đã hủy']) {
  assert.match(dailySchedule, new RegExp(label), `Daily schedule must render the status label “${label}”`);
}
assert.match(attendance, /setView\(['"]quick['"]\)/, 'A missing attendance row must be able to jump to quick attendance');
assert.match(attendance, /openSessionFromCalendar\(session\)/, 'A completed or cancelled row must open the existing attendance session');
assert.match(attendance, /setAttendanceDate\(calendarDate\)/, 'Jumping from the daily schedule must preserve the selected date');
assert.match(attendance, /setSelectedClassId\(String\(classRow\.id\)\)/, 'Jumping from the daily schedule must preserve the selected class');
assert.ok(dailyOverviewCss, 'Daily attendance overview stylesheet must exist');
assert.match(dailyOverviewCss, /attendance-daily-overview/i, 'Daily overview must have dedicated responsive styling');

// Daily room filter: options must be unique and follow the approved floor-by-floor physical route.
assert.ok(fs.existsSync(dailyRoomFilterUrl), 'Daily attendance must have a dedicated room-filter helper.');
const {
  ATTENDANCE_ROOM_ROUTE,
  sortAttendanceRoomLabels,
  matchesAttendanceRoomFilter,
} = await import(dailyRoomFilterUrl.href);
assert.deepEqual(
  ATTENDANCE_ROOM_ROUTE,
  [
    'A103', 'A104', 'A106',
    'A201', 'A202', 'A204', 'A206', 'B201', 'B203', 'B205', 'B206',
    'A301', 'A302', 'A303', 'A304', 'A305', 'A306',
    'A401', 'A402', 'A404', 'A405', 'A406',
  ],
  'Room route must match the school-approved floor-by-floor attendance path.',
);
assert.deepEqual(
  sortAttendanceRoomLabels(['A.406', 'B.203', 'A206', 'A201', 'B.201', 'A202', ' A201 ', '', 'a202']),
  ['A201', 'A202', 'A206', 'B.201', 'B.203', 'A.406'],
  'Room options must be trimmed, de-duplicated case-insensitively, and follow the physical route while preserving labels.',
);
assert.equal(matchesAttendanceRoomFilter('A.406', 'all'), true, 'All rooms must pass the default filter.');
assert.equal(matchesAttendanceRoomFilter('A.406', 'A.406'), true, 'The selected room must remain visible.');
assert.equal(matchesAttendanceRoomFilter('A201', 'A.406'), false, 'Other rooms must be hidden.');
assert.match(dailySchedule, /attendance-calendar-room-filter/, 'Daily mode must render a dedicated visible room filter.');
assert.match(dailySchedule, /Tất cả phòng/, 'Room filter must include an option to clear the filter.');
assert.match(dailySchedule, /roomFilter/, 'Daily schedule must receive and preserve the selected room filter state.');
assert.match(dailySchedule, /matchesAttendanceRoomFilter/, 'Daily rows must be filtered by the selected displayed room.');
assert.match(dailySchedule, /sortAttendanceRowsByRoomRoute/, 'Daily rows must follow the approved physical room route.');
assert.match(dailyOverviewCss, /attendance-calendar-room-filter/i, 'Daily room filter must have responsive styling.');

// Keep utility permission helpers exercised so accidental export regressions are caught.
assert.equal(typeof getAllowedIdsFromPermissions, 'function');
assert.equal(typeof getPermissionItem, 'function');
assert.equal(typeof hasExplicitPermissionId, 'function');
assert.equal(typeof hasPermissionId, 'function');

console.log('Attendance class hub, permissions, absence UI, direct daily schedule and floor room route contract OK');
