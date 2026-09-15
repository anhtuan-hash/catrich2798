import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAttendance, compareGradeWindows } from '../../src/studentSupport/studentSupportAnalytics.js';

test('attendance summary counts factual statuses without risk scoring', () => {
  const result = summarizeAttendance([
    { status: 'present' },
    { status: 'late' },
    { status: 'unexcused' },
    { status: 'excused' },
  ]);
  assert.equal(result.total, 4);
  assert.equal(result.present, 1);
  assert.equal(result.late, 1);
  assert.equal(result.absent, 2);
  assert.equal('riskScore' in result, false);
});

test('grade comparison uses two explicit 3-score windows', () => {
  const result = compareGradeWindows([
    { date: '2026-09-01', score: 8, subject: 'English' },
    { date: '2026-09-02', score: 7, subject: 'English' },
    { date: '2026-09-03', score: 6, subject: 'English' },
    { date: '2026-09-10', score: 6, subject: 'English' },
    { date: '2026-09-11', score: 5, subject: 'English' },
    { date: '2026-09-12', score: 4, subject: 'English' },
  ], 3);
  assert.equal(result.sampleSize, 3);
  assert.equal(result.previousAverage, 7);
  assert.equal(result.recentAverage, 5);
  assert.equal(result.delta, -2);
  assert.equal(result.hasEnoughData, true);
});

test('grade comparison reports insufficient data instead of inferring a trend', () => {
  const result = compareGradeWindows([{ date: '2026-09-12', score: 5, subject: 'English' }], 3);
  assert.equal(result.hasEnoughData, false);
  assert.equal(result.delta, null);
});
