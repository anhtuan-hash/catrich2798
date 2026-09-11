import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase/migrations/20260911_supplemental_learning_attendance.sql');
assert.ok(fs.existsSync(migrationPath), 'supplemental learning migration must exist');
const sql = fs.readFileSync(migrationPath, 'utf8');

for (const table of [
  'bes_supplemental_students',
  'bes_supplemental_groups',
  'bes_supplemental_group_memberships',
  'bes_supplemental_sessions',
  'bes_supplemental_session_participants',
]) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'), `${table} must be created`);
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `${table} must have RLS enabled`);
}

assert.match(sql, /source_type\s+text[\s\S]{0,240}official[\s\S]{0,80}manual/i, 'student source type must distinguish official/manual');
assert.match(sql, /linked_official_key/i, 'manual identity must support official linking');
assert.match(sql, /effective_from\s+date/i, 'membership must be effective-dated');
assert.match(sql, /effective_until\s+date/i, 'membership must support an effective stop date');
assert.match(sql, /kind\s+text[\s\S]{0,220}recurring[\s\S]{0,80}adhoc/i, 'session kind must support recurring and adhoc');
assert.match(sql, /status\s+text[\s\S]{0,360}scheduled[\s\S]{0,120}in_progress[\s\S]{0,120}confirmed[\s\S]{0,120}cancelled/i, 'session lifecycle must be explicit');
assert.match(sql, /roster_frozen_at/i, 'session must record roster freeze time');
assert.match(sql, /canonical_student_key/i, 'participant must snapshot canonical identity');
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
  'bes_list_supplemental_history',
  'bes_supplemental_student_report',
]) {
  assert.match(sql, new RegExp(`create or replace function public\\.${rpc}`, 'i'), `${rpc} RPC must exist`);
}

assert.match(sql, /create or replace function private\.bes_require_supplemental_admin/i, 'server-side Admin guard must exist');
assert.match(sql, /lower\s*\(\s*coalesce\s*\(\s*p\.role/i, 'Admin guard must inspect approved profile role');
assert.match(sql, /public\.can_take_extra_class_attendance\s*\(\s*\)/i, 'attendance RPC must reuse global quick-attendance permission gate');
assert.match(sql, /private\.bes_attendance_access_decision/i, 'attendance RPC must reuse central Giờ GV decision');
assert.match(sql, /clock_timestamp\s*\(\s*\)/i, 'authoritative timestamps must come from PostgreSQL');
assert.match(sql, /status\s*=\s*'cancelled'/i, 'cancelled sessions must be rejected by attendance flow');
assert.match(sql, /checked_by\s*=\s*v_uid|auth\.uid\s*\(\s*\)/i, 'attendance actor must come from authenticated user');
assert.doesNotMatch(sql, /insert\s+into\s+public\.bes_extra_/i, 'supplemental implementation must not write legacy extra-class tables');
assert.doesNotMatch(sql, /update\s+public\.bes_extra_/i, 'supplemental implementation must not rewrite legacy extra-class tables');
assert.doesNotMatch(sql, /delete\s+from\s+public\.bes_extra_/i, 'supplemental implementation must not delete legacy extra-class history');

console.log('Supplemental learning database contract OK');
