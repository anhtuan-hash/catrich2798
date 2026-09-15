import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const apiUrl = new URL('../../src/studentSupport/studentSupportApi.js', import.meta.url);
const queriesUrl = new URL('../../src/studentSupport/studentSupportQueries.js', import.meta.url);
const apiSource = fs.readFileSync(apiUrl, 'utf8');

test('Student Support read layer exposes case collaboration helpers', () => {
  assert.equal(fs.existsSync(queriesUrl), true, 'studentSupportQueries.js is required');
  const querySource = fs.readFileSync(queriesUrl, 'utf8');
  for (const name of [
    'listSupportRules',
    'listTeacherObservations',
    'listCaseActions',
    'listCaseNotes',
    'listFamilyContacts',
    'listCaseEvents',
  ]) {
    assert.match(querySource, new RegExp(`export\\s+async\\s+function\\s+${name}\\b`));
  }
});

test('V1 Student Support layers have no direct hard-delete helper', () => {
  const querySource = fs.existsSync(queriesUrl) ? fs.readFileSync(queriesUrl, 'utf8') : '';
  const combined = `${apiSource}\n${querySource}`;
  assert.doesNotMatch(combined, /export\s+async\s+function\s+(?:delete|hardDelete|permanentDelete)Support/i);
  assert.doesNotMatch(combined, /\.delete\(\).*student_support_/i);
});
