import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const shell = read('src/components/GlobalAttendanceNavigationTab.jsx');
const schedule = read('src/components/attendance/AttendanceDailySchedule.jsx');
const supplementalApi = read('src/attendance/supplementalLearningApi.js');
const quickBootstrap = read('src/supplementalAttendanceQuickBootstrap.js');
const reportUtils = read('src/utils/attendanceReport.js');
const migrationPath = new URL('../supabase/migrations/20260911_supplemental_native_rollcall_parity.sql', import.meta.url);
const finalParityMigrationPath = new URL('../supabase/migrations/20260912_supplemental_final_parity.sql', import.meta.url);

assert.match(shell, /bes-supplemental-open-rollcall/, 'The native React attendance surface must listen for class-launched supplemental rollcall.');
assert.match(shell, /bes-open-supplemental-attendance/, 'The native React attendance surface may keep accepting the legacy supplemental event for compatibility outside the daily schedule.');
assert.match(schedule, /bes-supplemental-open-rollcall/, 'The daily attendance schedule must open Học bổ sung through the native React rollcall event.');
assert.doesNotMatch(schedule, /bes-open-supplemental-attendance/, 'The daily attendance schedule must never route Học bổ sung through the legacy rollcall event.');
assert.match(shell, /supplementalRollcall|rollcallSource|attendanceSource/, 'The native attendance surface must keep an explicit source discriminator for supplemental sessions.');
assert.match(shell, /beginSupplementalAttendance/, 'The native attendance surface must load/freeze the supplemental roster through the supplemental API.');
assert.match(shell, /confirmSupplementalAttendance/, 'The native attendance surface must finalize supplemental attendance through the supplemental backend.');
assert.match(shell, /attachSupplementalProof/, 'The native attendance surface must attach proof to supplemental sessions through the supplemental backend.');
assert.match(shell, /\[\[1,'1 tiết'\],\[1\.5,'1,5 tiết'\],\[2,'2 tiết'\]\]/, 'The shared native rollcall must retain the 1 / 1.5 / 2 lesson-period selector.');
assert.match(shell, /Giáo viên dạy hôm nay/, 'The shared native rollcall must retain the teacher selector.');
assert.match(shell, /Phòng học/, 'The shared native rollcall must retain room editing.');
assert.match(shell, /Thời gian dạy/, 'The shared native rollcall must retain teaching-time editing.');
assert.match(
  shell,
  /if \(!client \|\| !allowed \|\| !canManageSupplementalLearning\(runtime\)\) return undefined;[\s\S]{0,500}openSupplementalRollcall/,
  'The native supplemental rollcall listener must be installed only behind the dedicated supplemental access guard.',
);

