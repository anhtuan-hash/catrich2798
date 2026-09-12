import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const mustExist = (relativePath) => {
  assert.ok(exists(relativePath), `Missing required file: ${relativePath}`);
  return read(relativePath);
};

const managerUuid = '4c89bfa1-9e3f-4965-a082-99f6e974f5ba';
const ui = read('src/supplementalLearningBootstrap.js');
const api = read('src/attendance/supplementalLearningApi.js');
const quick = read('src/supplementalAttendanceQuickBootstrap.js');
const reporting = read('src/supplementalAttendanceReportingBootstrap.js');
const route = read('src/supplementalLearningRouteBootstrap.js');
const access = mustExist('src/supplementalAccess.js');
const migration = mustExist('supabase/migrations/20260911150000_supplemental_classes_simplification.sql');
const authHardening = mustExist('supabase/migrations/20260911151000_supplemental_classes_authorization_hardening.sql');

assert.match(ui, /Lớp học bổ sung/, 'The management UI must be class-centric.');
for (const forbidden of ['Nhóm dài ngày', 'Buổi phát sinh', 'Liên kết với học sinh chính thức']) {
  assert.ok(!ui.includes(forbidden), `Legacy UI label must be removed: ${forbidden}`);
  assert.ok(!reporting.includes(forbidden), `Legacy reporting label must be removed: ${forbidden}`);
}
assert.ok(!ui.includes('data-form="official-student"'), 'The new UI must not expose the global official-student registry form.');
assert.ok(!ui.includes('data-form="adhoc-session"'), 'The new UI must not expose adhoc-session creation.');
assert.ok(!ui.includes('data-action="link"'), 'The new UI must not expose official-student linking.');

const statusAction = ui.match(/async function changeMemberStatus\([^)]*\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert.ok(statusAction, 'Member status action must exist.');
assert.match(statusAction, /setSupplementalClassMemberStatus/, 'Member status action must call the server-authoritative status RPC.');
assert.doesNotMatch(statusAction, /window\.confirm/, 'Đang học/Ngừng học toggles must not be blocked behind a browser-native confirm dialog.');
assert.match(ui, /data-action="member-status"/, 'Member rows must expose the status action control.');
assert.match(ui, /changeMemberStatus\(selected\.id, button\.dataset\.student, button\.dataset\.active === 'true'\)/, 'Member status controls must be wired directly to changeMemberStatus.');

assert.match(ui, /read-excel-file\/browser/, 'Học bổ sung must support the same fast Excel roster workflow as the other attendance classes.');
assert.match(ui, /data-import-members/, 'An existing supplemental class must expose a file input for fast student import.');
assert.match(ui, /async function importMembersFromFile/, 'Supplemental class management must implement a dedicated member import flow.');
assert.match(ui, /upsertSupplementalClassMember\(client,[\s\S]{0,500}groupId: classId/, 'Imported students must stay in the Học bổ sung backend/domain.');
assert.match(ui, /importMembersFromFile\(event\.target\.files\?\.\[0\], selected\.id\)/, 'The selected supplemental class must receive the uploaded roster.');

assert.ok(access.includes(managerUuid), 'The frontend visibility guard must use the stable Hồng Thắm profile UUID.');
assert.match(access, /approved/, 'The frontend visibility guard must require an approved profile.');
assert.match(access, /admin|administrator/, 'The frontend visibility guard must allow approved Admins.');
for (const entry of [ui, reporting, route]) {
  assert.match(entry, /supplementalAccess|canManageSupplementalLearning/, 'Every active supplemental management/reporting/route entry point must use the dedicated access guard.');
}
assert.doesNotMatch(quick, /addEventListener|createElement|role="dialog"/, 'The retired quick bootstrap must remain an inert compatibility stub; native React rollcall owns authorization and UI.');
const reportingImport = route.indexOf("import('./supplementalAttendanceReportingBootstrap.js')");
const routeGuard = route.indexOf('canManageSupplementalLearning');
assert.ok(routeGuard >= 0 && reportingImport > routeGuard, 'Reporting must only be dynamically loaded behind the strict supplemental route guard.');
assert.match(reporting, /if \(!canManage\(\)\)/, 'Reporting must clear/deny its UI after runtime access is lost.');

for (const rpcName of [
  'bes_list_supplemental_classes',
  'bes_upsert_supplemental_class',
  'bes_archive_supplemental_class',
  'bes_upsert_supplemental_class_member',
  'bes_set_supplemental_class_member_status',
  'bes_set_supplemental_class_teachers',
]) {
  assert.ok(api.includes(rpcName), `Class-centric API wrapper missing RPC: ${rpcName}`);
  assert.ok(migration.includes(rpcName), `Migration missing RPC: ${rpcName}`);
}

assert.ok(migration.includes('bes_supplemental_group_teachers'), 'Migration must add normalized multi-teacher metadata.');
assert.ok(migration.includes('archived_at') && migration.includes('archived_by'), 'Migration must add archive audit fields.');
assert.ok(migration.includes('bes_require_supplemental_manager'), 'Migration must define the strict supplemental manager guard.');
assert.ok(migration.includes(managerUuid), 'Backend guard must use the stable Hồng Thắm profile UUID.');
assert.match(migration, /42501/, 'Permission denial should use SQLSTATE 42501.');

const strictGuardStart = migration.indexOf('bes_require_supplemental_manager');
assert.ok(strictGuardStart >= 0, 'Strict supplemental guard must exist.');
const strictGuardSlice = migration.slice(strictGuardStart, strictGuardStart + 5000);
for (const genericPermission of ['route:attendance', 'attendance:quick', 'attendance:manage', 'attendance:history', 'attendance:report']) {
  assert.ok(!strictGuardSlice.includes(genericPermission), `Strict supplemental guard must not authorize generic permission ${genericPermission}`);
}

assert.match(migration, /bes_require_supplemental_admin[\s\S]*bes_require_supplemental_manager/, 'Legacy supplemental admin guard must delegate to the strict manager rule.');
assert.match(migration, /bes_require_supplemental_reader[\s\S]*bes_require_supplemental_manager/, 'Legacy supplemental reader guard must delegate to the strict manager rule.');
assert.match(authHardening, /bes_supplemental_sessions[\s\S]*perform private\.bes_require_supplemental_manager\(\)/, 'Direct begin/confirm attendance access must raise through the strict supplemental manager guard.');
assert.ok(!authHardening.includes("return jsonb_build_object('allowed', false, 'reason', 'supplemental_not_allowed')"), 'Unauthorized supplemental attendance must not degrade to a generic boolean denial.');

console.log('supplemental classes simplification contract: PASS');
