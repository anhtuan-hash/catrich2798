import assert from 'node:assert/strict';
import fs from 'node:fs';

const permissionUrl = new URL('../src/utils/permissions.js', import.meta.url);
const qbUrl = new URL('../src/pages/QuestionBank.jsx', import.meta.url);
const handlerUrl = new URL('../serverless-handlers/_question-bank.js', import.meta.url);
const migrationUrl = new URL('../supabase/question_bank_shared_readonly_access_v11_9_6.sql', import.meta.url);

assert.ok(fs.existsSync(migrationUrl), 'Shared Question Bank access migration must exist.');

const permissions = await import(permissionUrl);
const {
  ASSESSMENT_PERMISSION_GROUP,
  ROUTE_PERMISSION_IDS,
  createAllAccessPermissions,
  hasPermissionId,
  hasRouteAccess,
} = permissions;

assert.deepEqual(ASSESSMENT_PERMISSION_GROUP.ids, [ROUTE_PERMISSION_IDS['assessment-core']]);
assert.equal(
  createAllAccessPermissions().allowed.includes(ROUTE_PERMISSION_IDS['assessment-core']),
  false,
  'Full teacher mode must not implicitly grant Assessment Core.',
);

const teacherDenied = {
  id: 'teacher-denied',
  role: 'teacher',
  permissions: createAllAccessPermissions(),
};
assert.equal(hasPermissionId(teacherDenied, ROUTE_PERMISSION_IDS['assessment-core']), false);
assert.equal(hasRouteAccess(teacherDenied, 'assessment-core'), false);

const teacherGranted = {
  ...teacherDenied,
  id: 'teacher-granted',
  permissions: createAllAccessPermissions([ROUTE_PERMISSION_IDS['assessment-core']]),
};
assert.equal(hasPermissionId(teacherGranted, ROUTE_PERMISSION_IDS['assessment-core']), true);
assert.equal(hasRouteAccess(teacherGranted, 'assessment-core'), true);

const leader = {
  id: 'leader',
  role: 'department_head',
  permissions: createAllAccessPermissions(),
};
assert.equal(hasRouteAccess(leader, 'assessment-core'), true, 'TTCM must retain Assessment Core access.');

const qb = fs.readFileSync(qbUrl, 'utf8');
for (const token of [
  "qb_access_state",
  "qb_list_access_users",
  "qb_set_user_access",
  "fetchAllAccessibleRows",
  "qb-readonly-banner",
  "Chế độ giáo viên · chỉ sử dụng",
  "accessState.can_contribute && showNew",
  "accessState.can_contribute && activeTab === 'manage'",
]) assert.ok(qb.includes(token), 'Question Bank shared-access UI missing: ' + token);

assert.match(
  qb,
  /return TABS\.filter\(\(\[id\]\) => \['questions', 'bundles', 'builder', 'tests'\]\.includes\(id\)\)/,
  'Read-only teachers must only receive use-oriented tabs.',
);

const handler = fs.readFileSync(handlerUrl, 'utf8');
assert.ok(handler.includes('qb_can_contribute_assessment_for_user'));
assert.ok(handler.includes("action === 'save_questions' || action === 'save_exam'"));
assert.match(handler, /read-only Assessment Core access/i);

const sql = fs.readFileSync(migrationUrl, 'utf8');
for (const token of [
  'create or replace function public.qb_can_use_assessment()',
  'create or replace function public.qb_access_state()',
  'create or replace function public.qb_list_access_users()',
  'create or replace function public.qb_set_user_access',
  'route:assessment-core',
  'qb_can_read_shared_assessment_owner',
  'assessment_items_insert_v1093',
  'assessment_bundles_insert_brian_qb',
]) assert.ok(sql.includes(token), 'Shared-access migration missing: ' + token);

assert.match(
  sql,
  /assessment_items[\s\S]*for insert[\s\S]*bes_v1093_is_leader/i,
  'Only leaders may insert Question Bank items.',
);
assert.match(
  sql,
  /assessment_bundles[\s\S]*for insert[\s\S]*bes_v1093_is_leader/i,
  'Only leaders may insert Question Bank bundles.',
);

console.log('PASS: Assessment Core explicit sharing + teacher read-only bank access contract.');
