import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge = fs.readFileSync(new URL('../src/components/GlobalAttendanceAdminPersistenceBridge.jsx', import.meta.url), 'utf8');
const migrationUrl = new URL('../supabase/migrations/20260908_fix_manual_class_teacher_persistence.sql', import.meta.url);
const migration = fs.existsSync(migrationUrl) ? fs.readFileSync(migrationUrl, 'utf8') : '';

assert.match(bridge, /bes_create_extra_class_with_teachers/, 'Manual class creation must use the transactional server RPC');
assert.match(bridge, /p_source_key\s*:\s*assignment\.sourceKey/, 'Manual class creation must persist the authoritative source key');
assert.match(bridge, /p_teacher_names\s*:\s*assignment\.teachers/, 'Manual class creation must persist every assigned teacher');
assert.doesNotMatch(bridge, /from\(['"]bes_extra_classes['"]\)[\s\S]{0,240}\.insert\(/, 'Manual class creation must not bypass normalized teacher persistence with a direct class insert');

assert.ok(migration, 'Teacher persistence repair migration must exist');
assert.match(migration, /create or replace function public\.bes_create_extra_class_with_teachers/i, 'Migration must define the transactional class creation RPC');
assert.match(migration, /insert into public\.bes_extra_class_teachers/i, 'RPC must persist normalized class-teacher assignments');
assert.match(migration, /p_source_key\s+text/i, 'RPC must accept authoritative source key');
assert.match(migration, /p_teacher_names\s+text\[\]/i, 'RPC must accept all assigned teachers');
assert.match(migration, /security definer/i, 'RPC must execute with controlled server privileges');
assert.match(migration, /revoke all on function public\.bes_create_extra_class_with_teachers[\s\S]*from anon/i, 'Anonymous callers must not execute class creation RPC');

assert.match(migration, /Bồi dưỡng tiếng Anh 10/i, 'Migration must repair the currently broken English 10 class');
assert.match(migration, /hsg-2026-tieng-anh-10/i, 'Repair must restore English 10 authoritative source key');
assert.match(migration, /Ngô Thị Mỹ Diệp/, 'Repair must restore the first English 10 teacher');
assert.match(migration, /Nguyễn Thị Mỹ Duyên/, 'Repair must restore the second English 10 teacher');

console.log('Attendance manual class teacher persistence contract OK');
