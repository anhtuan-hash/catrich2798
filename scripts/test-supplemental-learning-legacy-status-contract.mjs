import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20260911_supplemental_learning_legacy_late_status_fix.sql', import.meta.url), 'utf8');

assert.match(sql, /create or replace function public\.bes_list_attendance_activities/i, 'latest migration must replace the unified activity RPC');
assert.match(sql, /bes_extra_attendance_records/i, 'legacy tardy count must come from attendance records');
assert.match(sql, /lower\s*\(\s*coalesce\s*\(\s*r\.status\s*,\s*''\s*\)\s*\)\s+in\s*\(\s*'late'\s*,\s*'tardy'\s*\)/i, 'production status=late and forward status=tardy must both count as tardy');
assert.match(sql, /'tardyCount'\s*,\s*coalesce\s*\(\s*a\.tardy_count/i, 'public API must continue exposing the stable tardyCount field');
assert.doesNotMatch(sql, /update\s+public\.bes_extra_attendance_records/i, 'compatibility must not rewrite legacy attendance records');

console.log('supplemental legacy late-status contract: ok');
