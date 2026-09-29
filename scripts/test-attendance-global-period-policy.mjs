import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  defaultLessonPeriodsForExtraClass,
  lessonPeriodOptionsForExtraClass,
} from '../src/utils/extraClassAttendance.js';

const component = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.jsx', 'utf8');
const settingsClient = fs.readFileSync('src/utils/attendanceGlobalSettings.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260929103000_attendance_global_period_policy.sql', 'utf8');
const css = fs.readFileSync('src/components/attendance/AttendanceMaterial3.css', 'utf8');

assert.equal(defaultLessonPeriodsForExtraClass('remedial'), 1.5, 'Phụ đạo must default to 1.5 periods.');
assert.equal(defaultLessonPeriodsForExtraClass('gifted'), 2, 'Bồi dưỡng HSG must default to 2 periods.');

assert.deepEqual(
  lessonPeriodOptionsForExtraClass('remedial').map((item) => item.value),
  [1.5],
  'Teacher remedial classes must expose only 1.5 periods by default.',
);
assert.deepEqual(
  lessonPeriodOptionsForExtraClass('gifted').map((item) => item.value),
  [2],
  'Teacher gifted classes must expose only 2 periods by default.',
);
assert.deepEqual(
  lessonPeriodOptionsForExtraClass('remedial', { isAdmin: true }).map((item) => item.value),
  [1, 1.5, 2],
  'Admin must always see all three period choices.',
);
assert.deepEqual(
  lessonPeriodOptionsForExtraClass('gifted', { allowTeacherSelection: true }).map((item) => item.value),
  [1, 1.5, 2],
  'Global Admin opt-in must expose all three choices to teachers.',
);

for (const token of [
  'loadAttendanceGlobalSettings',
  'saveAttendanceTeacherPeriodSelection',
  'subscribeAttendanceGlobalSettings',
  'allowTeacherPeriodSelection',
  'Cho phép giáo viên tùy chọn số tiết',
  'Áp dụng cho toàn bộ lớp phụ đạo',
  "selectedClass?.class_type === 'gifted' ? 'Bồi dưỡng: cố định 2 tiết' : 'Phụ đạo: cố định 1,5 tiết'",
]) {
  assert.ok(component.includes(token), `Attendance component contract missing: ${token}`);
}

assert.ok(
  component.includes("if (!isAttendanceAdmin && !allowTeacherPeriodSelection)"),
  'Teacher period rule must be checked again before attendance confirmation.',
);
assert.ok(
  component.includes("defaultLessonPeriodsForExtraClass(selectedClass.class_type)"),
  'Client confirmation guard must derive the fixed value from class type.',
);

for (const token of [
  "allowTeacherPeriodSelection: false",
  ".from('bes_attendance_global_settings')",
  "filter: 'id=eq.true'",
]) {
  assert.ok(settingsClient.includes(token), `Attendance settings client contract missing: ${token}`);
}

for (const token of [
  'create table if not exists public.bes_attendance_global_settings',
  'allow_teacher_period_selection boolean not null default false',
  'Admins can update attendance global settings',
  "lower(coalesce(p.role, '')) in ('admin', 'administrator')",
  'if not v_is_admin and not v_allow_teacher_period_selection then',
  "when v_class.class_type = 'gifted' then 2::numeric",
  'else 1.5::numeric',
  "p_lesson_periods is distinct from v_required_lesson_periods",
]) {
  assert.ok(migration.includes(token), `Attendance database policy contract missing: ${token}`);
}

assert.ok(
  !migration.match(/update\s+public\.bes_extra_attendance_sessions/i),
  'Migration must not rewrite historical attendance sessions.',
);

for (const token of [
  '.att-m3-period-segment.is-single',
  '.att-m3-period-policy',
  '.att-m3-period-fixed-note',
]) {
  assert.ok(css.includes(token), `Attendance period-policy style missing: ${token}`);
}

console.log('PASS: Admin always has 1/1.5/2; teachers default to remedial=1.5 and gifted=2; one global Admin toggle unlocks all three choices without rewriting history.');
