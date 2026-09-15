import test from 'node:test';
import assert from 'node:assert/strict';
import { isMissingStudentSupportSourceError } from '../../src/studentSupport/studentSupportSources.js';

test('recognizes only missing Student Support database objects as pre-migration errors', () => {
  assert.equal(isMissingStudentSupportSourceError({ code: '42P01', message: 'relation student_support_teacher_observations does not exist' }), true);
  assert.equal(isMissingStudentSupportSourceError({ code: 'PGRST205', message: "Could not find the table 'public.student_support_teacher_observations' in the schema cache" }), true);
  assert.equal(isMissingStudentSupportSourceError({ code: '42501', message: 'permission denied for table student_support_teacher_observations' }), false);
  assert.equal(isMissingStudentSupportSourceError({ message: 'Failed to fetch' }), false);
});
