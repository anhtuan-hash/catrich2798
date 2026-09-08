import fs from 'node:fs';
import assert from 'node:assert/strict';

const migrationUrl = new URL('../supabase/migrations/20260908_attendance_absence_room_time.sql', import.meta.url);
const hardeningUrl = new URL('../supabase/migrations/20260908_attendance_absence_room_time_hardening.sql', import.meta.url);
const installerUrl = new URL('../supabase/extra-class-attendance.sql', import.meta.url);
const migration = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';
const hardening = fs.existsSync(hardeningUrl) ? fs.readFileSync(hardeningUrl, 'utf8') : '';
const installer = fs.existsSync(installerUrl) ? fs.readFileSync(installerUrl, 'utf8') : '';

assert.ok(migration, 'Attendance absence/room/time migration must exist');
assert.match(migration, /teaching_room\s+text\s+not\s+null\s+default\s+''/i);
assert.match(migration, /teaching_time_range\s+text\s+not\s+null\s+default\s+''/i);
assert.match(migration, /absence_reason_code\s+text\s+not\s+null\s+default\s+''/i);
assert.match(migration, /absence_note\s+text\s+not\s+null\s+default\s+''/i);
for (const code of ['excused', 'unexcused', 'sick', 'family', 'other', 'unspecified']) {
  assert.match(migration, new RegExp(code), `Migration must support absence reason ${code}`);
}
assert.match(migration, /p_absence_details\s+jsonb/i);
assert.match(migration, /p_teaching_room\s+text/i);
assert.match(migration, /p_teaching_time_range\s+text/i);
assert.match(migration, /Giáo viên[\s\S]*đã được điểm danh tại lớp/i);
assert.match(migration, /Vui lòng nhập phòng học/i);
assert.match(migration, /Vui lòng nhập thời gian dạy/i);
assert.match(migration, /security\s+definer/i);
assert.match(migration, /search_path\s*=\s*public/i);
assert.match(migration, /from\s+anon/i);
assert.match(migration, /to\s+authenticated/i);

assert.ok(hardening, 'Attendance rich-RPC hardening migration must exist');
assert.match(hardening, /drop\s+function\s+if\s+exists\s+public\.bes_confirm_extra_class_attendance\s*\(\s*uuid\s*,\s*date\s*,\s*text\s*,\s*numeric\s*,\s*text\[\]\s*,\s*text\s*\)/i);
assert.match(hardening, /drop\s+function\s+if\s+exists\s+public\.bes_cancel_extra_class_session\s*\(\s*uuid\s*,\s*date\s*,\s*text\s*\)/i);

assert.ok(installer, 'Fresh attendance installer must exist');
for (const token of [
  'bes_extra_class_teachers',
  'attendance_date date',
  'session_status text',
  'lesson_periods numeric',
  'teaching_room text',
  'teaching_time_range text',
  'absence_reason_code text',
  'absence_note text',
  'bes_extra_attendance_sessions_teacher_day_uidx',
  'p_absence_details jsonb',
  'bes_create_extra_class_with_teachers',
  'bes_add_extra_class_teacher',
]) assert.match(installer, new RegExp(token, 'i'), `Fresh installer must include ${token}`);
assert.match(installer, /drop\s+function\s+if\s+exists\s+public\.bes_confirm_extra_class_attendance\s*\(\s*uuid\s*,\s*text\[\]\s*,\s*text\s*\)/i);
assert.match(installer, /revoke\s+all\s+on\s+function[\s\S]*from\s+anon/i);

console.log('Attendance absence reasons, room/time and consolidated installer contract OK');
