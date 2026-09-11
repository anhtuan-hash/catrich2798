import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scheduleSource = await readFile(new URL('../src/components/attendance/AttendanceDailySchedule.jsx', import.meta.url), 'utf8');
const navigationSource = await readFile(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const quickSource = await readFile(new URL('../src/supplementalAttendanceQuickBootstrap.js', import.meta.url), 'utf8');

assert.match(
  scheduleSource,
  /supplementalActivities\s*=\s*\[\]/,
  'native daily schedule must accept Học bổ sung activities as first-class rows',
);
assert.match(
  scheduleSource,
  /onOpenSupplemental/,
  'native daily schedule must expose a click handler for Học bổ sung rows',
);
assert.match(
  scheduleSource,
  /data-bes-attendance-source=["']supplemental["']/,
  'Học bổ sung must render with the native row layout instead of a separate card section',
);
assert.match(
  scheduleSource,
  /attendanceFloorForRoom\([^)]*(?:supplemental|activity|row)[^)]*\)/i,
  'Học bổ sung rooms must participate in the same floor grouping as Phụ đạo/Bồi dưỡng',
);
assert.match(
  scheduleSource,
  /sortAttendanceRoomLabels\([\s\S]{0,500}supplementalActivities/i,
  'Học bổ sung rooms must participate in the native room filter options',
);
assert.match(
  scheduleSource,
  /visible(?:Rows|Activities|Items)\.length/,
  'summary totals must count the combined visible daily rows',
);
assert.match(
  navigationSource,
  /loadSupplementalAttendanceActivities/,
  'native Attendance owner must load Học bổ sung activities for the selected day',
);
assert.match(
  navigationSource,
  /supplementalActivities=\{[^}]+\}/,
  'native Attendance owner must pass Học bổ sung activities into the daily schedule',
);
assert.match(
  navigationSource,
  /bes-open-supplemental-attendance/,
  'clicking a native Học bổ sung row must bridge to the existing supplemental rollcall flow',
);
assert.match(
  quickSource,
  /bes-open-supplemental-attendance/,
  'supplemental rollcall bootstrap must listen for the native row click bridge',
);
assert.doesNotMatch(
  quickSource,
  /bes-supplemental-daily-section|bes-supplemental-daily-grid|bes-supplemental-daily-card/,
  'the old separate HỌC BỔ SUNG card section must be removed',
);

console.log('supplemental daily floor integration contract: ok');
