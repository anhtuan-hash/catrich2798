import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.jsx', 'utf8');
const deleteScopeFixSource = fs.readFileSync('supabase/migrations/20260909_attendance_report_delete_scope_fix.sql', 'utf8');

assert.match(source, /const canUseQuickAttendance\s*=/, 'Attendance must define a dedicated quick-operation capability');
assert.match(source, /hasAttendanceTabAccess\(currentUser,\s*'report'\)/, 'Report permission must grant the quick-operation override');
assert.match(source, /item\.tab === 'quick'\s*\?\s*canUseQuickAttendance/, 'Quick tab visibility must use the override capability');
assert.match(source, /view === 'quick'[\s\S]{0,120}canUseQuickAttendance|canUseQuickAttendance[\s\S]{0,120}view === 'quick'/, 'Quick attendance body must render for report override users');
assert.match(source, /canAccessAttendanceView\('quick'\)/, 'History destructive actions must keep using the original quick permission gate');

assert.match(
  deleteScopeFixSource,
  /public\.can_take_extra_class_attendance\(\) and public\.bes_can_operate_extra_attendance_session\(p_session_id, clock_timestamp\(\)\)/,
  'Backend history deletion must require quick permission AND the assignment/time gate',
);
assert.doesNotMatch(
  deleteScopeFixSource,
  /attendance:report/,
  'History delete scope fix must not grant report-only users destructive access',
);

console.log('Attendance report override quick-entry contract OK');
