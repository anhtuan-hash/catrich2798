import fs from 'node:fs';
import assert from 'node:assert/strict';

const utilityUrl = new URL('../src/utils/attendanceTimeAccess.js', import.meta.url);
const bootstrapUrl = new URL('../src/attendanceTimeAccessBootstrap.js', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20260911_global_attendance_permission.sql', import.meta.url);

const { evaluateAttendanceTimeAccess } = await import(utilityUrl);

const inWindow = new Date('2026-09-11T17:00:00+07:00');
const outsideWindow = new Date('2026-09-11T18:00:00+07:00');
const base = {
  restrictionEnabled: true,
  isAdmin: false,
  hasReportPermission: false,
  hasQuickPermission: true,
  isAssigned: false,
  startTime: '16:45',
  endTime: '17:30',
};

assert.equal(
  evaluateAttendanceTimeAccess({ ...base, now: inWindow }).allowed,
  true,
  'A non-admin with Điểm danh nhanh must be allowed to take attendance for any class; teacher assignment is irrelevant.',
);
assert.equal(
  evaluateAttendanceTimeAccess({ ...base, hasQuickPermission: false, isAssigned: true, now: inWindow }).reason,
  'missing_permission',
  'Being assigned as the class teacher must never grant attendance permission by itself.',
);
assert.equal(
  evaluateAttendanceTimeAccess({ ...base, hasQuickPermission: false, hasReportPermission: true, now: inWindow }).reason,
  'missing_permission',
  'Report permission alone must not grant attendance operation rights.',
);
assert.equal(
  evaluateAttendanceTimeAccess({ ...base, isAdmin: true, hasQuickPermission: false, now: outsideWindow }).allowed,
  true,
  'Admin must always be able to operate attendance.',
);
assert.equal(
  evaluateAttendanceTimeAccess({ ...base, now: outsideWindow }).reason,
  'outside_time',
  'A globally attendance-authorized non-admin must still respect Giờ GV.',
);
assert.equal(
  evaluateAttendanceTimeAccess({ ...base, hasReportPermission: true, now: outsideWindow }).allowed,
  true,
  'Report may bypass Giờ GV only after the account also has global quick-attendance permission.',
);

const bootstrapSource = fs.readFileSync(bootstrapUrl, 'utf8');
assert.doesNotMatch(bootstrapSource, /isAssignedAttendanceTeacher/, 'Time-access UI must not authorize by class-teacher assignment.');
assert.doesNotMatch(bootstrapSource, /matchingTeacherNames/, 'Invigilators must not be forced to impersonate the assigned teacher identity.');
assert.doesNotMatch(bootstrapSource, /teacher_identity_mismatch/, 'Global attendance users must be able to select the actual teacher of any class.');
assert.match(bootstrapSource, /hasQuickPermission\(\)/, 'The UI operation gate must explicitly use the Admin-granted quick-attendance permission.');
assert.match(bootstrapSource, /tất cả lớp/i, 'Attendance status copy must explain the global all-class scope.');
assert.match(bootstrapSource, /const locked = Boolean\(!result\?\.allowed && !result\?\.bypass\)/, 'Missing permission must lock writes even when Giờ GV is disabled.');

assert.ok(fs.existsSync(migrationUrl), 'A forward-only Supabase migration must deploy the new global attendance authorization model.');
const migrationSource = fs.readFileSync(migrationUrl, 'utf8');
assert.match(migrationSource, /create or replace function private\.bes_attendance_access_decision/i, 'Migration must replace the server attendance decision helper.');
assert.match(migrationSource, /public\.can_take_extra_class_attendance\(\)/i, 'Server must keep the Admin-granted quick-attendance permission gate.');
assert.doesNotMatch(migrationSource, /v_is_assigned/i, 'Server authorization must not depend on teacher assignment.');
assert.doesNotMatch(migrationSource, /bes_extra_class_teachers/i, 'Server authorization must not inspect per-class teacher assignment.');
assert.doesNotMatch(migrationSource, /teacher_identity_mismatch/i, 'Server authorization must not bind invigilator identity to selected teacher identity.');
assert.match(
  migrationSource,
  /if not public\.can_take_extra_class_attendance\(\)[\s\S]{0,500}missing_permission[\s\S]{0,1200}if v_has_report/i,
  'Quick-attendance permission must be checked before the optional report time-window bypass.',
);

console.log('Global all-class attendance permission contract OK');
