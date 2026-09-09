import fs from 'node:fs';
import assert from 'node:assert/strict';

const tabSource = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const dailySource = fs.readFileSync(new URL('../src/attendanceDailyStatusOverview.js', import.meta.url), 'utf8');

assert.match(tabSource, /useState\(['"]calendar['"]\)/, 'Attendance module must open on the calendar view by default');
assert.match(tabSource, /if\s*\(item\.tab\s*===\s*['"]quick['"]\)\s*return\s+false|item\.tab\s*===\s*['"]quick['"]\s*\?\s*false/, 'Quick attendance must be hidden from the visible attendance navigation');
assert.match(tabSource, /bes:attendance-open-class/, 'React attendance view must listen for calendar class selection');
assert.match(tabSource, /setSelectedClassId\([\s\S]*setAttendanceDate\([\s\S]*setView\(['"]quick['"]\)/, 'Calendar class selection must open the existing rollcall detail for that class and date');
assert.match(tabSource, /view\s*===\s*['"]quick['"][\s\S]{0,400}item\.tab\s*===\s*['"]calendar['"]|item\.tab\s*===\s*['"]calendar['"][\s\S]{0,400}view\s*===\s*['"]quick['"]/, 'Calendar tab must remain visually active while a class rollcall is open');
assert.match(tabSource, /hasAttendanceTabAccess\(currentUser,\s*['"]calendar['"]\)[\s\S]{0,400}canUseQuickAttendance|canUseQuickAttendance[\s\S]{0,400}hasAttendanceTabAccess\(currentUser,\s*['"]calendar['"]\)/, 'Users who can take attendance must retain access through the calendar entry point');

assert.match(dailySource, /bes:attendance-open-class/, 'Daily schedule rows must open attendance through a direct class-selection event');
assert.doesNotMatch(dailySource, /Điểm danh nhanh[\s\S]{0,400}\.click\(\)/, 'Daily schedule must not navigate by clicking the hidden Quick tab');

console.log('Attendance calendar direct-entry contract OK');
