import fs from 'node:fs';
import assert from 'node:assert/strict';

const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const migrationUrl = new URL('../supabase/migrations/20260908_attendance_material3_periods_cancel_reports.sql', import.meta.url);
const hardeningUrl = new URL('../supabase/migrations/20260908_attendance_material3_require_periods.sql', import.meta.url);
const migration = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';
const hardening = fs.existsSync(hardeningUrl) ? fs.readFileSync(hardeningUrl, 'utf8') : '';

assert.doesNotMatch(attendance, /Mỗi lớp chỉ chốt một lần mỗi ngày · giờ xác nhận lưu theo máy chủ/, 'Old explanatory header copy must be removed');
assert.ok(migration, 'Material 3 attendance migration must exist');
assert.match(migration, /session_status/i, 'Migration must add session status');
assert.match(migration, /lesson_periods/i, 'Migration must add lesson periods');
assert.match(migration, /cancellation_reason/i, 'Migration must add cancellation reason');
assert.match(migration, /lesson_periods\s+in\s*\(\s*1(?:\.0)?\s*,\s*1\.5\s*,\s*2(?:\.0)?\s*\)/i, 'Completed sessions must accept only 1, 1.5 or 2 periods');
assert.match(migration, /bes_cancel_extra_class_session\s*\(/i, 'Migration must define cancellation RPC');
assert.match(migration, /can_manage_extra_class_attendance\(\)/i, 'Attendance writes must enforce Admin permission');
assert.match(migration, /from\s+anon/i, 'Anonymous execution must be revoked');
assert.match(migration, /to\s+authenticated/i, 'Authenticated execution must be granted');
assert.ok(hardening, 'Period-selection hardening migration must exist');
assert.match(hardening, /drop\s+function\s+if\s+exists\s+public\.bes_confirm_extra_class_attendance\s*\(\s*uuid\s*,\s*date\s*,\s*text\s*,\s*text\[\]\s*,\s*text\s*\)/i, 'Legacy daily RPC without period count must be removed');
assert.match(hardening, /drop\s+function\s+if\s+exists\s+public\.bes_confirm_extra_class_attendance\s*\(\s*uuid\s*,\s*text\[\]\s*,\s*text\s*\)/i, 'Legacy pre-date RPC must be removed');
assert.match(attendance, /1 tiết/);
assert.match(attendance, /1,5 tiết/);
assert.match(attendance, /2 tiết/);
assert.match(attendance, /p_lesson_periods/);
assert.match(attendance, /bes_cancel_extra_class_session/);
assert.match(attendance, /Hủy buổi học/);
assert.match(attendance, /Lý do hủy/);

console.log('Attendance Material 3 reporting contract OK');
