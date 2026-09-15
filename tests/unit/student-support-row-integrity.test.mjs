import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationUrl = new URL('../../supabase/migrations/20260915095000_student_support_row_integrity.sql', import.meta.url);

test('case-bound Student Support rows cannot drift across students or workspaces', () => {
  assert.equal(fs.existsSync(migrationUrl), true, 'row-integrity migration must exist');
  const sql = fs.readFileSync(migrationUrl, 'utf8');

  assert.match(sql, /create or replace function private\.student_support_guard_case_bound_identity/i);
  assert.match(sql, /c\.id\s*=\s*new\.case_id/i);
  assert.match(sql, /c\.student_ref\s*=\s*new\.student_ref/i);
  assert.match(sql, /c\.homeroom_workspace_id\s*=\s*new\.homeroom_workspace_id/i);
  assert.match(sql, /old\.case_id\s+is\s+distinct\s+from\s+new\.case_id/i);
  assert.match(sql, /old\.student_ref\s+is\s+distinct\s+from\s+new\.student_ref/i);
  assert.match(sql, /old\.homeroom_workspace_id\s+is\s+distinct\s+from\s+new\.homeroom_workspace_id/i);
  assert.match(sql, /student_support_actions_guard_identity/i);
  assert.match(sql, /student_support_notes_guard_identity/i);
  assert.match(sql, /student_support_contacts_guard_identity/i);
});

test('alerts and observations keep immutable student identity', () => {
  assert.equal(fs.existsSync(migrationUrl), true, 'row-integrity migration must exist');
  const sql = fs.readFileSync(migrationUrl, 'utf8');

  assert.match(sql, /create or replace function private\.student_support_guard_alert_identity/i);
  assert.match(sql, /linked_case_id is not null/i);
  assert.match(sql, /c\.id\s*=\s*new\.linked_case_id/i);
  assert.match(sql, /student_support_alerts_guard_identity/i);
  assert.match(sql, /create or replace function private\.student_support_guard_observation_identity/i);
  assert.match(sql, /old\.teacher_id\s+is\s+distinct\s+from\s+new\.teacher_id/i);
  assert.match(sql, /student_support_observations_guard_identity/i);
});
