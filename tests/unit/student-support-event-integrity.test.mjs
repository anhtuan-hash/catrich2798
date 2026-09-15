import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationUrl = new URL('../../supabase/migrations/20260915094000_student_support_event_integrity.sql', import.meta.url);

test('case event policy binds events to the real case and limits teaching-team writes', () => {
  assert.equal(fs.existsSync(migrationUrl), true);
  const sql = fs.readFileSync(migrationUrl, 'utf8');
  assert.match(sql, /drop policy if exists student_support_case_events_insert_scope/i);
  assert.match(sql, /c\.id\s*=\s*case_id/i);
  assert.match(sql, /c\.student_ref\s*=\s*student_ref/i);
  assert.match(sql, /c\.homeroom_workspace_id\s*=\s*homeroom_workspace_id/i);
  assert.match(sql, /event_type\s*=\s*'NOTE_CREATED'/i);
  assert.match(sql, /n\.author_id\s*=\s*auth\.uid\(\)/i);
  assert.match(sql, /private\.student_support_can_manage_workspace/i);
});
