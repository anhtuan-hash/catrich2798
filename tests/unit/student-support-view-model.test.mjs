import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeSupportState, filterSupportAlerts } from '../../src/studentSupport/studentSupportViewModel.js';

test('summary counts scoped alerts and cases only', () => {
  const alerts = [
    { id: 'a1', student_ref: 'S1', status: 'NEW' },
    { id: 'a2', student_ref: 'S2', status: 'REVIEWING' },
  ];
  const cases = [
    { id: 'c1', student_ref: 'S1', status: 'ACTIVE', follow_up_at: '2026-09-14T00:00:00Z' },
    { id: 'c2', student_ref: 'S2', status: 'CLOSED' },
  ];
  const summary = summarizeSupportState(alerts, cases, new Date('2026-09-15T00:00:00Z'));
  assert.equal(summary.monitoredStudents, 2);
  assert.equal(summary.newAlerts, 1);
  assert.equal(summary.activeCases, 1);
  assert.equal(summary.followUpDue, 1);
  assert.equal(summary.closedCases, 1);
});

test('alert filtering supports status, class and type', () => {
  const alerts = [
    { id: 'a1', status: 'NEW', source_class_name: '12.6', alert_type: 'attendance_count' },
    { id: 'a2', status: 'REVIEWING', source_class_name: '11.2', alert_type: 'grade_window_drop' },
  ];
  assert.deepEqual(filterSupportAlerts(alerts, { status: 'NEW', className: '12.6' }).map((x) => x.id), ['a1']);
  assert.deepEqual(filterSupportAlerts(alerts, { alertType: 'grade_window_drop' }).map((x) => x.id), ['a2']);
});
