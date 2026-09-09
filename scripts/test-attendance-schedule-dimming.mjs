import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const cssUrl = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);
const scheduleUrl = new URL('../src/utils/extraClassSchedule2026.js', import.meta.url);
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);

const attendance = fs.readFileSync(attendanceUrl, 'utf8');
const css = fs.readFileSync(cssUrl, 'utf8');
const scheduleLockMigrations = fs.readdirSync(migrationsDir)
  .filter((name) => /attendance.*schedule.*hard.*lock/i.test(name))
  .map((name) => fs.readFileSync(new URL(name, migrationsDir), 'utf8'))
  .join('\n');

assert.ok(fs.existsSync(scheduleUrl), 'Attendance must have a dedicated 2026–2027 extra-class schedule helper.');

const {
  GIFTED_SCHEDULE_2026_2027,
  REMEDIAL_SCHEDULE_2026_2027,
  isExtraClassScheduledOnDate,
} = await import(scheduleUrl.href);

assert.equal(GIFTED_SCHEDULE_2026_2027.length, 23, 'Gifted schedule catalog must remain available for room/default metadata.');
assert.equal(REMEDIAL_SCHEDULE_2026_2027.length, 3, 'Remedial schedule catalog must remain available for room/default metadata.');

// The production database stores school weekday notation: 2=Monday ... 7=Saturday, CN=Sunday.
const giftedGeography11 = { class_type: 'gifted', class_name: 'Bồi dưỡng Địa lí 11', subject: 'Địa lí', grade_level: 11, weekdays: '4' };
const giftedHistory11 = { class_type: 'gifted', class_name: 'Bồi dưỡng Lịch sử 11', subject: 'Lịch sử', grade_level: 11, weekdays: '3,5' };
const remedialMath10 = { class_type: 'remedial', class_name: 'Phụ đạo Toán 10', subject: 'Toán', grade_level: 10, weekdays: '2,6' };
const remedialMath11 = { class_type: 'remedial', class_name: 'Phụ đạo Toán 11', subject: 'Toán', grade_level: 11, weekdays: '2,5' };
const remedialEnglish10 = { class_type: 'remedial', class_name: 'Phụ đạo Anh 10', subject: 'Anh', grade_level: 10, weekdays: '3,5' };
const unknownScheduleClass = { class_type: 'gifted', class_name: 'Lớp chưa cấu hình lịch', subject: 'Khác', grade_level: 12 };

assert.equal(isExtraClassScheduledOnDate(giftedGeography11, '2026-09-08'), false, 'Gifted Geography 11 must be locked on Tuesday when its persisted schedule is Wednesday only.');
assert.equal(isExtraClassScheduledOnDate(giftedGeography11, '2026-09-09'), true, 'Gifted Geography 11 must be usable on Wednesday.');
assert.equal(isExtraClassScheduledOnDate(giftedHistory11, '2026-09-08'), true, 'Gifted History 11 must be usable on Tuesday.');
assert.equal(isExtraClassScheduledOnDate(remedialMath10, '2026-09-08'), false, 'Remedial Math 10 must be locked on Tuesday.');
assert.equal(isExtraClassScheduledOnDate(remedialMath10, '2026-09-11'), true, 'Remedial Math 10 must be usable on Friday.');
assert.equal(isExtraClassScheduledOnDate(remedialMath11, '2026-09-10'), true, 'Remedial Math 11 must be usable on Thursday.');
assert.equal(isExtraClassScheduledOnDate(remedialEnglish10, '2026-09-08'), true, 'Remedial English 10 must be usable on Tuesday.');
assert.equal(isExtraClassScheduledOnDate(unknownScheduleClass, '2026-09-08'), false, 'A class without a persisted schedule must be locked, never silently allowed.');
assert.equal(isExtraClassScheduledOnDate(remedialEnglish10, 'not-a-date'), false, 'An invalid attendance date must fail closed.');

assert.match(attendance, /isExtraClassScheduledOnDate\(classRow,\s*attendanceDate\)/, 'Quick attendance must evaluate each class against the selected attendance date.');
assert.match(attendance, /disabled=\{!scheduledForDate\}/, 'Off-schedule class cards must be non-interactive, not only dimmed.');
assert.match(attendance, /isScheduleLocked\s*=\s*Boolean\([\s\S]*?!isExtraClassScheduledOnDate\(selectedClass,\s*attendanceDate\)/, 'Selected-class controls must derive a strict schedule lock.');
assert.match(attendance, /Không có lịch học ngày/, 'The UI must explain why an off-schedule class is locked.');
assert.match(attendance, /if\s*\(!isExtraClassScheduledOnDate\(selectedClass,\s*attendanceDate\)\)/, 'Attendance actions must guard against an off-schedule class even if UI controls are bypassed.');
assert.match(attendance, /is-off-schedule/, 'Off-schedule classes must keep the visual dimming class.');
assert.match(css, /\.attendance-class-list button\.is-off-schedule\s*\{[^}]*opacity\s*:/i, 'Material 3 styles must still visually dim off-schedule classes.');

assert.ok(scheduleLockMigrations.length > 0, 'A database migration must enforce the class schedule server-side.');
assert.match(scheduleLockMigrations, /create\s+or\s+replace\s+function\s+public\.bes_extra_class_is_scheduled_on_date/i, 'Database must expose a fail-closed schedule check using persisted class weekdays.');
assert.match(scheduleLockMigrations, /create\s+trigger[\s\S]*bes_extra_attendance_sessions/i, 'Attendance session writes must be protected by a schedule trigger.');
assert.match(scheduleLockMigrations, /Lớp này không có lịch học vào ngày/i, 'Server-side rejection must return a clear off-schedule message.');

console.log('Attendance strict schedule lock contract OK');
