import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const materialCss = fs.readFileSync(new URL('../src/components/attendance/AttendanceMaterial3.css', import.meta.url), 'utf8');
const migrationUrl = new URL('../supabase/migrations/20260908_attendance_teacher_day_lock.sql', import.meta.url);
const migration = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';

assert.match(
  materialCss,
  /\.attendance-roster\s*\{[^}]*overflow-y\s*:\s*auto/i,
  'Quick-attendance roster must own a vertical scroll viewport',
);

assert.ok(migration, 'Teacher/day lock migration must exist');
assert.match(
  migration,
  /create\s+unique\s+index[\s\S]*attendance_date[\s\S]*lower\s*\(\s*trim\s*\(\s*teacher_name\s*\)\s*\)[\s\S]*session_status\s*=\s*'completed'/i,
  'Database must enforce one completed class session per teacher per day',
);
assert.match(
  migration,
  /Giáo viên[\s\S]*đã được điểm danh tại lớp[\s\S]*ngày/i,
  'RPC must return a clear teacher/day conflict message',
);

assert.match(attendance, /teacherDaySessions/, 'Frontend must load completed teacher sessions for the selected date');
assert.match(attendance, /loadTeacherDaySessions/, 'Frontend must refresh teacher/day usage when date changes');
assert.match(attendance, /đã điểm danh:/i, 'Used teachers must be labelled with the class already attended');
assert.match(attendance, /teacherUsageForDate/, 'Frontend must derive teacher usage before enabling teacher selection');

console.log('Attendance roster scroll and teacher/day lock contract OK');
