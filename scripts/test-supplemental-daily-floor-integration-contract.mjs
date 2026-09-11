import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scheduleSource = await readFile(new URL('../src/components/attendance/AttendanceDailySchedule.jsx', import.meta.url), 'utf8');
const quickSource = await readFile(new URL('../src/supplementalAttendanceQuickBootstrap.js', import.meta.url), 'utf8');

assert.match(scheduleSource, /loadSupplementalAttendanceActivities/, 'native daily schedule must load Học bổ sung activities for the selected day');
assert.match(scheduleSource, /supplementalActivities/, 'native daily schedule must keep Học bổ sung activities as first-class rows');
assert.match(scheduleSource, /canManageSupplementalLearning/, 'native daily schedule must hide supplemental rows from accounts outside the dedicated manager rule');
assert.match(scheduleSource, /supplementalKind\s*!==\s*['"]adhoc['"]/, 'legacy adhoc sessions must stay out of the current daily class schedule');
assert.doesNotMatch(scheduleSource, /Nhóm dài ngày|Phát sinh/, 'native daily rows must use the class-centric vocabulary');
assert.match(scheduleSource, /Lớp học bổ sung/, 'native supplemental row must identify the current class model');
assert.match(scheduleSource, /data-bes-attendance-source=["']supplemental["']/, 'Học bổ sung must render with the native row layout instead of a separate card section');
assert.match(scheduleSource, /attendanceFloorForRoom\([^)]*(?:supplemental|activity|row)[^)]*\)/i, 'Học bổ sung rooms must participate in the same floor grouping as Phụ đạo/Bồi dưỡng');
assert.match(scheduleSource, /sortAttendanceRoomLabels\([\s\S]{0,500}supplementalActivities/i, 'Học bổ sung rooms must participate in the native room filter options');
assert.match(scheduleSource, /visible(?:Rows|Activities|Items)\.length/, 'summary totals must count the combined visible daily rows');
assert.match(scheduleSource, /bes-open-supplemental-attendance/, 'clicking a native Học bổ sung row must bridge to the existing supplemental rollcall flow');
assert.match(scheduleSource, /bes-supplemental-attendance-changed/, 'native daily schedule must refresh after supplemental attendance/admin changes');
assert.match(quickSource, /bes-open-supplemental-attendance/, 'supplemental rollcall bootstrap must listen for the native row click bridge');
assert.match(quickSource, /bes-supplemental-attendance-changed/, 'supplemental rollcall must notify the native daily schedule after confirmation');
assert.doesNotMatch(quickSource, /bes-supplemental-daily-section|bes-supplemental-daily-grid|bes-supplemental-daily-card/, 'the old separate HỌC BỔ SUNG card section must be removed');
assert.doesNotMatch(quickSource, /Nhóm dài ngày|Phát sinh/, 'rollcall must not reintroduce retired supplemental UI concepts');

console.log('supplemental daily floor integration contract: ok');
