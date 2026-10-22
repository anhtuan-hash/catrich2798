import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  attachVerifiedGradebookAssignment,
  evaluateGradebookAssignmentLifecycle,
} from '../src/utils/gradebookAssignmentLifecycle.js';
import { makeGradebookRosterIdentity } from '../src/utils/gradebookRosterStore.js';

const date = new Date('2026-10-22T09:00:00+07:00');
const studentWorkspace = {
  id: 'school-12-3-2026-2027',
  classProfile: { className: '12.3', schoolYear: '2026-2027', teachingSubject: 'Tiếng Anh' },
  students: [{ fullName: 'Regression student', code: '', active: true }],
};
const teachers = [{
  className: '12.3',
  subject: 'Tiếng Anh',
  departmentId: 'english',
  departmentName: 'English Department',
  source: 'brian-team',
}];
const user = { id: 'teacher-verified' };
const matched = attachVerifiedGradebookAssignment(studentWorkspace, teachers, 'brian-team-sync', date);

assert.equal(matched.classProfile.assignmentSource, 'brian-team-sync');
assert.equal(matched.classProfile.assignmentDepartmentId, 'english');
assert.equal(makeGradebookRosterIdentity(user, matched).rosterKey, 'class:2026-2027||12.3');
assert.equal(evaluateGradebookAssignmentLifecycle(matched, teachers, 'brian-team-sync', date).status, 'active');
assert.equal(studentWorkspace.classProfile.assignmentSource, undefined, 'Original workspace must remain untouched');
assert.deepEqual(matched.students, studentWorkspace.students, 'Existing gradebook/student data must be preserved');

const privateClass = attachVerifiedGradebookAssignment(studentWorkspace, [], 'brian-team-sync', date);
assert.equal(makeGradebookRosterIdentity(user, privateClass).rosterKey, 'owner:teacher-verified||2026-2027||12.3');
assert.equal(attachVerifiedGradebookAssignment(studentWorkspace, teachers, 'assignment-sync-error', date), studentWorkspace);
const historical = { ...studentWorkspace, classProfile: { ...studentWorkspace.classProfile, schoolYear: '2025-2026' } };
assert.equal(attachVerifiedGradebookAssignment(historical, teachers, 'brian-team-sync', date), historical);
const gradebookPage = readFileSync(new URL('../src/pages/GradebookStudio.jsx', import.meta.url),'utf8');
assert.match(gradebookPage,/const verifiedWorkspace = attachVerifiedGradebookAssignment/);
assert.match(gradebookPage,/const verifiedNext = attachVerifiedGradebookAssignment/);
const migrationText = readFileSync(new URL('../supabase/migrations/20261022194500_canonical_assigned_school_rosters.sql',import.meta.url),'utf8');
assert.match(migrationText,/history_action := coalesce\(nullif\(current_setting/);
assert.match(migrationText,/ON CONFLICT \(roster_key\) DO NOTHING/);
console.log('Verified school-roster bridge and history regression PASS');
