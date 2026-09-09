import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.jsx', 'utf8');

assert.match(source, /const canUseQuickAttendance\s*=/, 'Attendance must define a dedicated quick-operation capability');
assert.match(source, /hasAttendanceTabAccess\(currentUser,\s*'report'\)/, 'Report permission must grant the quick-operation override');
assert.match(source, /item\.tab === 'quick'\s*\?\s*canUseQuickAttendance/, 'Quick tab visibility must use the override capability');
assert.match(source, /view === 'quick'[\s\S]{0,120}canUseQuickAttendance|canUseQuickAttendance[\s\S]{0,120}view === 'quick'/, 'Quick attendance body must render for report override users');
assert.match(source, /canAccessAttendanceView\('quick'\)/, 'History destructive actions must keep using the original quick permission gate');

console.log('Attendance report override quick-entry contract OK');
