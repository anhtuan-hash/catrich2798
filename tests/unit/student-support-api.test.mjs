import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionCase,
  validateObservationInput,
  sanitizeAuditSnapshot,
  CASE_TRANSITIONS,
} from '../../src/studentSupport/studentSupportApi.js';
import { validateCaseInput } from '../../src/studentSupport/studentSupportValidation.js';

test('case lifecycle blocks invalid shortcuts', () => {
  assert.equal(canTransitionCase('NEW', 'CLOSED'), false);
  assert.equal(canTransitionCase('ACTIVE', 'FOLLOW_UP'), true);
  assert.equal(canTransitionCase('RESOLVED', 'ACTIVE'), true);
  assert.equal(canTransitionCase('CLOSED', 'ACTIVE'), false);
  assert.deepEqual(CASE_TRANSITIONS.NEW, ['REVIEWING', 'NO_ACTION_REQUIRED']);
});

test('case creation requires durable identity, workspace, category and title', () => {
  assert.throws(() => validateCaseInput({ workspaceId: '12.6', category: 'ATTENDANCE', title: 'Theo dõi' }), /student/i);
  assert.throws(() => validateCaseInput({ studentRef: 'HS-1', category: 'ATTENDANCE', title: 'Theo dõi' }), /workspace/i);
  assert.throws(() => validateCaseInput({ studentRef: 'HS-1', workspaceId: '12.6', title: 'Theo dõi' }), /category/i);
  assert.throws(() => validateCaseInput({ studentRef: 'HS-1', workspaceId: '12.6', category: 'ATTENDANCE' }), /title/i);
  const valid = validateCaseInput({ studentRef: 'HS-1', workspaceId: '12.6', category: 'ATTENDANCE', title: 'Theo dõi chuyên cần' });
  assert.equal(valid.student_ref, 'HS-1');
  assert.equal(valid.category, 'ATTENDANCE');
});

test('teacher observation requires durable student identity and class scope', () => {
  assert.throws(
    () => validateObservationInput({ observationType: 'TASK_INCOMPLETE', workspaceId: '12.6', className: '12.6' }),
    /student/i,
  );
  assert.throws(
    () => validateObservationInput({ studentRef: 'HS-1', observationType: 'TASK_INCOMPLETE', workspaceId: '12.6' }),
    /class/i,
  );
});

test('teacher observation accepts factual fixed type', () => {
  const result = validateObservationInput({
    studentRef: 'HS-1',
    workspaceId: '12.6',
    className: '12.6',
    observationType: 'TASK_INCOMPLETE',
    subjectName: 'English',
  });
  assert.equal(result.student_ref, 'HS-1');
  assert.equal(result.observation_type, 'TASK_INCOMPLETE');
});

test('audit snapshot strips sensitive free-text fields', () => {
  const safe = sanitizeAuditSnapshot({
    id: 'case-1',
    status: 'ACTIVE',
    category: 'ATTENDANCE',
    note_body: 'private note',
    body: 'observation text',
    summary: 'family contact summary',
    reason: 'free text reason',
    goal: 'free text goal',
    message: 'secret',
    updated_at: '2026-09-15T00:00:00Z',
  });
  assert.deepEqual(safe, {
    id: 'case-1',
    status: 'ACTIVE',
    category: 'ATTENDANCE',
    updated_at: '2026-09-15T00:00:00Z',
  });
});
