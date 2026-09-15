import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isActionOverdue,
  isCaseFollowUpDue,
  isAlertReviewOverdue,
  buildStudentSupportNotification,
} from '../../src/studentSupport/studentSupportNotifications.js';

const now = new Date('2026-09-15T04:00:00Z');

test('overdue selectors are deterministic and never mutate workflow state', () => {
  assert.equal(isActionOverdue({ status: 'TODO', due_at: '2026-09-14T04:00:00Z' }, now), true);
  assert.equal(isActionOverdue({ status: 'DONE', due_at: '2026-09-14T04:00:00Z' }, now), false);
  assert.equal(isCaseFollowUpDue({ status: 'FOLLOW_UP', follow_up_at: '2026-09-15T03:00:00Z' }, now), true);
  assert.equal(isCaseFollowUpDue({ status: 'CLOSED', follow_up_at: '2026-09-15T03:00:00Z' }, now), false);
  assert.equal(isAlertReviewOverdue({ status: 'NEW', first_triggered_at: '2026-09-12T04:00:00Z' }, now, 48), true);
});

test('notification content comes from fixed templates', () => {
  const item = buildStudentSupportNotification({
    type: 'ACTION_OVERDUE',
    target: '#/student-support?tab=cases',
    studentRef: 'HS-1',
  });
  assert.equal(item.title, 'Student Support');
  assert.match(item.message, /quá hạn|overdue/i);
  assert.equal(item.source, 'student-support');
  assert.equal(item.target, '#/student-support?tab=cases');
});
