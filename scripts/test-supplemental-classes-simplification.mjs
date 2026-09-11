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
const route = read('src/supplementalLearningRouteBootstrap.js');
const access = mustExist('src/supplementalAccess.js');
const migration = mustExist('supabase/migrations/20260911150000_supplemental_classes_simplification.sql');

assert.match(ui, /Lớp học bổ sung/, 'The management UI must be class-centric.');
for (const forbidden of ['Nhóm dài ngày', 'Buổi phát sinh', 'Liên kết với học sinh chính thức']) {
  assert.ok(!ui.includes(forbidden), `Legacy UI label must be removed: ${forbidden}`);
}
assert.ok(!ui.includes('data-form="official-student"'), 'The new UI must not expose the global official-student registry form.');
assert.ok(!ui.includes('data-form="adhoc-session"'), 'The new UI must not expose adhoc-session creation.');
assert.ok(!ui.includes('data-action="link"'), 'The new UI must not expose official-student linking.');

assert.ok(access.includes(managerUuid), 'The frontend visibility guard must use the stable Hồng Thắm profile UUID.');
assert.match(access, /approved/, 'The frontend visibility guard must require an approved profile.');
assert.match(access, /admin|administrator/, 'The frontend visibility guard must allow approved Admins.');
for (const entry of [ui, quick, route]) {
  assert.match(entry, /supplementalAccess|canManageSupplementalLearning/, 'Supplemental management/rollcall/route entry points must use the dedicated access guard.');
}
const reportingImport = route.indexOf("import('./supplementalAttendanceReportingBootstrap.js')");
const routeGuard = route.indexOf('canManageSupplementalLearning');
assert.ok(routeGuard >= 0 && reportingImport > routeGuard, 'Reporting must only be dynamically loaded behind the strict supplemental route guard.');

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

console.log('supplemental classes simplification contract: PASS');
