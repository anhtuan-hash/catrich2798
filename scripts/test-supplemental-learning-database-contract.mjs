import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase/migrations/20260911_supplemental_learning_attendance.sql');
const proofMigrationPath = path.join(root, 'supabase/migrations/20260911_supplemental_learning_proof_access.sql');
const proofAttachPath = path.join(root, 'supabase/migrations/20260911_supplemental_learning_proof_attach.sql');
const activityTypeFixPath = path.join(root, 'supabase/migrations/20260911_supplemental_learning_activity_type_fix.sql');
assert.ok(fs.existsSync(migrationPath), 'supplemental learning migration must exist');
assert.ok(fs.existsSync(proofMigrationPath), 'supplemental proof-access migration must exist');
assert.ok(fs.existsSync(proofAttachPath), 'supplemental proof-attach migration must exist');
assert.ok(fs.existsSync(activityTypeFixPath), 'supplemental activity-type forward migration must exist');
const sql = fs.readFileSync(migrationPath, 'utf8');
const proofSql = fs.readFileSync(proofMigrationPath, 'utf8');
const proofAttachSql = fs.readFileSync(proofAttachPath, 'utf8');
const activityTypeSql = fs.readFileSync(activityTypeFixPath, 'utf8');

for (const table of [
  'bes_supplemental_students',
  'bes_supplemental_groups',
  'bes_supplemental_group_memberships',
  'bes_supplemental_sessions',
  'bes_supplemental_session_participants',
]) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'), `${table} must be created`);
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `${table} must have RLS enabled`);
  assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, 'i'), `${table} must not expose direct authenticated writes`);
}

assert.match(sql, /source_type\s+text[\s\S]{0,240}official[\s\S]{0,80}manual/i, 'student source type must distinguish official/manual');
assert.match(sql, /linked_official_key/i, 'manual identity must support official linking');
assert.match(sql, /effective_from\s+date/i, 'membership must be effective-dated');
assert.match(sql, /effective_until\s+date/i, 'membership must support an effective stop date');
assert.match(sql, /kind\s+text[\s\S]{0,220}recurring[\s\S]{0,80}adhoc/i, 'session kind must support recurring and adhoc');
assert.match(sql, /status\s+text[\s\S]{0,360}scheduled[\s\S]{0,120}in_progress[\s\S]{0,120}confirmed[\s\S]{0,120}cancelled/i, 'session lifecycle must be explicit');
assert.match(sql, /roster_frozen_at/i, 'session must record roster freeze time');
assert.match(sql, /canonical_student_key/i, 'participant must snapshot canonical identity');
assert.match(sql, /student_code_snapshot/i, 'participant must snapshot the student code');
assert.match(sql, /full_name_snapshot/i, 'participant must snapshot the student name');
assert.match(sql, /school_class_snapshot/i, 'participant must snapshot the school class');
assert.match(sql, /unique\s*\(\s*session_id\s*,\s*canonical_student_key\s*\)/i, 'same canonical student must not appear twice in a session');

for (const rpc of [
  'bes_list_supplemental_admin_data',
  'bes_upsert_supplemental_student',
  'bes_link_supplemental_student',
  'bes_upsert_supplemental_group',
  'bes_set_supplemental_membership',
  'bes_upsert_supplemental_session',
  'bes_cancel_supplemental_session',
  'bes_list_supplemental_attendance',
  'bes_begin_supplemental_attendance',
  'bes_confirm_supplemental_attendance',
  'bes_list_attendance_activities',
  'bes_list_supplemental_history',
  'bes_supplemental_student_report',
]) {
  assert.match(sql, new RegExp(`create or replace function public\\.${rpc}`, 'i'), `${rpc} RPC must exist`);
}

assert.match(sql, /create or replace function private\.bes_require_supplemental_admin/i, 'server-side Admin guard must exist');
assert.match(sql, /lower\s*\(\s*coalesce\s*\(\s*v_profile\.role|lower\s*\(\s*coalesce\s*\(\s*p\.role/i, 'Admin guard must inspect approved profile role');
assert.match(sql, /public\.can_take_extra_class_attendance\s*\(\s*\)/i, 'attendance RPC must reuse global quick-attendance permission gate');
assert.match(sql, /private\.bes_attendance_access_decision/i, 'attendance RPC must reuse central Giờ GV decision');
assert.match(sql, /bes_supplemental_sessions[\s\S]{0,240}status\s*<>\s*'cancelled'/i, 'central time gate must recognize non-cancelled supplemental sessions');
assert.match(sql, /clock_timestamp\s*\(\s*\)/i, 'authoritative timestamps must come from PostgreSQL');
assert.match(sql, /status\s*=\s*'cancelled'/i, 'cancelled sessions must be rejected by attendance flow');
assert.match(sql, /checked_by\s*=\s*v_uid|auth\.uid\s*\(\s*\)/i, 'attendance actor must come from authenticated user');
assert.match(sql, /where\s+s\.attendance_date\s+between[\s\S]{0,220}s\.status\s*=\s*'confirmed'/i, 'student report denominator must be based only on confirmed sessions');
assert.doesNotMatch(sql, /insert\s+into\s+public\.bes_extra_/i, 'supplemental implementation must not write legacy extra-class tables');
assert.doesNotMatch(sql, /update\s+public\.bes_extra_/i, 'supplemental implementation must not rewrite legacy extra-class tables');
assert.doesNotMatch(sql, /delete\s+from\s+public\.bes_extra_/i, 'supplemental implementation must not delete legacy extra-class history');
assert.doesNotMatch(sql, /gi[aá]m\s*th[iị]\s*[123]?/i, 'supplemental authorization must not hardcode proctor accounts or roles');

assert.match(proofSql, /attendance-session-proofs/i, 'supplemental proof must use existing attendance proof bucket');
assert.match(proofSql, /bes_can_upload_supplemental_proof/i, 'supplemental proof upload authorization helper must exist');
assert.match(proofSql, /s\.checked_by\s*=\s*auth\.uid\s*\(\s*\)/i, 'only the confirming operator may upload a supplemental proof');
assert.match(proofSql, /bes_can_view_supplemental_proof/i, 'supplemental proof view authorization helper must exist');
assert.match(proofSql, /attendance:history/i, 'history permission must be able to view supplemental proof');
assert.match(proofSql, /attendance:report/i, 'report permission must be able to view supplemental proof');
assert.match(proofSql, /create policy[\s\S]*for insert[\s\S]*bes_can_upload_supplemental_proof/i, 'storage INSERT policy must be installed');
assert.match(proofSql, /create policy[\s\S]*for select[\s\S]*bes_can_view_supplemental_proof/i, 'storage SELECT policy must be installed');
assert.match(proofAttachSql, /create or replace function public\.bes_attach_supplemental_proof/i, 'proof attachment RPC must exist');
assert.match(proofAttachSql, /storage\.objects/i, 'proof attachment RPC must verify the object exists');
assert.match(proofAttachSql, /checked_by\s*<>\s*v_uid/i, 'proof attachment must remain owned by the confirming operator');
assert.match(proofAttachSql, /set proof_path\s*=\s*v_path/i, 'proof path must be persisted only by the post-upload attachment RPC');

assert.match(activityTypeSql, /class_type[\s\S]{0,120}gifted[\s\S]{0,60}enrichment/i, 'legacy production class_type=gifted must map to enrichment');
assert.match(activityTypeSql, /v_type\s+not\s+in\s*\(\s*'all'\s*,\s*'remedial'\s*,\s*'enrichment'\s*,\s*'supplemental'/i, 'unified activity filter vocabulary must remain explicit');

console.log('Supplemental learning database contract OK');
