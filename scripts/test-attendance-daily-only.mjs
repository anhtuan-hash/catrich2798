import fs from 'node:fs';
import assert from 'node:assert/strict';

const dailyOverviewModule = fs.readFileSync(new URL('../src/attendanceDailyStatusOverview.js', import.meta.url), 'utf8');

assert.doesNotMatch(dailyOverviewModule, /Theo lớp/, 'Attendance calendar must not expose the class-based mode');
assert.doesNotMatch(dailyOverviewModule, /attendance-calendar-mode-switch/, 'Daily-only calendar must not render a mode switcher');
assert.doesNotMatch(dailyOverviewModule, /setCalendarMode\s*\(/, 'Daily-only calendar must not switch back to legacy class mode');
assert.match(dailyOverviewModule, /Lịch điểm danh/, 'Calendar tab must be renamed to Lịch điểm danh');
assert.match(dailyOverviewModule, /input type="date" aria-label="Ngày điểm danh"/, 'Daily-only calendar must keep date selection');
assert.match(dailyOverviewModule, /attendance-calendar-room-filter/, 'Daily-only calendar must keep the room filter');
assert.match(dailyOverviewModule, /attendanceFloorForRoom/, 'Daily-only calendar must keep floor grouping');
assert.match(dailyOverviewModule, /isExtraClassScheduledOnDate\(classRow, dailyAttendanceDate\)/, 'Daily-only calendar must keep schedule-aware class visibility');
for (const label of ['Có lịch', 'Đã điểm danh', 'Chưa điểm danh', 'Đã hủy']) {
  assert.match(dailyOverviewModule, new RegExp(label), `Daily-only calendar must keep status ${label}`);
}
assert.match(dailyOverviewModule, /openHistoryAttendance\(classRow\)/, 'Completed/cancelled rows must open history without restoring legacy class mode');
assert.match(dailyOverviewModule, /openQuickAttendance\(classRow\)/, 'Missing rows must still open quick attendance');

console.log('Attendance daily-only contract OK');
