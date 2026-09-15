import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSupportReport } from '../../src/studentSupport/studentSupportExports.js';

test('report aggregates status counts and strips private note bodies', () => {
  const report = buildSupportReport({
    cases: [
      { id: 'c1', source_class_name: '12.6', status: 'ACTIVE', category: 'ATTENDANCE', school_year: '2026-2027', created_at: '2026-09-01T00:00:00Z' },
      { id: 'c2', source_class_name: '12.6', status: 'CLOSED', category: 'LEARNING', school_year: '2026-2027', created_at: '2026-09-02T00:00:00Z' },
    ],
    alerts: [],
    notes: [
      { case_id: 'c1', visibility_scope: 'PRIVATE', body: 'very private text' },
      { case_id: 'c1', visibility_scope: 'HOMEROOM', body: 'homeroom note text' },
    ],
  }, { className: '12.6' });

  assert.deepEqual(report.summary, {
    total: 2,
    active: 1,
    followUp: 0,
    resolved: 0,
    closed: 1,
    noActionRequired: 0,
  });
  assert.equal(JSON.stringify(report).includes('very private text'), false);
  assert.equal(JSON.stringify(report).includes('homeroom note text'), false);
  assert.equal(report.rows.length, 2);
});

test('report filters by class, school year, status and category', () => {
  const report = buildSupportReport({
    cases: [
      { id: 'c1', source_class_name: '12.6', status: 'ACTIVE', category: 'ATTENDANCE', school_year: '2026-2027', created_at: '2026-09-01T00:00:00Z' },
      { id: 'c2', source_class_name: '12.7', status: 'CLOSED', category: 'LEARNING', school_year: '2026-2027', created_at: '2026-09-02T00:00:00Z' },
      { id: 'c3', source_class_name: '12.6', status: 'CLOSED', category: 'ATTENDANCE', school_year: '2025-2026', created_at: '2026-08-02T00:00:00Z' },
    ],
    alerts: [],
    notes: [],
  }, { className: '12.6', schoolYear: '2026-2027', status: 'ACTIVE', category: 'ATTENDANCE' });

  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].id, 'c1');
});
