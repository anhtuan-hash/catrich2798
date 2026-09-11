import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.jsx', 'utf8');
const deleteAuthorizationSource = fs.readFileSync('supabase/migrations/20260911103500_attendance_history_delete_authorization.sql', 'utf8');

assert.match(source, /const canUseQuickAttendance\s*=/, 'Attendance must define a dedicated quick-operation capability');
assert.match(source, /hasAttendanceTabAccess\(currentUser,\s*'report'\)/, 'Report permission must grant the quick-operation override');
assert.match(source, /item\.tab === 'quick'\s*\?\s*canUseQuickAttendance/, 'Quick tab visibility must use the override capability');
assert.match(source, /view === 'quick'[\s\S]{0,120}canUseQuickAttendance|canUseQuickAttendance[\s\S]{0,120}view === 'quick'/, 'Quick attendance body must render for report override users');
assert.match(source, /const canDeleteAttendanceHistory\s*=/, 'History deletion must use a dedicated destructive capability');
assert.doesNotMatch(
  source,
  /canAccessAttendanceView\('quick'\)\s*\?\s*<button[^>]*(toggleHistorySelectionMode|ahv3__delete-button)/,
  'Quick attendance access must not expose destructive history controls',
);

assert.match(
  deleteAuthorizationSource,
  /can_delete_extra_attendance_history\(\)/,
  'Backend history deletion must enforce the dedicated delete-history authorization helper',
);
assert.match(
  deleteAuthorizationSource,
  /hongtham@accounts\.brianenglish\.studio/i,
  'Dedicated delete authorization must preserve Nguyễn Thị Hồng Thắm access',
);
assert.doesNotMatch(
  deleteAuthorizationSource,
  /attendance:report/,
  'Report-only permission must not grant destructive history access',
);

console.log('Attendance report override quick-entry contract OK');
