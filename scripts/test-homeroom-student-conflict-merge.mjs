import assert from 'node:assert/strict';
import {
  isHomeroomStudentListOnlyChange,
  mergeHomeroomStudentListAfterConflict,
} from '../src/utils/homeroomStudentConflictMerge.js';

const student = { id:'s1', code:'001', fullName:'Student One',
  birthDate:'2009-02-02', gender:'Nam', active:true, notes:'original' };
const before = { id:'11-2', classProfile:{className:'11.2'}, students:[student], attendance:{day1:'kept'} };
const newStudent = {id:'s2', code:'002', fullName:'Student Two', birthDate:'2009-03-05', gender:'Nữ', active:true};
const after={...before,students:[student,newStudent]};
const latest={...before, students:[{...student,notes:'teacher changed concurrently'}],
  attendance:{day1:'kept'}, updatedAt:'2026-10-22T16:00:00Z'};
assert.equal(isHomeroomStudentListOnlyChange(before,after),true);
const merged=mergeHomeroomStudentListAfterConflict(before,after,latest);
assert.equal(merged.ok,true);
assert.equal(merged.changed,1);
assert.equal(merged.workspace.students.length,2);
assert.equal(merged.workspace.students[0].notes,'teacher changed concurrently');
assert.deepEqual(merged.workspace.attendance,latest.attendance);
assert.equal(merged.workspace.students[1].id,'s2');

// A field that both teachers edited differently must not be overwritten.
const changedStudent={...student,notes:'new note'};
const conflict=mergeHomeroomStudentListAfterConflict(
  before,{...before,students:[changedStudent]},latest,
);
assert.equal(conflict.ok,false);
assert.match(conflict.message,/người khác sửa/);
const duplicate=mergeHomeroomStudentListAfterConflict(before,after,{
 ...latest,students:[...latest.students,{...newStudent,id:'another-student'}],
});
assert.equal(duplicate.ok,false);
assert.match(duplicate.message,/trùng/);
const deleted=mergeHomeroomStudentListAfterConflict(
 {...before,students:[student,newStudent]},
 {...before,students:[student]},
 latest,
);
assert.equal(deleted.ok,false);
console.log('Concurrent Homeroom student additions retain history and reject conflicting writes: PASS');
