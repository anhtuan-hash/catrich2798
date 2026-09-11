import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = fs.readFileSync(path.join(root, 'src/components/GlobalAttendanceNavigationTab.jsx'), 'utf8');
const migrationsDir = path.join(root, 'supabase/migrations');
const migrations = fs.readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8'))
  .join('\n');

assert.match(
  migrations,
  /create\s+or\s+replace\s+function\s+public\.can_delete_extra_attendance_history\s*\(\s*\)/i,
  'Backend must define a dedicated delete-history authorization helper.',
);

assert.match(
  migrations,
  /hongtham@accounts\.brianenglish\.studio/i,
  'Delete-history authorization must explicitly allow Nguyễn Thị Hồng Thắm.',
);

assert.match(
  migrations,
  /bes_delete_extra_attendance_session[\s\S]*can_delete_extra_attendance_history\s*\(\s*\)/i,
  'The delete RPC must enforce the dedicated delete-history authorization helper.',
);

assert.match(
  source,
  /const\s+canDeleteAttendanceHistory\s*=/,
  'Frontend must compute a dedicated delete-history capability.',
);

assert.match(
  source,
  /canDeleteAttendanceHistory\s*\?\s*<button[^>]*onClick=\{toggleHistorySelectionMode\}/,
  'Bulk history selection must only be offered to authorized deleters.',
);

assert.match(
  source,
  /canDeleteAttendanceHistory\s*&&\s*!isSupplementalHistorySession\(selectedSession\)\s*\?\s*<button[^>]*className="ahv3__delete-button"/,
  'Single-session delete must require delete authorization and exclude supplemental history rows.',
);

assert.match(
  source,
  /if\s*\(!session\s*\|\|[\s\S]*!canDeleteAttendanceHistory\s*\|\|\s*isSupplementalHistorySession\(session\)\)\s*return;/,
  'Delete handler must refuse supplemental sessions even if invoked outside the normal button flow.',
);

assert.doesNotMatch(
  source,
  /canAccessAttendanceView\('quick'\)\s*\?\s*<button[^>]*(toggleHistorySelectionMode|ahv3__delete-button)/,
  'attendance:quick must not itself expose destructive history controls.',
);

console.log('Attendance history delete authorization contract OK');
