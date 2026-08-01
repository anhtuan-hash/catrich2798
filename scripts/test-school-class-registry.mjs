import assert from 'node:assert/strict';
import {
  SCHOOL_CLASS_BLUEPRINTS,
  assignHomeroomTeacher,
  createDefaultSchoolClassRegistry,
  mergeRosterStudents,
  normalizeSchoolClassName,
  parseSchoolRosterRows,
  reconcileWorkspaceRoster,
} from '../src/utils/schoolClassRegistry.js';

assert.equal(SCHOOL_CLASS_BLUEPRINTS.length, 27);
assert.equal(SCHOOL_CLASS_BLUEPRINTS.reduce((sum, item) => sum + item.expectedCount, 0), 718);
assert.equal(normalizeSchoolClassName('Lớp 11.4'), '11.4');
assert.equal(normalizeSchoolClassName('12'), '12.1');

const parsed = parseSchoolRosterRows([
  ['Mã Học Sinh', 'Họ và Tên', 'Lớp', 'Hình thức học', 'Ngày sinh', 'Giới tính'],
  ['001', 'Nguyễn Văn A', '11.4', 'Chính khóa', '01/02/2009', 'Nam'],
  ['002', 'Trần Thị B', '12', 'Chính khóa', '03/04/2009', 'Nữ'],
]);
assert.equal(parsed.totalStudents, 2);
assert.equal(parsed.rosters['11.4'][0].birthDate, '2009-02-01');
assert.equal(parsed.rosters['12.1'][0].code, '002');

const existing = [{ id: 'old-id', code: '001', fullName: 'Nguyễn Văn A', birthDate: '2009-02-01', portalPin: '123456', active: true }];
const merged = mergeRosterStudents(existing, parsed.rosters['11.4'], '2026-08-02T00:00:00.000Z');
assert.equal(merged[0].id, 'old-id');
assert.equal(merged[0].portalPin, '123456');

const workspace = {
  id: 'class-11-4',
  classProfile: { className: '11.4' },
  students: existing,
  learningRecords: [{ studentId: 'old-id', score: 9 }],
  conductRecords: [{ studentId: 'old-id', deduction: 5 }],
};
const reconciled = reconcileWorkspaceRoster(workspace, '11.4', parsed.rosters['11.4']);
assert.deepEqual(reconciled.learningRecords, workspace.learningRecords);
assert.deepEqual(reconciled.conductRecords, workspace.conductRecords);
assert.equal(reconciled.students[0].id, 'old-id');

let registry = createDefaultSchoolClassRegistry();
registry = assignHomeroomTeacher(registry, '11.4', 'teacher-a');
registry = assignHomeroomTeacher(registry, '12.6', 'teacher-a');
assert.equal(registry.classes.find((item) => item.className === '11.4').assignment.homeroomTeacherId, '');
assert.equal(registry.classes.find((item) => item.className === '12.6').assignment.homeroomTeacherId, 'teacher-a');

console.log('school-class-registry: ok');
