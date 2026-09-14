import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.jsx', 'utf8');

assert.match(
  ui,
  /const\s+allowed\s*=\s*Boolean\([^;]*canDeleteAttendanceHistory[^;]*\);/,
  'A user explicitly granted attendance:delete must be allowed to open the Attendance app even without another attendance tab permission.',
);
assert.match(
  ui,
  /const\s+firstAllowedView\s*=\s*[^;]*canDeleteAttendanceHistory\s*\?\s*'archive'/,
  'When attendance:delete is the only attendance grant, the archive must be the initial view.',
);

console.log('Attendance archive delete-only entry permission contract: PASS');
