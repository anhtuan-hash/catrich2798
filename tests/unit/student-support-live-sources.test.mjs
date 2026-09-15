import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationUrl = new URL('../../supabase/migrations/20260915130000_student_support_live_sources.sql', import.meta.url);
const sources = fs.readFileSync(new URL('../../src/studentSupport/studentSupportSources.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../../src/pages/StudentSupportCenter.jsx', import.meta.url), 'utf8');

test('Student Support live-source migration reads students and attendance from canonical workspace payloads', () => {
  assert.equal(fs.existsSync(migrationUrl), true, 'live-source migration must exist');
  if (!fs.existsSync(migrationUrl)) return;
  const sql = fs.readFileSync(migrationUrl, 'utf8');
  assert.match(sql, /bes_search_student_support_students/i);
  assert.match(sql, /jsonb_array_elements[\s\S]*payload[\s\S]*students/i);
  assert.match(sql, /bes_get_student_support_student_360/i);
  assert.match(sql, /payload[\s\S]*attendance/i);
  assert.match(sql, /bes_gradebook_workspaces/i);
});

test('Student 360 uses a scoped live-source RPC instead of empty normalized shadow tables', () => {
  assert.match(sources, /rpc\(['"]bes_get_student_support_student_360['"]/);
  assert.doesNotMatch(sources, /from\(['"]bes_homeroom_students['"]\)/);
  assert.doesNotMatch(sources, /from\(['"]bes_homeroom_attendance['"]\)/);
  assert.doesNotMatch(sources, /from\(['"]bes_homeroom_learning_records['"]\)/);
});

test('Student Support keeps its search visible and primes a real scoped roster on the overview', () => {
  assert.match(page, /className="student-support-search"[\s\S]*data-bes-keep-search="true"/);
  assert.match(page, /searchScopedStudents\(['"]['"],\s*12\)/);
  assert.match(page, /starterStudents/);
});
