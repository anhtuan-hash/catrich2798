import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/canonical_leader_guards_v11_9_5.sql','utf8');

assert.match(sql, /create or replace function private\.bes_is_app_leader/i, 'Canonical private leader helper must exist.');
assert.match(sql, /public\.system_roles/i, 'Canonical leader helper must consult system_roles.');
assert.match(sql, /public\.profiles/i, 'Canonical leader helper must consult approved profiles.');
assert.match(sql, /p\.approved\s*=\s*true/i, 'Profile fallback must require approval.');
assert.doesNotMatch(sql, /anhtuan@pek\.edu\.vn/i, 'Leader authorization must not hardcode an Admin email.');
assert.doesNotMatch(sql, /hongtham@accounts\.brianenglish\.studio/i, 'Leader authorization must not hardcode a manager email.');
assert.doesNotMatch(sql, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, 'Leader authorization must not hardcode privileged UUIDs.');

for (const fn of [
  'bes_v1093_is_leader',
  'bes_v1094_is_leader',
  'bes_v1096_is_leader',
  'bes_v1097_is_leader',
  'bes_v1098_is_leader',
  'knowledge_is_leader',
  'resource_is_leader',
  'thpt_practice_is_manager',
  'work_hub_is_leader',
  'bes_v1237_is_ai_admin',
]) {
  assert.ok(sql.includes('create or replace function public.' + fn), fn + ' must remain as a compatibility wrapper.');
}

const delegateCount = (sql.match(/private\.bes_is_app_leader\(/g) || []).length;
assert.ok(delegateCount >= 10, 'All legacy leader helpers must delegate to the canonical helper.');
assert.match(sql, /revoke all on function private\.bes_is_app_leader\(uuid\) from public, anon, authenticated/i, 'Canonical private helper must not be a client RPC.');
assert.match(sql, /grant execute on function private\.bes_is_app_leader\(uuid\) to service_role/i, 'Service role must retain internal execution.');
assert.match(sql, /grant execute on function %s to authenticated, service_role/i, 'Legacy RLS compatibility guards must remain executable by authenticated users.');

console.log('PASS: Brian v11.9.5 canonical leader guards are identity-neutral and permission-safe.');
