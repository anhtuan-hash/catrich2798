import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRuleConfig } from '../../src/studentSupport/studentSupportRuleAdmin.js';

test('attendance rule config clamps numeric thresholds and windows', () => {
  const result = normalizeRuleConfig({ rule_type: 'attendance_count', config: { status: 'absent' } }, { threshold: 0, days: 999 });
  assert.deepEqual(result, { status: 'absent', threshold: 1, days: 365 });
});

test('grade drop rule keeps only validated numeric config', () => {
  const result = normalizeRuleConfig({ rule_type: 'grade_window_drop' }, { sampleSize: '4', delta: '1.25', prompt: 'ignored' });
  assert.deepEqual(result, { sampleSize: 4, delta: 1.25 });
  assert.equal('prompt' in result, false);
});

test('observation count preserves fixed observation type and clamps values', () => {
  const result = normalizeRuleConfig({ rule_type: 'observation_count' }, { observationType: 'task_incomplete', threshold: 3, days: 14 });
  assert.deepEqual(result, { observationType: 'TASK_INCOMPLETE', threshold: 3, days: 14 });
});
