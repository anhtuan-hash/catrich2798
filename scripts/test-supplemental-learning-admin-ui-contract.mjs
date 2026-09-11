import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/supplementalLearningBootstrap.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/SupplementalLearning.css', import.meta.url), 'utf8');

assert.match(source, /SYSTEM_ROLES\.ADMIN/, 'supplemental management must be Admin-only');
for (const label of [
  'Học bổ sung',
  'Tạo nhóm học bổ sung',
  'Tạo buổi phát sinh',
  'Thêm học sinh thủ công',
  'Liên kết với học sinh chính thức',
  'Ngừng tham gia từ ngày nào?',
  'Sửa nhóm',
  'Dừng nhóm',
  'Sửa buổi',
  'Ghi chú buổi học',
]) assert.ok(source.includes(label), `missing UI contract: ${label}`);

for (const call of [
  'loadSupplementalAdminData',
  'upsertSupplementalStudent',
  'upsertSupplementalGroup',
  'setSupplementalMembership',
  'upsertSupplementalSession',
  'linkSupplementalStudent',
  'cancelSupplementalSession',
]) assert.ok(source.includes(call), `missing admin action: ${call}`);

assert.match(source, /Tìm nhóm, học sinh, môn, giáo viên, ngày, trạng thái/i, 'Admin workspace must provide one practical global search');
assert.match(source, /data-form="edit-group"/, 'Admin must be able to edit recurring group metadata/schedule');
assert.match(source, /data-form="edit-session"/, 'Admin must be able to edit an unfrozen ad-hoc session');
assert.match(source, /data-action="toggle-student"/, 'Admin must be able to deactivate/reactivate reusable student identities');
assert.match(source, /name="initialStudentId"/, 'Recurring group creation must support an initial student roster');
assert.match(source, /name="officialParticipantKey"/, 'Group/session student picker must be able to choose official students directly');
assert.match(source, /data-student-search/, 'Large student pickers need in-place search');
assert.match(source, /data-link-official/, 'Manual identity linking must use an explicit official-student picker');
assert.doesNotMatch(source, /window\.prompt\([^)]*Liên kết với học sinh chính thức/is, 'Official linking must not depend on a free-text prompt');
assert.doesNotMatch(source, /Giám thị\s*[123]?/i, 'must not hardcode proctor roles/accounts');

assert.match(css, /\.bes-supplemental-dialog/);
assert.match(css, /\.bes-supplemental-admin-search/);
assert.match(css, /\.bes-supplemental-edit-form/);
assert.match(css, /@media\(max-width:560px\)/);

console.log('supplemental learning admin UI contract: ok');
