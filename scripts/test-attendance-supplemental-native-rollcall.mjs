import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const shell = read('src/components/GlobalAttendanceNavigationTab.jsx');
const supplementalApi = read('src/attendance/supplementalLearningApi.js');
const quickBootstrap = read('src/supplementalAttendanceQuickBootstrap.js');
const reportUtils = read('src/utils/attendanceReport.js');
const migrationPath = new URL('../supabase/migrations/20260911_supplemental_native_rollcall_parity.sql', import.meta.url);

assert.match(shell, /bes-supplemental-open-rollcall/, 'The native React attendance surface must listen for class-launched supplemental rollcall.');
assert.match(shell, /bes-open-supplemental-attendance/, 'The native React attendance surface must also accept supplemental rollcall from schedule/calendar entry points.');
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

assert.equal(fs.existsSync(migrationPath), true, 'A migration must persist native-rollcall metadata for supplemental sessions.');
const migration = read('supabase/migrations/20260911_supplemental_native_rollcall_parity.sql');
assert.match(migration, /lesson_periods/i, 'Supplemental sessions must store lesson periods.');
assert.match(migration, /bes_confirm_supplemental_attendance_v2/i, 'A compatibility-safe supplemental confirmation RPC must persist native rollcall metadata.');
assert.match(migration, /bes_list_supplemental_history/i, 'Unified history/report must expose the persisted lesson-period metadata.');

assert.match(reportUtils, /lessonPeriods|lesson_periods/, 'Unified reporting must consume the supplemental lesson-period value rather than always assuming one period.');

console.log('Supplemental native rollcall parity contract OK');
