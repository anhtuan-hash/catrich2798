import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/supplementalLearningBootstrap.js', import.meta.url), 'utf8');
const access = await readFile(new URL('../src/supplementalAccess.js', import.meta.url), 'utf8');
const api = await readFile(new URL('../src/attendance/supplementalLearningApi.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../src/supplementalSingleModalBridge.js', import.meta.url), 'utf8');
const css = [
  await readFile(new URL('../src/styles/SupplementalLearning.css', import.meta.url), 'utf8'),
  await readFile(new URL('../src/styles/SupplementalLearningAdminCompleteness.css', import.meta.url), 'utf8'),
  await readFile(new URL('../src/styles/SupplementalSingleModal.css', import.meta.url), 'utf8'),
  await readFile(new URL('../src/styles/SupplementalClasses.css', import.meta.url), 'utf8'),
].join('\n');

assert.match(source, /canManageSupplementalLearning/, 'supplemental management must use the dedicated access guard');
assert.match(access, /approved/, 'supplemental visibility must require an approved profile');
assert.match(access, /admin|administrator/, 'approved Admins must be allowed');
assert.match(access, /4c89bfa1-9e3f-4965-a082-99f6e974f5ba/i, 'the approved Hồng Thắm profile must be explicitly allowed');

for (const label of [
  'Lớp học bổ sung', 'Tạo lớp học bổ sung', 'Quản lý', 'Điểm danh', 'Lịch sử', 'Xóa lớp',
  'Thông tin lớp', 'Giáo viên phụ trách', 'Học sinh', 'Đang học', 'Ngừng học',
]) assert.ok(source.includes(label), `missing class-centric UI contract: ${label}`);

for (const forbidden of ['Tạo nhóm học bổ sung', 'Tạo buổi phát sinh', 'Liên kết với học sinh chính thức', 'Nhóm dài ngày', 'Buổi phát sinh']) {
  assert.ok(!source.includes(forbidden), `legacy supplemental concept must not remain in the management UI: ${forbidden}`);
}

for (const call of [
  'loadSupplementalClasses', 'upsertSupplementalClass', 'archiveSupplementalClass',
  'upsertSupplementalClassMember', 'setSupplementalClassMemberStatus',
]) assert.ok(source.includes(call), `missing class management action: ${call}`);

for (const rpc of [
  'bes_list_supplemental_classes', 'bes_upsert_supplemental_class', 'bes_archive_supplemental_class',
  'bes_upsert_supplemental_class_member', 'bes_set_supplemental_class_member_status', 'bes_set_supplemental_class_teachers',
]) assert.ok(api.includes(rpc), `missing class-centric RPC wrapper: ${rpc}`);

assert.match(source, /data-class-search/, 'class workspace must provide practical class search');
assert.match(source, /placeholder="Tên lớp, môn, giáo viên, học sinh"/);
assert.match(source, /data-form="class"/);
assert.match(source, /data-form="add-member"/);
assert.match(source, /data-form="edit-member"/);
assert.match(source, /data-action="member-status"/);
assert.match(source, /data-add-teacher/);
assert.match(source, /data-remove-teacher/);
assert.doesNotMatch(source, /data-form="adhoc-session"|data-link-official|officialParticipantKey/);
assert.doesNotMatch(source, /Giám thị\s*[123]?/i);

// Single-modal runtime contract. The bridge embeds the management surface into
// the already-open Attendance content and removes legacy overlay semantics.
for (const token of ['bes-supplemental-learning-admin', 'attendance-shell', 'attendance-content', 'moveIntoAttendanceContent', 'bes-supplemental-admin-workspace']) {
  assert.ok(bridge.includes(token), `single-modal bridge missing ${token}`);
}
assert.match(bridge, /querySelectorAll\('\.bes-supplemental-backdrop'\)[\s\S]*?\.remove\(\)/, 'bridge must remove supplemental backdrops');
assert.match(bridge, /removeAttribute\('role'\)/, 'bridge must strip nested dialog semantics');
assert.match(bridge, /removeAttribute\('aria-modal'\)/, 'bridge must strip nested aria-modal semantics');
assert.match(css, /\.attendance-content\.bes-supplemental-workspace-active/);
assert.match(css, /\.bes-supplemental-workspace-host/);
assert.match(css, /\.bes-supplemental-backdrop\s*\{display:none!important\}/, 'legacy supplemental backdrops must never paint');
assert.match(css, /bes-supplemental-admin-workspace[\s\S]*?position:relative!important/, 'Admin surface must become inline, not fixed');
assert.match(css, /@media\(max-width:560px\)/);

console.log('supplemental learning admin UI contract: ok');
