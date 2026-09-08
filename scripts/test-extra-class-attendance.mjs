import fs from 'node:fs';
import assert from 'node:assert/strict';

const flatNav = fs.readFileSync(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const attendance = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const attendanceAdmin = fs.readFileSync(new URL('../src/components/GlobalAttendanceAdminPersistenceBridge.jsx', import.meta.url), 'utf8');
const utility = fs.readFileSync(new URL('../src/utils/extraClassAttendance.js', import.meta.url), 'utf8');
const sql = fs.readFileSync(new URL('../supabase/extra-class-attendance.sql', import.meta.url), 'utf8');
const seedUrl = new URL('../supabase/migrations/20260908_gifted_classes_2026_delete_attendance.sql', import.meta.url);
const seedSql = fs.existsSync(seedUrl) ? fs.readFileSync(seedUrl, 'utf8') : '';
const rpcHardeningUrl = new URL('../supabase/migrations/20260908_harden_gifted_delete_rpc_anon_grants.sql', import.meta.url);
const rpcHardeningSql = fs.existsSync(rpcHardeningUrl) ? fs.readFileSync(rpcHardeningUrl, 'utf8') : '';
const teacherCatalogUrl = new URL('../src/utils/giftedTeacherCatalog2026.js', import.meta.url);
const teacherCatalogSource = fs.existsSync(teacherCatalogUrl) ? fs.readFileSync(teacherCatalogUrl, 'utf8') : '';
const combinedSql = `${sql}\n${seedSql}\n${rpcHardeningSql}`;

assert.match(flatNav, /GlobalTtcmNavigationTab[\s\S]*GlobalAttendanceNavigationTab/, 'Attendance must mount immediately after TTCM');
assert.match(attendance, /Điểm danh nhanh/, 'Attendance workspace needs a quick attendance tab');
assert.match(attendance, /Quản lý lớp/, 'Attendance workspace needs a class management tab');
assert.match(attendance, /Lịch sử/, 'Attendance workspace needs a history tab');
assert.match(attendance, /Thêm học sinh/, 'Admin must be able to add students manually');
assert.match(attendance, /Xóa khỏi lớp/, 'Admin must be able to remove students manually');
assert.match(attendance, /readSheet/, 'Excel import must use the existing read-excel-file browser reader');
assert.match(utility, /parseExtraClassRosterRows/, 'Roster parser must live in the focused attendance utility');
assert.match(utility, /buildAttendanceDraft/, 'Attendance draft logic must be explicit and testable');
assert.match(sql, /bes_extra_class_members/, 'Membership lifecycle table must exist');
assert.match(sql, /left_at timestamptz/, 'Membership removal must keep a left_at timestamp');
assert.match(sql, /removed_by uuid/, 'Membership removal must preserve the actor');
assert.match(sql, /bes_confirm_extra_class_attendance/, 'Attendance confirmation must be transactional on the server');
assert.match(sql, /clock_timestamp\(\)/, 'Attendance time must come from the database server');
assert.match(sql, /bes_extra_attendance_records/, 'Immutable per-student attendance records must exist');
assert.match(sql, /student_full_name text not null/, 'Attendance records must snapshot the student name');

// Regression contract: destructive actions must stay behind guarded server RPCs and integrated Admin UI controls.
assert.match(combinedSql, /bes_delete_extra_class\s*\(/, 'SQL must expose a transactional class-deletion RPC');
assert.match(combinedSql, /bes_delete_extra_attendance_session\s*\(/, 'SQL must expose a transactional approved-attendance deletion RPC');
assert.match(attendance, /bes_delete_extra_class/, 'Class-management UI must call the class-deletion RPC');
assert.match(attendance, /Xóa lớp/, 'Class-management UI must expose an explicit delete-class control');
assert.match(attendance, /bes_delete_extra_attendance_session/, 'History UI must call the approved-attendance deletion RPC');
assert.match(attendance, /Xóa buổi điểm danh/, 'History UI must expose an explicit delete-attendance control');
assert.match(attendance, /bes_extra_class_teachers/, 'Attendance UI must load normalized multi-teacher assignments');
assert.match(attendance, /Toàn bộ giáo viên|Giáo viên theo phân công/, 'Class management must visibly list every assigned teacher');
assert.match(attendance, /window\.confirm/, 'Destructive class and attendance actions must require confirmation');
assert.ok(rpcHardeningSql, 'A follow-up migration must explicitly harden delete RPC grants for anonymous users');
assert.match(rpcHardeningSql, /bes_delete_extra_attendance_session\(uuid\)[\s\S]*from\s+anon/i, 'Anonymous users must not execute approved-attendance deletion');
assert.match(rpcHardeningSql, /bes_delete_extra_class\(uuid\)[\s\S]*from\s+anon/i, 'Anonymous users must not execute class deletion');

// Source seed contract: only grade 10/11/12 gifted classes, with every source roster/teacher assignment.
assert.ok(seedSql, 'The checked-in 2026–2027 gifted-class migration must exist');
assert.match(seedSql, /EXPECTED_SEEDED_CLASSES\s*=\s*23/, 'Seed must declare exactly 23 eligible classes');
assert.match(seedSql, /EXPECTED_SEEDED_MEMBERS\s*=\s*154/, 'Seed must declare exactly 154 source membership rows');
assert.match(seedSql, /EXPECTED_SEEDED_TEACHERS\s*=\s*52/, 'Seed must declare exactly 52 teacher-class assignments');
assert.match(seedSql, /grade_level\s+not\s+in\s*\(\s*'10'\s*,\s*'11'\s*,\s*'12'\s*\)/i, 'Migration must guard against seeding any grade outside 10–12');
assert.doesNotMatch(seedSql, /hsg-2026-(?:toan|ngu-van|vat-li|hoa-hoc|sinh-hoc|tieng-anh|lich-su|dia-li)-(?:6|7|8|9)(?:\D|$)/, 'Seed source keys must never include grades 6–9');
assert.match(seedSql, /Bồi dưỡng Địa lí 11/, 'Geography 11 class must be created even though the student source has no Geography roster');
assert.match(seedSql, /Bồi dưỡng Địa lí 12/, 'Geography 12 class must be created even though the student source has no Geography roster');
const blankRowGuards = seedSql.match(/if\s+trim\(v_line\)\s*=\s*''\s+then\s+continue;\s+end\s+if;/gi) || [];
assert.ok(blankRowGuards.length >= 3, 'Every multiline seed loop must skip its leading/trailing blank rows before string_to_array parsing');

// Regression contract: teacher choices must come from the supplied 2026–2027 assignment sheet,
// never from the set of accounts registered on the website. Multi-teacher classes must stay multi-teacher.
assert.ok(teacherCatalogSource, 'A checked-in authoritative 2026–2027 teacher catalog must exist');
assert.doesNotMatch(attendance, /bes_extra_attendance_list_teachers/, 'Class management must not load teacher choices from registered website accounts');
assert.doesNotMatch(attendanceAdmin, /bes_extra_attendance_list_teachers/, 'Manual class creation must not load teacher choices from registered website accounts');
assert.match(attendance, /giftedTeacherCatalog2026/, 'Class management must use the authoritative teacher assignment catalog');
assert.match(attendanceAdmin, /giftedTeacherCatalog2026/, 'Manual class creation must use the authoritative teacher assignment catalog');

const teacherCatalog = await import('../src/utils/giftedTeacherCatalog2026.js');
assert.equal(teacherCatalog.GIFTED_TEACHER_ASSIGNMENTS_2026_2027.length, 23, 'Teacher catalog must contain exactly the 23 grade 10–12 source classes');
assert.equal(
  teacherCatalog.GIFTED_TEACHER_ASSIGNMENTS_2026_2027.reduce((total, item) => total + item.teachers.length, 0),
  52,
  'Teacher catalog must preserve all 52 class-teacher assignments from the source sheet',
);
assert.ok(teacherCatalog.GIFTED_TEACHER_ASSIGNMENTS_2026_2027.every((item) => ['10', '11', '12'].includes(item.gradeLevel)), 'Teacher catalog must contain only grades 10–12');
assert.deepEqual(
  teacherCatalog.teachersForGiftedAssignment({ subject: 'Tiếng Anh', gradeLevel: '10' }),
  ['Ngô Thị Mỹ Diệp', 'Nguyễn Thị Mỹ Duyên'],
  'English 10 must use both teachers from the source sheet',
);
assert.deepEqual(
  teacherCatalog.teachersForGiftedAssignment({ subject: 'Tiếng Anh', gradeLevel: '11' }),
  ['Nguyễn Đặng Minh Hoa', 'Đào Ngọc Nhã'],
  'English 11 must use both teachers from the source sheet',
);
assert.deepEqual(
  teacherCatalog.teachersForGiftedAssignment({ subject: 'Toán', gradeLevel: '12' }),
  ['Trần Nguyên Dự', 'Nguyễn Văn Minh'],
  'Math 12 must preserve its two-teacher assignment',
);
assert.deepEqual(
  teacherCatalog.teachersForGiftedAssignment({ sourceKey: 'hsg-2026-vat-li-11' }),
  ['Trương Thị Thanh Tuyền', 'Nguyễn Hoàng Thúy Vy', 'Lê Thị Tú', 'Lê Thị Mỹ Thẩm'],
  'Physics 11 must preserve all four assigned teachers',
);

const mod = await import('../src/utils/extraClassAttendance.js');
assert.equal(mod.normalizeExtraClassType('Phụ đạo'), 'remedial');
assert.equal(mod.normalizeExtraClassType('Bồi dưỡng HSG'), 'gifted');
const draft = mod.buildAttendanceDraft([
  { id: 'm1', member_key: 'a', full_name: 'A' },
  { id: 'm2', member_key: 'b', full_name: 'B' },
]);
assert.deepEqual(mod.attendanceSummary(draft), { total: 2, present: 2, absent: 0 });
const absentDraft = draft.map((item) => item.member_key === 'b' ? { ...item, present: false } : item);
assert.deepEqual(mod.attendanceSummary(absentDraft), { total: 2, present: 1, absent: 1 });

console.log('Extra class attendance contract OK');