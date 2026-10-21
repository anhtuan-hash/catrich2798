import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ATTENDANCE_READ_ONLY_PERMISSION_IDS,
  withAttendanceReadOnlyAccess,
} from '../src/utils/attendanceReadonlyAccess.js';

const [calendarPermission, historyPermission] = ATTENDANCE_READ_ONLY_PERMISSION_IDS;
assert.equal(calendarPermission, 'attendance:calendar');
assert.equal(historyPermission, 'attendance:history');

assert.equal(withAttendanceReadOnlyAccess(null), null, 'logged-out users must not receive Attendance access');

const anonymousProfile = { role: 'teacher', permissions: { mode: 'all', allowed: [] } };
assert.equal(
  withAttendanceReadOnlyAccess(anonymousProfile),
  anonymousProfile,
  'a profile without an authenticated user id must remain unchanged',
);

const regularUser = {
  id: 'regular-user',
  role: 'teacher',
  permissions: { mode: 'all', allowed: [] },
};
const regularView = withAttendanceReadOnlyAccess(regularUser);
assert.deepEqual(
  regularView.permissions.allowed,
  ['attendance:calendar', 'attendance:history'],
  'regular authenticated users should receive only the two read-only Attendance surfaces',
);
assert.deepEqual(regularUser.permissions.allowed, [], 'the source user object must not be mutated');
assert.equal(regularView.permissions.allowed.includes('attendance:quick'), false);
assert.equal(regularView.permissions.allowed.includes('attendance:manage'), false);
assert.equal(regularView.permissions.allowed.includes('attendance:report'), false);

const grantedOperator = {
  id: 'operator-user',
  role: 'teacher',
  permissions: { mode: 'custom', allowed: ['attendance:quick', 'attendance:manage'] },
};
const operatorView = withAttendanceReadOnlyAccess(grantedOperator);
assert.deepEqual(
  operatorView.permissions.allowed,
  ['attendance:quick', 'attendance:manage', 'attendance:calendar', 'attendance:history'],
  'explicit operator permissions must be preserved while read surfaces are added',
);
assert.equal(operatorView.permissions.mode, 'custom');

const adminUser = {
  id: 'admin-user',
  role: 'admin',
  permissions: { mode: 'all', allowed: ['attendance:report'] },
};
const adminView = withAttendanceReadOnlyAccess(adminUser);
assert.deepEqual(
  adminView.permissions.allowed,
  ['attendance:report', 'attendance:calendar', 'attendance:history'],
  'admin permission data must be preserved',
);

const duplicateHistory = {
  id: 'history-user',
  role: 'teacher',
  permissions: { mode: 'custom', allowed: ['attendance:history'] },
};
assert.deepEqual(
  withAttendanceReadOnlyAccess(duplicateHistory).permissions.allowed,
  ['attendance:history', 'attendance:calendar'],
  'read-only grants must be de-duplicated',
);

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const migration = fs.readFileSync(
  `${repoRoot}supabase/migrations/20260914_attendance_readonly_for_all_authenticated.sql`,
  'utf8',
);
assert.match(migration, /create or replace function public\.can_view_extra_class_attendance\(\)/i);
assert.match(migration, /p\.id\s*=\s*auth\.uid\(\)/i);
assert.match(migration, /p\.approved\s*=\s*true/i);
assert.match(
  migration,
  /revoke\s+all\s+on\s+function\s+public\.can_view_extra_class_attendance\(\)\s+from\s+anon/i,
  'anonymous callers must not be granted the SECURITY DEFINER view helper',
);
for (const table of [
  'bes_extra_classes',
  'bes_extra_class_members',
  'bes_extra_class_teachers',
  'bes_extra_attendance_sessions',
  'bes_extra_attendance_records',
]) {
  assert.match(
    migration,
    new RegExp(`on\\s+public\\.${table}\\s+for\\s+select`, 'i'),
    `${table} must be readable through the approved-account read policy`,
  );
}
assert.doesNotMatch(
  migration,
  /for\s+(insert|update|delete)\b/i,
  'the read-only migration must never widen mutation policies',
);
assert.doesNotMatch(
  migration,
  /create\s+or\s+replace\s+function\s+public\.can_(take|manage)_extra_class_attendance/i,
  'the read-only migration must not weaken existing write authorization helpers',
);

const globalNav = fs.readFileSync(`${repoRoot}src/components/GlobalFlatNavigation.jsx`, 'utf8');
assert.match(
  globalNav,
  /GlobalAttendanceReadOnlyNavigationTab\.jsx/,
  'the global navigation must route Attendance through the read-only access adapter',
);

const mobileShell = fs.readFileSync(`${repoRoot}src/components/mobile/MobileAppShell.jsx`, 'utf8');
assert.match(
  mobileShell,
  /withAttendanceReadOnlyAccess/,
  'the mobile shell must use the same read-only Attendance adapter as desktop navigation',
);
assert.match(
  mobileShell,
  /hasAnyAttendanceAccess\(attendanceUser\)/,
  'the mobile Attendance shortcut must be visible to regular authenticated users through the read-only adapter',
);

console.log('Attendance read-only access contract: OK');
