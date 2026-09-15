import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudentSupportHash, normalizeStudentRef, parseStudentSupportHash } from '../../src/studentSupport/studentSupportIdentity.js';

test('prefers durable studentRef over code', () => {
  assert.equal(normalizeStudentRef({ studentRef: 'HS-1', code: '001' }), 'HS-1');
});

test('falls back to normalized code identity', () => {
  assert.equal(normalizeStudentRef({ code: ' 001 ' }), 'code:001');
});

test('returns empty when no durable identity exists', () => {
  assert.equal(normalizeStudentRef({ fullName: 'No id' }), '');
});

test('deep link round trips student, workspace and tab safely', () => {
  const hash = buildStudentSupportHash({ studentRef: 'HS 1/2', workspaceId: '12.6 A', tab: 'student' });
  assert.equal(hash, '#/student-support?student=HS%201%2F2&workspace=12.6%20A&tab=student');
  assert.deepEqual(parseStudentSupportHash(hash), {
    studentRef: 'HS 1/2',
    workspaceId: '12.6 A',
    tab: 'student',
  });
});

test('parser rejects unrelated routes and unsupported tabs', () => {
  assert.deepEqual(parseStudentSupportHash('#/home'), { studentRef: '', workspaceId: '', tab: 'overview' });
  assert.deepEqual(parseStudentSupportHash('#/student-support?tab=evil'), { studentRef: '', workspaceId: '', tab: 'overview' });
});
