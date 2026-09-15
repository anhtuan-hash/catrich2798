import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationUrl = new URL('../../supabase/migrations/20260915100000_student_support_advisor_hardening.sql', import.meta.url);

test('Student Support advisor hardening adds covering indexes for feature foreign keys', () => {
  assert.equal(fs.existsSync(migrationUrl), true, 'advisor-hardening migration must exist');
  const sql = fs.readFileSync(migrationUrl, 'utf8');

  for (const indexName of [
    'student_support_actions_case_fk_idx',
    'student_support_actions_created_by_idx',
    'student_support_alerts_assigned_to_idx',
    'student_support_alerts_linked_case_idx',
    'student_support_alerts_rule_idx',
    'student_support_case_events_actor_idx',
    'student_support_cases_created_by_idx',
    'student_support_cases_owner_idx',
    'student_support_family_contacts_actor_idx',
    'student_support_notes_author_idx',
    'student_support_rules_created_by_idx',
    'student_support_observations_teacher_idx',
  ]) {
    assert.match(sql, new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${indexName}`, 'i'));
  }
});

test('Student Support RLS policies cache auth.uid through scalar subqueries', () => {
  assert.equal(fs.existsSync(migrationUrl), true, 'advisor-hardening migration must exist');
  const sql = fs.readFileSync(migrationUrl, 'utf8');

  assert.doesNotMatch(sql, /(?:=|<>)\s*auth\.uid\(\)/i);
  assert.match(sql, /created_by\s*=\s*\(select\s+auth\.uid\(\)\)/i);
  assert.match(sql, /assigned_to\s*=\s*\(select\s+auth\.uid\(\)\)/i);
  assert.match(sql, /author_id\s*=\s*\(select\s+auth\.uid\(\)\)/i);
  assert.match(sql, /teacher_id\s*=\s*\(select\s+auth\.uid\(\)\)/i);
  assert.match(sql, /contacted_by\s*=\s*\(select\s+auth\.uid\(\)\)/i);
  assert.match(sql, /actor_id\s*=\s*\(select\s+auth\.uid\(\)\)/i);
});
