import assert from 'node:assert/strict';
import {
  filterPermanentlyDeletedStudents,
  permanentlyRemoveArchivedStudents,
} from '../src/utils/permanentStudentDeletion.js';

const archived = { id: 'archived-1', code: 'CP-01', fullName: 'Archived learner', active: false, birthDate: '2009-07-25' };
const active = { id: 'active-2', code: 'CP-02', fullName: 'Active learner', active: true };
const workspace = {
  id: 'class-12-6',
  students: [archived, active],
  studentRecords: { 'archived-1': { score: 9 }, 'active-2': { score: 8 } },
  attendance: { session: { 'archived-1': 'absent', 'active-2': 'present' } },
  conductRecords: [
    { id: 'record-old', studentId: 'archived-1', points: 5 },
    { id: 'record-good', studentId: 'active-2', points: 10 },
  ],
  backups: [{
    id: 'backup-1',
    snapshot: {
      students: [archived, active],
      studentRecords: { 'archived-1': { notes: 'private' }, 'active-2': { notes: 'keep' } },
      conductRecords: [{ studentId: 'archived-1', id: 'backup-conduct' }],
    },
  }],
  auditLogs: [{ id: 'audit-a', action: 'Created class' }],
};
const cleaned = permanentlyRemoveArchivedStudents(workspace, ['archived-1']);
assert.deepEqual(cleaned.students.map((s) => s.id), ['active-2']);
assert.deepEqual(Object.keys(cleaned.studentRecords), ['active-2']);
assert.deepEqual(cleaned.attendance.session, { 'active-2': 'present' });
assert.deepEqual(cleaned.conductRecords.map((record) => record.id), ['record-good']);
assert.deepEqual(cleaned.backups[0].snapshot.students.map((s) => s.id), ['active-2']);
assert.deepEqual(Object.keys(cleaned.backups[0].snapshot.studentRecords), ['active-2']);
assert.deepEqual(cleaned.backups[0].snapshot.conductRecords, []);
assert.deepEqual(cleaned.auditLogs, workspace.auditLogs);
assert.equal(cleaned.studentPermanentDeletionTombstones.length, 1);
assert.equal(cleaned.studentPermanentDeletionAudit[0].count, 1);
assert.deepEqual(
  filterPermanentlyDeletedStudents([archived, active], cleaned.studentPermanentDeletionTombstones).map((s) => s.id),
  ['active-2'],
);
assert.throws(() => permanentlyRemoveArchivedStudents(workspace, ['active-2']), /Chỉ học sinh đã lưu trữ/);
assert.throws(() => permanentlyRemoveArchivedStudents(workspace, ['archived-1', 'active-2']), /Chỉ học sinh đã lưu trữ/);
assert.throws(() => permanentlyRemoveArchivedStudents(workspace, []), /Chưa chọn học sinh/);
assert.equal(workspace.students.length, 2, 'Do not mutate the original workspace');
console.log('Archived student permanent deletion contract passed.');
