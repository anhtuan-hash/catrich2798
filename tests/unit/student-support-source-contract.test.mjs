import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../../src/studentSupport/studentSupportSources.js', import.meta.url), 'utf8');

test('scoped student search uses server-side RPC and never downloads all students', () => {
  assert.match(source, /bes_search_student_support_students/);
  assert.doesNotMatch(source, /from\(['"](?:students|bes_homeroom_students)['"]\)\.select\(['"]\*['"]\)/);
});

test('student 360 reads official attendance and learning records only as source data', () => {
  assert.match(source, /bes_homeroom_attendance/);
  assert.match(source, /bes_homeroom_learning_records/);
});
