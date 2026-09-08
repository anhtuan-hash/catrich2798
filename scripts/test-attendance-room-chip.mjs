import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendanceUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
const cssUrl = new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url);
const scheduleUrl = new URL('../src/utils/extraClassSchedule2026.js', import.meta.url);

const attendance = fs.readFileSync(attendanceUrl, 'utf8');
const css = fs.readFileSync(cssUrl, 'utf8');
const schedule = await import(scheduleUrl.href);

assert.equal(typeof schedule.roomForExtraClass, 'function', 'Attendance schedule helper must expose roomForExtraClass().');
assert.ok(schedule.GIFTED_SCHEDULE_2026_2027.every((entry) => entry.room), 'Every gifted schedule entry must include its supplied room.');
assert.ok(schedule.REMEDIAL_SCHEDULE_2026_2027.every((entry) => entry.room), 'Every remedial schedule entry must include its supplied room.');

assert.equal(schedule.roomForExtraClass({ class_type: 'gifted', class_name: 'Bồi dưỡng Địa lí 11', subject: 'Địa lí', grade_level: 11 }), 'A406');
assert.equal(schedule.roomForExtraClass({ class_type: 'gifted', class_name: 'Bồi dưỡng Lịch sử 11', subject: 'Lịch sử', grade_level: 11 }), 'A302');
assert.equal(schedule.roomForExtraClass({ class_type: 'remedial', class_name: 'Phụ đạo Toán 10', subject: 'Toán', grade_level: 10 }), 'A103');
assert.equal(schedule.roomForExtraClass({ class_type: 'remedial', class_name: 'Phụ đạo Toán 11', subject: 'Toán', grade_level: 11 }), 'A301');
assert.equal(schedule.roomForExtraClass({ class_type: 'remedial', class_name: 'Phụ đạo Anh 10', subject: 'Anh', grade_level: 10 }), 'A103');

assert.match(attendance, /attendance-room-chip/, 'Attendance UI must render a dedicated room chip.');
assert.match(attendance, /roomForExtraClass\(classRow\)/, 'Class list must derive room from the schedule helper.');
assert.match(attendance, /roomForExtraClass\(selectedClass\)/, 'Selected-class header must derive room from the schedule helper.');
assert.match(css, /\.attendance-room-chip\s*\{[^}]*border-radius[^}]*background[^}]*font-weight/i, 'Room chip must have deliberate visual styling.');

console.log('Attendance room chip contract OK');
