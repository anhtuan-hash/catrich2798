import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Test the pure canonical merge logic without importing browser-only CSS,
// React or Supabase dependencies into Node's test runner.
const source = readFileSync(new URL('../src/utils/assignedStudentRosterSync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^export /gm, '');
const { applyStudentChangesToCanonicalRoster, selectCanonicalMatch } = new Function(
  'projectSharedRosterStudents',
  source + '\nreturn { applyStudentChangesToCanonicalRoster, selectCanonicalMatch };',
)((students) => students.map((student) => ({ ...student })));

const remote = [
  { rosterStudentId: 'S1', rosterPersonKey: 'person:student a||nam',
    fullName: 'Student A', code: '', birthDate: '', gender: 'Nam',
    active: false, archivedReason: 'Old archive' },
  { rosterStudentId: 'S2', rosterPersonKey: 'code:002',
    fullName: 'Student B', code: '002', gender: 'Nữ', active: true },
];
const before = [
  { id: 'local-a', fullName: 'Student A', code: '', gender: 'Nam',
    active: false, inactiveReason: 'Old archive' },
  { id: 'local-b', fullName: 'Student B', code: '002', gender: 'Nữ', active: true },
];
const after = [
  { ...before[0], active: true, lifecycleStatus: 'active', inactiveReason: '' },
  { ...before[1], notes: 'Only a local gradebook note' },
  { id: 'local-c', fullName: 'Student C', code: '003', active: true },
];
const applied = applyStudentChangesToCanonicalRoster(remote, before, after);
assert.deepEqual(applied.issues, []);
assert.equal(applied.changed, 2);
assert.equal(applied.students.length, 3);
assert.equal(applied.students[0].rosterStudentId, 'S1');
assert.equal(applied.students[0].active, true);
assert.equal(applied.students[1].rosterStudentId, 'S2');
assert.equal(applied.students[2].fullName, 'Student C');
assert.equal(applyStudentChangesToCanonicalRoster(remote, before, before).changed, 0);
assert.equal(selectCanonicalMatch(after[0], remote).index, 0);
assert.equal(selectCanonicalMatch({ fullName: 'Student A', gender: 'Nam' },
  [remote[0], { ...remote[0], rosterStudentId: 'S3' }]).ambiguous, true);
console.log('Cross-app canonical student roster sync PASS');
