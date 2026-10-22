import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Test the pure canonical merge logic without importing browser-only CSS,
// React or Supabase dependencies into Node's test runner.
const source = readFileSync(new URL('../src/utils/assignedStudentRosterSync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^export /gm, '');
const cloud = {
  row: {
    roster_key: 'class:2026-2027||12.3', students: [], updated_at: 'r1',
  },
  failNextUpdate: false,
};
const storage = new Map();
const localStorage = {
  get length() { return storage.size; },
  key(index) { return [...storage.keys()][index] ?? null; },
  getItem(key) { return storage.get(key) ?? null; },
  setItem(key, value) { storage.set(key, value); },
  removeItem(key) { storage.delete(key); },
};
const supabase = {
  from(table) {
    assert.equal(table, 'bes_class_rosters');
    let operation = 'read';
    let changes;
    const filters = {};
    const builder = {
      select() { return builder; },
      eq(key, value) { filters[key] = value; return builder; },
      update(values) { operation = 'update'; changes = values; return builder; },
      async maybeSingle() {
        if (operation === 'read') return { data: { ...cloud.row }, error: null };
        if (cloud.failNextUpdate) {
          cloud.failNextUpdate = false;
          return { data: null, error: { message: 'Temporary database connection failure' } };
        }
        if (filters.updated_at !== cloud.row.updated_at) {
          return { data: null, error: null };
        }
        cloud.row = { ...cloud.row, ...changes };
        return { data: { roster_key: cloud.row.roster_key }, error: null };
      },
    };
    return builder;
  },
};
const {
  applyStudentChangesToCanonicalRoster, selectCanonicalMatch,
  syncAssignedStudentRosterDelta, flushPendingAssignedStudentRosters,
  getPendingAssignedStudentRosterCount,
} = new Function(
  'projectSharedRosterStudents', 'isSupabaseConfigured', 'supabase', 'localStorage', 'window',
  source + '\nreturn { applyStudentChangesToCanonicalRoster, selectCanonicalMatch,'
    + ' syncAssignedStudentRosterDelta, flushPendingAssignedStudentRosters,'
    + ' getPendingAssignedStudentRosterCount };',
)((students) => students.map((student) => ({ ...student })), true, supabase, localStorage, undefined);

const remote = [
  { rosterStudentId: 'S1', rosterPersonKey: 'person:student a|2008-09-01|nam',
    fullName: 'Student A', code: '', birthDate: '2008-09-01', gender: 'Nam',
    active: false, archivedReason: 'Old archive' },
  { rosterStudentId: 'S2', rosterPersonKey: 'code:002',
    fullName: 'Student B', code: '002', gender: 'Nữ', active: true },
];
const before = [
  { id: 'local-a', fullName: 'Student A', code: '', birthDate: '2008-09-01', gender: 'Nam',
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
assert.equal(selectCanonicalMatch({ fullName: 'Student A', birthDate: '2008-09-01', gender: 'Nam' },
  [remote[0], { ...remote[0], rosterStudentId: 'S3' }]).ambiguous, true);

// Identical names without reliable identifying details must not silently merge
// or manufacture duplicates; staff must resolve their official student identity.
const unclear = applyStudentChangesToCanonicalRoster(
  [{ rosterStudentId: 'legacy', fullName: 'Student A', code: '', birthDate: '', gender: 'Nam', active: true }],
  [], [{ id: 'new-entry', fullName: 'Student A', code: '', birthDate: '', gender: 'Nam', active: true }],
);
assert.equal(unclear.changed, 0);
assert.equal(unclear.students.length, 1);
assert.equal(unclear.issues.length, 1);
assert.equal(selectCanonicalMatch({ fullName: 'Student A', gender: 'Nam' }, remote).index, -1);
assert.equal(selectCanonicalMatch({ fullName: 'Student A', birthDate: '2008-09-01', gender: 'Nam' }, remote).index, 0);
console.log('Cross-app canonical student roster sync PASS');

const teacher = { id: 'teacher-roster-test' };
const classProfile = { className: '12.3', schoolYear: '2026-2027' };
const latest = [{ id: 'added-learner', fullName: 'Learner Added Later',
  code: '', birthDate: '2009-03-05', gender: 'Nam', active: true }];
cloud.failNextUpdate = true;
const failed = await syncAssignedStudentRosterDelta(teacher,
  { classProfile, students: [] }, { classProfile, students: latest });
assert.equal(failed.ok, false);
assert.equal(getPendingAssignedStudentRosterCount(teacher), 1, 'Failed writes must be durably queued');
assert.equal(cloud.row.students.length, 0, 'Failed write must not partially modify the database');
const recovered = await flushPendingAssignedStudentRosters(teacher);
assert.equal(recovered.ok, true);
assert.equal(recovered.changed, 1);
assert.equal(cloud.row.students.length, 1);
assert.equal(cloud.row.students[0].fullName, latest[0].fullName);
assert.equal(getPendingAssignedStudentRosterCount(teacher), 0, 'Successful replay clears the queue');
console.log('Offline-first roster retry and replay PASS');
