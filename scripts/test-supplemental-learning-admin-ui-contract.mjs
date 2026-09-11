import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/supplementalLearningBootstrap.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../src/supplementalSingleModalBridge.js', import.meta.url), 'utf8');
const css = [
  await readFile(new URL('../src/styles/SupplementalLearning.css', import.meta.url), 'utf8'),
  await readFile(new URL('../src/styles/SupplementalLearningAdminCompleteness.css', import.meta.url), 'utf8'),
  await readFile(new URL('../src/styles/SupplementalSingleModal.css', import.meta.url), 'utf8'),
].join('\n');

assert.match(source, /SYSTEM_ROLES\.ADMIN/, 'supplemental management must be Admin-only');
for (const label of [
  'Học bổ sung','Tạo nhóm học bổ sung','Tạo buổi phát sinh','Thêm học sinh thủ công',
  'Liên kết với học sinh chính thức','Ngừng tham gia từ ngày nào?','Sửa nhóm','Dừng nhóm','Sửa buổi','Ghi chú buổi học',
]) assert.ok(source.includes(label), `missing UI contract: ${label}`);
for (const call of ['loadSupplementalAdminData','upsertSupplementalStudent','upsertSupplementalGroup','setSupplementalMembership','upsertSupplementalSession','linkSupplementalStudent','cancelSupplementalSession']) {
  assert.ok(source.includes(call), `missing admin action: ${call}`);
}
assert.match(source, /Tìm nhóm, học sinh, môn, giáo viên, ngày, trạng thái/i, 'Admin workspace must provide one practical global search');
assert.match(source, /data-form="edit-group"/);
assert.match(source, /data-form="edit-session"/);
assert.match(source, /data-action="toggle-student"/);
assert.match(source, /pickerItems\('initialStudentId'\)|name="initialStudentId"/);
assert.match(source, /name="officialParticipantKey"/);
assert.match(source, /data-student-search/);
assert.match(source, /data-link-official/);
assert.doesNotMatch(source, /window\.prompt\([^)]*Liên kết với học sinh chính thức/is);
assert.doesNotMatch(source, /Giám thị\s*[123]?/i);

// Single-modal runtime contract. Legacy bootstraps may still create their host, but the bridge must
// normalize it before paint into the already-open native Attendance content surface.
for (const token of ['bes-supplemental-learning-admin','attendance-shell','attendance-content','moveIntoAttendanceContent','bes-supplemental-admin-workspace']) {
  assert.ok(bridge.includes(token), `single-modal bridge missing ${token}`);
}
assert.match(bridge, /querySelectorAll\('\.bes-supplemental-backdrop'\)[\s\S]*?\.remove\(\)/, 'bridge must remove supplemental backdrops');
assert.match(bridge, /removeAttribute\('role'\)/, 'bridge must strip nested dialog semantics');
assert.match(bridge, /removeAttribute\('aria-modal'\)/, 'bridge must strip nested aria-modal semantics');
assert.match(css, /\.attendance-content\.bes-supplemental-workspace-active/);
assert.match(css, /\.bes-supplemental-workspace-host/);
assert.match(css, /\.bes-supplemental-backdrop\s*\{display:none!important\}/, 'legacy supplemental backdrops must never paint');
assert.match(css, /bes-supplemental-admin-workspace[\s\S]*?position:relative!important/, 'Admin surface must become inline, not fixed');
assert.match(css, /\.bes-supplemental-admin-search/);
assert.match(css, /\.bes-supplemental-edit-form/);
assert.match(css, /@media\(max-width:560px\)/);

console.log('supplemental learning admin UI contract: ok');