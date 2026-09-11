import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.jsx', 'utf8');
const deleteScopeFixSource = fs.readFileSync('supabase/migrations/20260909_attendance_report_delete_scope_fix.sql', 'utf8');
const migrations = fs.readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('.sql'))
  .map((name) => fs.readFileSync(`supabase/migrations/${name}`, 'utf8'))
  .join('\n');

assert.match(source, /const canUseQuickAttendance\s*=/, 'Attendance must define a dedicated quick-operation capability');
assert.match(source, /hasAttendanceTabAccess\(currentUser,\s*'report'\)/, 'Report permission must grant the quick-operation override');
assert.match(source, /item\.tab === 'quick'\s*\?\s*canUseQuickAttendance/, 'Quick tab visibility must use the override capability');
assert.match(source, /view === 'quick'[\s\S]{0,120}canUseQuickAttendance|canUseQuickAttendance[\s\S]{0,120}view === 'quick'/, 'Quick attendance body must render for report override users');
assert.match(source, /const canDeleteAttendanceHistory\s*=/, 'History destructive actions must use their dedicated delete-history capability');
assert.match(source, /!canDeleteAttendanceHistory/, 'History delete handlers must reject unauthorized deleters');

assert.match(
  deleteScopeFixSource,
  /public\.can_take_extra_class_attendance\(\) and public\.bes_can_operate_extra_attendance_session\(p_session_id, clock_timestamp\(\)\)/,
  'Legacy delete scope migration must preserve its original quick permission and operation gate',
);
assert.doesNotMatch(
  deleteScopeFixSource,
  /attendance:report/,
  'Report-only access must not be introduced by the legacy delete scope migration',
);
assert.match(
  migrations,
  /create\s+or\s+replace\s+function\s+public\.can_delete_extra_attendance_history\s*\(\s*\)/i,
  'Latest delete-history migration must install the dedicated authorization helper',
);
assert.match(
  migrations,
  /bes_delete_extra_attendance_session[\s\S]*can_delete_extra_attendance_history\s*\(\s*\)/i,
  'Latest delete RPC must enforce the dedicated delete-history authorization helper',
);

console.log('Attendance report override quick-entry contract OK');
