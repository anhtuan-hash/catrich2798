import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../../src/studentSupport/studentSupportSources.js', import.meta.url), 'utf8');

test('scoped student search uses server-side RPC and never downloads all students', () => {
  assert.match(source, /bes_search_student_support_students/);
  assert.doesNotMatch(source, /from\(['"](?:students|bes_homeroom_students)['"]\)\.select\(['"]\*['"]\)/);
});

test('student 360 reads canonical live workspace data through a scoped server-side RPC', () => {
  assert.match(source, /bes_get_student_support_student_360/);
  assert.doesNotMatch(source, /from\(['"]bes_homeroom_students['"]\)/);
  assert.doesNotMatch(source, /from\(['"]bes_homeroom_attendance['"]\)/);
  assert.doesNotMatch(source, /from\(['"]bes_homeroom_learning_records['"]\)/);
});

test('student 360 keeps teacher observations as Student Support-owned data', () => {
  assert.match(source, /from\(['"]student_support_teacher_observations['"]\)/);
  assert.match(source, /order\(['"]observation_date['"]/);
});
