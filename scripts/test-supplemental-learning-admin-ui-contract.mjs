import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/supplementalLearningBootstrap.js', import.meta.url), 'utf8');
const workspaceSource = await readFile(new URL('../src/attendance/supplementalWorkspace.js', import.meta.url), 'utf8').catch(() => '');
const supplementalCss = await readFile(new URL('../src/styles/SupplementalLearning.css', import.meta.url), 'utf8');
const css = [
  supplementalCss,
  await readFile(new URL('../src/styles/SupplementalLearningAdminCompleteness.css', import.meta.url), 'utf8'),
].join('\n');

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
assert.match(source, /pickerItems\('initialStudentId'\)|name="initialStudentId"/, 'Recurring group creation must support an initial student roster');
assert.match(source, /name="officialParticipantKey"/, 'Group/session student picker must be able to choose official students directly');
assert.match(source, /data-student-search/, 'Large student pickers need in-place search');
assert.match(source, /data-link-official/, 'Manual identity linking must use an explicit official-student picker');
assert.doesNotMatch(source, /window\.prompt\([^)]*Liên kết với học sinh chính thức/is, 'Official linking must not depend on a free-text prompt');
assert.doesNotMatch(source, /Giám thị\s*[123]?/i, 'must not hardcode proctor roles/accounts');

// Single-modal contract: supplemental Admin is a workspace inside the native Attendance content,
// never a second body-level dialog/backdrop stacked above it.
assert.match(source, /mountSupplementalWorkspace/, 'Admin must mount through the shared Attendance workspace helper');
assert.match(workspaceSource, /\.attendance-shell\s+\.attendance-content|attendance-content/, 'workspace helper must target the native Attendance content region');
assert.doesNotMatch(source, /document\.body\.append\(host\)/, 'Admin must not append a second popup host to document.body');
assert.doesNotMatch(source, /bes-supplemental-backdrop/, 'Admin must not render a second backdrop');
assert.doesNotMatch(source, /role="dialog"|aria-modal="true"/, 'Admin workspace must not declare a nested modal dialog');
assert.match(source, /bes-supplemental-admin-workspace/, 'Admin must expose an embedded workspace class');
assert.match(css, /\.bes-supplemental-workspace/);
assert.match(css, /\.attendance-content\.bes-supplemental-workspace-active/);
assert.doesNotMatch(css, /\.bes-supplemental-dialog\s*\{[^}]*position\s*:\s*fixed/i, 'Admin styling must not recreate the old fixed popup');
assert.match(css, /\.bes-supplemental-admin-search/);
assert.match(css, /\.bes-supplemental-edit-form/);
assert.match(css, /@media\(max-width:560px\)/);

console.log('supplemental learning admin UI contract: ok');