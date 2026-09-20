import assert from 'node:assert/strict';
import fs from 'node:fs';

const access = fs.readFileSync('src/supplementalAccess.js','utf8');
const sql = fs.readFileSync('supabase/permission_driven_attendance_access_v11_9_4.sql','utf8');
const adminUiContract = fs.readFileSync('scripts/test-supplemental-learning-admin-ui-contract.mjs','utf8');

assert.ok(access.includes("attendance:manage"), 'Supplemental UI must require attendance:manage.');
assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(access), 'Supplemental UI must not hardcode privileged profile IDs.');
assert.ok(sql.includes("permissions -> 'allowed'"), 'Backend permission lookup missing.');
assert.ok(sql.includes("? 'attendance:manage'"), 'Backend supplemental manager permission missing.');
assert.ok(sql.includes("? 'attendance:delete'"), 'Attendance delete permission missing.');
assert.ok(!sql.includes('hongtham@accounts.brianenglish.studio'), 'Attendance delete authorization must not hardcode an email.');
assert.ok(!sql.includes('4c89bfa1-9e3f-4965-a082-99f6e974f5ba'), 'Supplemental authorization must not hardcode a profile ID.');
assert.ok(sql.includes('revoke execute on function private.bes_is_supplemental_manager() from authenticated'), 'Private supplemental helper must not remain directly executable by authenticated clients.');
assert.ok(sql.includes('revoke execute on function private.bes_require_supplemental_manager() from authenticated'), 'Private supplemental manager guard must not be client RPC surface.');
assert.ok(sql.includes('revoke execute on function private.bes_require_supplemental_admin() from authenticated'), 'Private supplemental admin guard must not be client RPC surface.');
assert.ok(adminUiContract.includes('attendance:manage'), 'Existing supplemental UI contract must be aligned to permissions.');
assert.ok(!adminUiContract.includes('the approved Hồng Thắm profile must be explicitly allowed'), 'Legacy identity-specific contract must be removed.');

console.log('PASS: Brian v11.9.4 permission-driven attendance access contract is present.');
