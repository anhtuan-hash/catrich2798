import fs from 'node:fs';
import assert from 'node:assert/strict';

const permissionUrl = new URL('../src/utils/permissions.js', import.meta.url);
const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const workspaceUrl = new URL('../src/components/attendance/AttendanceClassManagementWorkspace.jsx', import.meta.url);
const classEditorUrl = new URL('../src/components/attendance/AttendanceClassEditor.jsx', import.meta.url);
const adminUrl = new URL('../src/pages/AdminPage.jsx', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260908_granular_attendance_tab_permissions.sql', import.meta.url);
const classDetailsMigrationUrl = new URL('../supabase/migrations/20260909_attendance_manage_class_details_permission.sql', import.meta.url);

const permissionSource = fs.readFileSync(permissionUrl, 'utf8');
const attendanceSource = fs.readFileSync(attendanceUrl, 'utf8');
const workspaceSource = fs.readFileSync(workspaceUrl, 'utf8');
const classEditorSource = fs.readFileSync(classEditorUrl, 'utf8');
const adminSource = fs.readFileSync(adminUrl, 'utf8');

assert.match(permissionSource, /export const ATTENDANCE_PERMISSION_IDS\s*=\s*\{/, 'Attendance must expose five dedicated tab permission ids');
assert.ok(fs.existsSync(migrationUrl), 'Granular attendance permissions must include a Supabase migration');

const permissions = await import(permissionUrl);
const {
  ATTENDANCE_PERMISSION_IDS,
  ATTENDANCE_PERMISSION_GROUP,
  ATTENDANCE_PERMISSION_ITEMS,
  ROUTE_PERMISSION_IDS,
  createAllAccessPermissions,
  createCustomPermissions,
  getFirstAllowedAttendanceTab,
  hasAnyAttendanceAccess,
  hasAttendanceTabAccess,
  hasRouteAccess,
  normalizePermissions,
} = permissions;

const expectedIds = {
  quick: 'attendance:quick',
  calendar: 'attendance:calendar',
  manage: 'attendance:manage',
  history: 'attendance:history',
  report: 'attendance:report',
};
assert.deepEqual(ATTENDANCE_PERMISSION_IDS, expectedIds);
assert.deepEqual(ATTENDANCE_PERMISSION_GROUP.ids, Object.values(expectedIds), 'Admin attendance group must contain exactly the five tab permissions');
assert.deepEqual(ATTENDANCE_PERMISSION_ITEMS.map((item) => item.titleVi), ['Điểm danh nhanh', 'Lịch điểm danh', 'Quản lý lớp', 'Lịch sử', 'Báo cáo']);

const teacherAll = { id: 'teacher-all', role: 'teacher', permissions: createAllAccessPermissions() };
for (const tab of Object.keys(expectedIds)) {
  assert.equal(hasAttendanceTabAccess(teacherAll, tab), false, `Full teacher mode must not implicitly grant ${tab}`);
}
assert.equal(hasAnyAttendanceAccess(teacherAll), false);
assert.equal(hasRouteAccess(teacherAll, 'attendance'), false);

const quickOnly = {
  id: 'teacher-quick',
  role: 'teacher',
  permissions: createAllAccessPermissions([ATTENDANCE_PERMISSION_IDS.quick]),
};
assert.equal(hasAttendanceTabAccess(quickOnly, 'quick'), true);
assert.equal(hasAttendanceTabAccess(quickOnly, 'calendar'), false);
assert.equal(hasAnyAttendanceAccess(quickOnly), true);
assert.equal(hasRouteAccess(quickOnly, 'attendance'), true);
assert.equal(getFirstAllowedAttendanceTab(quickOnly), 'quick');

const reportOnly = {
  id: 'teacher-report',
  role: 'teacher',
  permissions: createCustomPermissions([ATTENDANCE_PERMISSION_IDS.report]),
};
assert.equal(hasAttendanceTabAccess(reportOnly, 'report'), true);
assert.equal(hasAttendanceTabAccess(reportOnly, 'history'), false);
assert.equal(getFirstAllowedAttendanceTab(reportOnly), 'report');

const manageOnly = {
  id: 'teacher-manage',
  role: 'teacher',
  permissions: createCustomPermissions([ATTENDANCE_PERMISSION_IDS.manage]),
};
assert.equal(hasAttendanceTabAccess(manageOnly, 'manage'), true);
assert.equal(hasAttendanceTabAccess(manageOnly, 'quick'), false);
assert.equal(getFirstAllowedAttendanceTab(manageOnly), 'manage');

const legacy = normalizePermissions({ mode: 'all', allowed: [ROUTE_PERMISSION_IDS.attendance] });
assert.deepEqual([...legacy.allowed].sort(), Object.values(expectedIds).sort(), 'Legacy route:attendance grants must expand to all five tabs');

const admin = { id: 'admin', role: 'admin', permissions: createAllAccessPermissions() };
for (const tab of Object.keys(expectedIds)) assert.equal(hasAttendanceTabAccess(admin, tab), true, `Admin must always access ${tab}`);
assert.equal(getFirstAllowedAttendanceTab(admin), 'quick');

assert.match(attendanceSource, /hasAttendanceTabAccess/, 'Attendance UI must gate individual tabs');
assert.match(attendanceSource, /getFirstAllowedAttendanceTab/, 'Attendance UI must open the first allowed tab');
assert.match(attendanceSource, /ATTENDANCE_PERMISSION_ITEMS/, 'Attendance navigation must be built from the permission-backed tab list');
assert.match(attendanceSource, /canManageMembers=\{canAccessAttendanceView\('manage'\)\}/, 'Class-management workspace must receive attendance:manage access, not an admin-only flag');
assert.match(adminSource, /ATTENDANCE_PERMISSION_GROUP/, 'Admin permission editor must expose the dedicated attendance permission group');
assert.match(adminSource, /permission-explicit-groups/, 'Attendance permissions must remain editable even in full teacher mode');

assert.match(classEditorSource, /if \(!canManageMembers \|\| !selectedClass \|\| !client \|\| locked\) return;/, 'Saving class details must require attendance:manage, not Admin role');
assert.match(workspaceSource, /onClick=\{\(\) => setEditingClass\(true\)\}[\s\S]{0,120}Sửa thông tin lớp/, 'Teachers with attendance:manage must see the workspace-owned Sửa thông tin lớp action');
assert.match(workspaceSource, /canManageMembers=\{canManageMembers\}/, 'Two-step workspace must pass attendance:manage through to the class editor');
assert.match(classEditorSource, /showEditButton && canManageMembers && !editingClass/, 'Reusable class editor edit control must remain guarded by attendance:manage when shown');
assert.match(classEditorSource, /\{editingClass && canManageMembers \? \(/, 'Teachers with attendance:manage must use the class edit form');
assert.doesNotMatch(workspaceSource, /isAdmin\s*&&[\s\S]{0,220}Sửa thông tin lớp/, 'Workspace class edit action must not be hard-coded to Admin');
assert.doesNotMatch(classEditorSource, /if \(!isAdmin \|\| !selectedClass/, 'Class detail save must not remain Admin-only');

const migrationSource = fs.readFileSync(migrationUrl, 'utf8');
for (const id of ['route:attendance', ...Object.values(expectedIds)]) assert.match(migrationSource, new RegExp(id.replace(':', '\\:')), `Migration must contain ${id}`);
assert.match(migrationSource, /can_read_extra_class_attendance/, 'Migration must provide a shared read gate');
assert.match(migrationSource, /can_take_extra_class_attendance/, 'Migration must provide a quick-attendance write gate');
assert.match(migrationSource, /can_manage_extra_class_roster/, 'Migration must provide a class-management write gate');
assert.match(migrationSource, /bes_confirm_extra_class_attendance[\s\S]*can_take_extra_class_attendance/, 'Confirm attendance RPC must require quick-attendance permission');
assert.match(migrationSource, /bes_cancel_extra_class_session[\s\S]*can_take_extra_class_attendance/, 'Cancel attendance RPC must require quick-attendance permission');
assert.match(migrationSource, /bes_delete_extra_attendance_session[\s\S]*can_take_extra_class_attendance/, 'Delete attendance session RPC must require quick-attendance permission');
assert.match(migrationSource, /bes_add_extra_class_teacher[\s\S]*can_manage_extra_class_roster/, 'Add teacher RPC must require class-management permission');
assert.match(migrationSource, /bes_create_extra_class_with_teachers[\s\S]*can_manage_extra_class_roster/, 'Create class RPC must require class-management permission');
assert.match(migrationSource, /bes_delete_extra_class[\s\S]*can_manage_extra_class_roster/, 'Delete class RPC must require class-management permission');

assert.ok(fs.existsSync(classDetailsMigrationUrl), 'Class-detail update permission must include a Supabase migration');
const classDetailsMigrationSource = fs.readFileSync(classDetailsMigrationUrl, 'utf8');
assert.match(classDetailsMigrationSource, /bes_admin_update_extra_class/, 'Follow-up migration must update the existing class-details RPC');
assert.match(classDetailsMigrationSource, /can_manage_extra_class_roster\(\)/, 'Class-details RPC must use the attendance:manage backend gate');
assert.match(classDetailsMigrationSource, /revoke all on function public\.bes_admin_update_extra_class/, 'Class-details RPC must remain unavailable to anonymous callers');
assert.match(classDetailsMigrationSource, /grant execute on function public\.bes_admin_update_extra_class/, 'Authenticated callers must reach the RPC and be gated inside it');

console.log('Granular attendance tab permissions contract OK');
