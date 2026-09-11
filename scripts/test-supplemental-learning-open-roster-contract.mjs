import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase/migrations/20260911_supplemental_learning_open_roster_sync.sql');
assert.ok(fs.existsSync(migrationPath), 'open supplemental roster sync migration must exist');
const sql = fs.readFileSync(migrationPath, 'utf8');

const attendanceListSql = sql.match(/create or replace function public\.bes_list_supplemental_attendance[\s\S]*?(?=revoke all on function public\.bes_list_supplemental_attendance)/i)?.[0] || '';
assert.match(attendanceListSql, /s\.kind\s*=\s*'recurring'[\s\S]{0,180}s\.status\s+in\s*\(\s*'scheduled'\s*,\s*'in_progress'\s*\)/i, 'open recurring cards must derive participant count from current effective memberships even after an earlier empty begin');
assert.match(attendanceListSql, /effective_from\s*<=\s*s\.attendance_date/i, 'open recurring participant count must respect membership start date');
assert.match(attendanceListSql, /effective_until\s+is\s+null[\s\S]{0,100}effective_until\s*>=\s*s\.attendance_date/i, 'open recurring participant count must respect membership end date');

const beginSql = sql.match(/create or replace function public\.bes_begin_supplemental_attendance[\s\S]*?(?=revoke all on function public\.bes_begin_supplemental_attendance)/i)?.[0] || '';
assert.match(beginSql, /if\s+v_session\.kind\s*=\s*'recurring'\s+then[\s\S]{0,900}delete\s+from\s+public\.bes_supplemental_session_participants/i, 'opening an unconfirmed recurring session must rebuild its working roster from current memberships');
assert.match(beginSql, /bes_supplemental_group_memberships[\s\S]{0,420}m\.effective_from\s*<=\s*v_session\.attendance_date/i, 'rebuilt roster must use memberships effective on the attendance date');
assert.doesNotMatch(beginSql, /if\s+v_session\.roster_frozen_at\s+is\s+null\s+then[\s\S]{0,160}if\s+v_session\.kind\s*=\s*'recurring'/i, 'recurring roster repair must not be blocked by a stale roster_frozen_at from an earlier empty open');

const unifiedSql = sql.match(/create or replace function public\.bes_list_attendance_activities[\s\S]*?(?=revoke all on function public\.bes_list_attendance_activities)/i)?.[0] || '';
assert.match(unifiedSql, /s\.kind\s*=\s*'recurring'[\s\S]{0,180}s\.status\s+in\s*\(\s*'scheduled'\s*,\s*'in_progress'\s*\)/i, 'unified attendance activity counts must match the open recurring roster rule');

console.log('supplemental open roster sync contract: ok');
