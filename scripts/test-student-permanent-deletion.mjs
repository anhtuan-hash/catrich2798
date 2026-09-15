import assert from 'node:assert/strict';
import {
  filterPermanentlyDeletedStudents,
  mergePermanentStudentTombstones,
  studentMatchesPermanentDeletion,
} from '../src/utils/permanentStudentDeletion.js';

const deletedStudent = {
  id: 'student-old-id',
  code: 'CP-0012',
  fullName: 'Nguyễn Văn A',
  birthDate: '2009-02-01',
};

const tombstones = mergePermanentStudentTombstones([], [deletedStudent], '2026-09-15T03:30:00.000Z');
assert.equal(tombstones.length, 1, 'permanent delete must persist exactly one tombstone');
assert.equal(tombstones[0].id, 'student-old-id');
assert.equal(tombstones[0].code, 'cp12');
assert.equal(tombstones[0].deletedAt, '2026-09-15T03:30:00.000Z');

assert.equal(
  studentMatchesPermanentDeletion({ ...deletedStudent, id: 'student-new-id' }, tombstones),
  true,
  'a roster refresh with a changed generated id must still be blocked by stable student code',
);

const centralRoster = [
  { ...deletedStudent, id: 'student-new-id' },
  { id: 'student-b', code: 'CP-0013', fullName: 'Trần Thị B', birthDate: '2009-05-03' },
];
const filtered = filterPermanentlyDeletedStudents(centralRoster, JSON.parse(JSON.stringify(tombstones)));
assert.deepEqual(filtered.map((student) => student.code), ['CP-0013']);

assert.equal(
  studentMatchesPermanentDeletion(
    { id: 'student-c', code: 'CP-0099', fullName: 'Nguyễn Văn A', birthDate: '2009-12-31' },
    tombstones,
  ),
  false,
  'same name with a different birth date/code must not be removed accidentally',
);

const mergedAgain = mergePermanentStudentTombstones(tombstones, [deletedStudent], '2026-09-15T04:00:00.000Z');
assert.equal(mergedAgain.length, 1, 'repeated sync/delete must not duplicate tombstones');

console.log('student-permanent-deletion: ok');
