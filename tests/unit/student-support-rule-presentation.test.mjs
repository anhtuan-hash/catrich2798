import test from 'node:test';
import assert from 'node:assert/strict';
import { describeRuleConfig } from '../../src/studentSupport/studentSupportRulePresentation.js';

test('attendance rule description exposes threshold and window', () => {
  const text = describeRuleConfig({ rule_type: 'attendance_count', config: { status: 'absent', threshold: 3, days: 14 } }, 'vi');
  assert.match(text, /3/);
  assert.match(text, /14/);
  assert.match(text, /vắng/i);
});

test('grade rule description exposes exact comparison rather than prediction', () => {
  const text = describeRuleConfig({ rule_type: 'grade_window_drop', config: { sampleSize: 3, delta: 1 } }, 'vi');
  assert.match(text, /3/);
  assert.match(text, /1/);
  assert.doesNotMatch(text, /dự đoán|rủi ro|AI/i);
});
