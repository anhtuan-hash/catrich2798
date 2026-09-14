import assert from 'node:assert/strict';
import {
  getFirstAllowedAttendanceTab,
  hasAnyAttendanceAccess,
} from '../src/utils/permissions.js';

const deleteOnlyUser = {
  id: 'delete-only-user',
  role: 'teacher',
  permissions: {
    mode: 'custom',
    allowed: ['attendance:delete'],
  },
};

assert.equal(
  hasAnyAttendanceAccess(deleteOnlyUser),
  true,
  'A user explicitly granted attendance:delete must be allowed to open the Attendance app even without another attendance tab permission.',
);
assert.equal(
  getFirstAllowedAttendanceTab(deleteOnlyUser),
  'archive',
  'When attendance:delete is the only attendance grant, the archive must be the initial view.',
);

console.log('Attendance archive delete-only entry permission contract: PASS');