assert.match(
  shell,
  /if \(String\(selectedClassId \|\| ''\)\.startsWith\('supplemental:'\)\) return;/,
  'Supplemental rollcall must not be overwritten by the extra-class day-session loader.',
);
assert.match(
  shell,
  /attendanceSource === 'supplemental'[\s\S]{0,220}\['confirmed', 'cancelled'\]/,
  'An in-progress supplemental session must stay editable until it is confirmed or cancelled.',
);
assert.match(
  shell,
  /attendanceSource === 'supplemental'[\s\S]{0,900}cancelSupplementalSession\(/,
  'Cancelling from the shared rollcall must call the supplemental cancellation API.',
);

assert.doesNotMatch(quickBootstrap, /id = ROLLCALL_ID|bes-supplemental-participant|bes-supplemental-rollcall" role="dialog"/, 'The legacy bespoke supplemental rollcall DOM must be retired once native rollcall owns the flow.');

assert.match(supplementalApi, /p_lesson_periods/, 'Supplemental confirmation must persist lesson periods.');
assert.match(supplementalApi, /p_teacher_name/, 'Supplemental confirmation must persist the teacher used for the session.');
assert.match(supplementalApi, /p_room/, 'Supplemental confirmation must persist the room override.');
assert.match(supplementalApi, /p_start_time/, 'Supplemental confirmation must persist the start time override.');
assert.match(supplementalApi, /p_end_time/, 'Supplemental confirmation must persist the end time override.');
assert.match(supplementalApi, /Vui lòng chọn giáo viên dạy hôm nay\./, 'Supplemental confirmation must reject a missing teacher just like the shared extra-class flow.');
assert.match(supplementalApi, /Vui lòng nhập phòng học\./, 'Supplemental confirmation must reject a missing room just like the shared extra-class flow.');
assert.match(supplementalApi, /Vui lòng nhập thời gian dạy\./, 'Supplemental confirmation must reject missing start/end times just like the shared extra-class flow.');
assert.match(supplementalApi, /Vui lòng chọn lý do vắng/, 'Supplemental confirmation must reject an absent participant without an absence reason.');
assert.match(supplementalApi, /Vui lòng ghi chú lý do “Khác”/, 'Supplemental confirmation must reject the “Khác” absence reason without a note.');

assert.match(supplementalApi, /loadSupplementalSessionTeachers/, 'The supplemental API must expose assigned teachers for the selected session.');
assert.match(shell, /loadSupplementalSessionTeachers/, 'Opening supplemental rollcall must load the complete assigned-teacher list.');
assert.match(shell, /teacherNames|assignedTeacherNames|supplementalTeacherNames/, 'Supplemental rollcall must normalize multiple assigned teacher names for the shared selector.');

assert.equal(fs.existsSync(migrationPath), true, 'A migration must persist native-rollcall metadata for supplemental sessions.');
const migration = read('supabase/migrations/20260911_supplemental_native_rollcall_parity.sql');
assert.match(migration, /lesson_periods/i, 'Supplemental sessions must store lesson periods.');
assert.match(migration, /bes_confirm_supplemental_attendance_v2/i, 'A compatibility-safe supplemental confirmation RPC must persist native rollcall metadata.');
assert.match(migration, /bes_list_supplemental_history/i, 'Unified history/report must expose the persisted lesson-period metadata.');

assert.equal(fs.existsSync(finalParityMigrationPath), true, 'A forward-only migration must close the remaining supplemental parity gaps.');
const finalParityMigration = read('supabase/migrations/20260912_supplemental_final_parity.sql');
assert.match(finalParityMigration, /bes_list_supplemental_session_teachers/i, 'The backend must expose all assigned teachers for a supplemental recurring session.');
assert.match(finalParityMigration, /bes_confirm_supplemental_attendance_v2/i, 'The final migration must harden the existing v2 confirmation RPC without changing its client contract.');
assert.match(finalParityMigration, /Vui lòng chọn giáo viên dạy hôm nay|giáo viên dạy hôm nay/i, 'The backend must reject confirmation without an effective teacher.');
assert.match(finalParityMigration, /Vui lòng nhập phòng học|phòng học/i, 'The backend must reject confirmation without an effective room.');
assert.match(finalParityMigration, /excused[\s\S]*unexcused[\s\S]*sick[\s\S]*family[\s\S]*other[\s\S]*unspecified/i, 'The backend must validate the supported absence-reason codes.');
assert.match(finalParityMigration, /other[\s\S]{0,1200}absenceNote|absence_note[\s\S]{0,1200}other/i, 'The backend must require a note for the “other” absence reason.');
assert.match(finalParityMigration, /bes_extra_attendance_sessions[\s\S]{0,1800}bes_supplemental_sessions|bes_supplemental_sessions[\s\S]{0,1800}bes_extra_attendance_sessions/, 'Teacher/day conflict protection must consider both extra and supplemental attendance sources.');

assert.match(reportUtils, /lessonPeriods|lesson_periods/, 'Unified reporting must consume the supplemental lesson-period value rather than always assuming one period.');

console.log('Supplemental native rollcall parity contract OK');
