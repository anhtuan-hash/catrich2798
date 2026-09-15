import { supabase } from '../utils/supabase.js';

function clampNumber(value, fallback, min, max, integer = false) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  const clamped = Math.max(min, Math.min(max, safe));
  return integer ? Math.round(clamped) : Math.round(clamped * 100) / 100;
}

export function normalizeRuleConfig(rule = {}, config = {}) {
  const type = String(rule.rule_type || rule.ruleType || '').trim();
  const source = { ...(rule.config || {}), ...(config || {}) };
  if (type === 'attendance_count') return {
    status: String(source.status || 'absent').trim().toLowerCase(),
    threshold: clampNumber(source.threshold, 3, 1, 100, true),
    days: clampNumber(source.days, 14, 1, 365, true),
  };
  if (type === 'grade_window_drop') return {
    sampleSize: clampNumber(source.sampleSize, 3, 1, 10, true),
    delta: clampNumber(source.delta, 1, 0.1, 10, false),
  };
  if (type === 'consecutive_scores_below') return {
    count: clampNumber(source.count ?? source.sampleSize, 3, 1, 10, true),
    threshold: clampNumber(source.threshold, 5, 0, 10, false),
  };
  if (type === 'observation_count') return {
    observationType: String(source.observationType || source.type || 'TASK_INCOMPLETE').trim().toUpperCase(),
    threshold: clampNumber(source.threshold, 3, 1, 100, true),
    days: clampNumber(source.days, 14, 1, 365, true),
  };
  return rule.config || {};
}

export async function updateStudentSupportRule(rule, patch = {}) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  if (!rule?.id) throw new Error('Rule id is required.');
  const payload = {
    enabled: Boolean(patch.enabled ?? rule.enabled),
    config: normalizeRuleConfig(rule, patch.config || rule.config || {}),
  };
  const { data, error } = await supabase
    .from('student_support_rules')
    .update(payload)
    .eq('id', rule.id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
