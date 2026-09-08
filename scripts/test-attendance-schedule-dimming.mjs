import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const cssUrl = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);
const scheduleUrl = new URL('../src/utils/extraClassSchedule2026.js', import.meta.url);

const attendance = fs.readFileSync(attendanceUrl, 'utf8');
const css = fs.readFileSync(cssUrl, 'utf8');

assert.ok(fs.existsSync(scheduleUrl), 'Attendance must have a dedicated 2026–2027 extra-class schedule helper.');

const {
  GIFTED_SCHEDULE_2026_2027,
  REMEDIAL_SCHEDULE_2026_2027,
  isExtraClassScheduledOnDate,
} = await import(scheduleUrl.href);

assert.equal(GIFTED_SCHEDULE_2026_2027.length, 23, 'Gifted schedule must cover all 23 classes in the supplied fixed schedule.');
assert.equal(REMEDIAL_SCHEDULE_2026_2027.length, 3, 'Remedial schedule must cover the three supplied classes.');

const giftedGeography11 = { class_type: 'gifted', class_name: 'Bồi dưỡng Địa lí 11', subject: 'Địa lí', grade_level: 11 };
const giftedHistory11 = { class_type: 'gifted', class_name: 'Bồi dưỡng Lịch sử 11', subject: 'Lịch sử', grade_level: 11 };
const remedialMath10 = { class_type: 'remedial', class_name: 'Phụ đạo Toán 10', subject: 'Toán', grade_level: 10 };
const remedialMath11 = { class_type: 'remedial', class_name: 'Phụ đạo Toán 11', subject: 'Toán', grade_level: 11 };
const remedialEnglish10 = { class_type: 'remedial', class_name: 'Phụ đạo Anh 10', subject: 'Anh', grade_level: 10 };

assert.equal(isExtraClassScheduledOnDate(giftedGeography11, '2026-09-08'), false, 'Gifted Geography 11 must be dimmed on Tuesday.');
assert.equal(isExtraClassScheduledOnDate(giftedGeography11, '2026-09-09'), true, 'Gifted Geography 11 must be active on Wednesday.');
assert.equal(isExtraClassScheduledOnDate(giftedHistory11, '2026-09-08'), true, 'Gifted History 11 must be active on Tuesday.');
assert.equal(isExtraClassScheduledOnDate(remedialMath10, '2026-09-08'), false, 'Remedial Math 10 must be dimmed on Tuesday.');
assert.equal(isExtraClassScheduledOnDate(remedialMath10, '2026-09-11'), true, 'Remedial Math 10 must be active on Friday.');
assert.equal(isExtraClassScheduledOnDate(remedialMath11, '2026-09-10'), true, 'Remedial Math 11 must be active on Thursday.');
assert.equal(isExtraClassScheduledOnDate(remedialEnglish10, '2026-09-08'), true, 'Remedial English 10 must be active on Tuesday.');

assert.match(attendance, /isExtraClassScheduledOnDate\(classRow,\s*attendanceDate\)/, 'Quick attendance must evaluate each class against the selected attendance date.');
assert.match(attendance, /is-off-schedule/, 'Off-schedule classes must receive a dimming class.');
assert.match(css, /\.attendance-class-list button\.is-off-schedule\s*\{[^}]*opacity\s*:/i, 'Material 3 styles must visually dim off-schedule classes.');

console.log('Attendance schedule dimming contract OK');
