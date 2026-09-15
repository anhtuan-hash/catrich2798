import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../../src/studentSupport/studentSupportApi.js', import.meta.url), 'utf8');

test('Student Support API exposes read helpers for case collaboration', () => {
  for (const name of [
    'listSupportRules',
    'listTeacherObservations',
    'listCaseActions',
    'listCaseNotes',
    'listFamilyContacts',
    'listCaseEvents',
  ]) {
    assert.match(source, new RegExp(`export\\s+async\\s+function\\s+${name}\\b`));
  }
});

test('V1 API has no direct hard-delete helper', () => {
  assert.doesNotMatch(source, /export\s+async\s+function\s+(?:delete|hardDelete|permanentDelete)Support/i);
  assert.doesNotMatch(source, /\.delete\(\).*student_support_/i);
});
