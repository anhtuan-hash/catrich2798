import assert from 'node:assert/strict';
import fs from 'node:fs';

const classroom = fs.readFileSync('supabase/public_rate_limits_and_classroom_hardening_v11_9_2.sql','utf8');
const homeroom = fs.readFileSync('supabase/homeroom_public_portal_hardening_v11_9_2.sql','utf8');
const observability = fs.readFileSync('supabase/production_runtime_observability_v11_9_2.sql','utf8');
const backup = fs.readFileSync('supabase/backup_restore_certification_hardening_v11_9_2.sql','utf8');
const telemetry = fs.readFileSync('src/utils/clientErrorTelemetry.js','utf8');
const diagnostics = fs.readFileSync('src/utils/runtimeDiagnostics.js','utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json','utf8'));

for (const token of [
  'app_public_rate_limit_allow',
  "'classroom_join'",
  "'classroom_submit'",
  "current_item_id<>left(coalesce(p_item_id,''),160)",
  "- 'correctAnswer'",
  "pg_column_size(p_response)>65536",
]) assert.ok(classroom.includes(token), 'Classroom hardening missing: '+token);

for (const token of [
  "trg_bes_homeroom_hash_legacy_pins",
  ") - 'pins'",
  "'homeroom_portal_get'",
  "'homeroom_subject_feedback'",
  "v_expected_hash<>v_hash",
  "extensions.digest",
]) assert.ok(homeroom.includes(token), 'Homeroom hardening missing: '+token);

assert.ok(!homeroom.includes("v_legacy"), 'Homeroom public auth must not retain plaintext PIN fallback.');

for (const token of [
  'create table if not exists public.app_runtime_errors',
  'app_report_runtime_error',
  'app_runtime_error_summary',
  'app_purge_runtime_errors',
]) assert.ok(observability.includes(token), 'Production observability missing: '+token);

for (const token of [
  "'creating'",
  "application_version','11.9.2'",
  'assessment_practice_responses',
  'c.contype=\'p\'',
  'on conflict (%3$s) do update',
]) assert.ok(backup.includes(token), 'Backup/restore certification missing: '+token);

assert.ok(telemetry.includes("client.rpc('app_report_runtime_error'"), 'Browser errors must persist to authenticated runtime telemetry.');
assert.ok(diagnostics.includes('reportRuntimeErrorRemote(record)'), 'React render errors must persist to runtime telemetry.');
assert.ok(!diagnostics.includes('installGlobalRuntimeDiagnostics'), 'Duplicate global telemetry listener must stay removed.');

const securityHeaders = (vercel.headers || []).find((entry) => entry.source === '/(.*)')?.headers || [];
assert.ok(securityHeaders.some((h) => h.key === 'Content-Security-Policy'), 'CSP must be enforced.');
assert.ok(!securityHeaders.some((h) => h.key === 'Content-Security-Policy-Report-Only'), 'Report-only CSP must be retired.');
const assets = (vercel.headers || []).find((entry) => entry.source === '/assets/(.*)');
assert.equal(assets?.headers?.[0]?.value, 'public, max-age=31536000, immutable', 'Hashed assets must be immutable.');

console.log('PASS: Brian v11.9.2 production certification contracts are present.');
