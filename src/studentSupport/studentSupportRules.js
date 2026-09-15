import { STUDENT_SUPPORT_RULE_TYPES } from './studentSupportConstants.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const RULE_TYPES = new Set(STUDENT_SUPPORT_RULE_TYPES);

function text(value) {
  return String(value ?? '').trim();
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampInteger(value, fallback, min = 1, max = 365) {
  const number = Math.trunc(finiteNumber(value, fallback));
  return Math.max(min, Math.min(max, number));
}

function dateOnly(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = text(value);
  if (!raw) return '';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00Z`) : new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : '';
}

function dateMs(value) {
  const day = dateOnly(value);
  return day ? Date.parse(`${day}T00:00:00Z`) : Number.NaN;
}

function rollingWindow(now, days) {
  const end = dateMs(now);
  const safeEnd = Number.isFinite(end) ? end : Date.now();
  const count = clampInteger(days, 1);
  const start = safeEnd - (count - 1) * DAY_MS;
  return {
    startMs: start,
    endMs: safeEnd,
    windowStart: new Date(start).toISOString().slice(0, 10),
    windowEnd: new Date(safeEnd).toISOString().slice(0, 10),
  };
}

function inWindow(itemDate, window) {
  const value = dateMs(itemDate);
  return Number.isFinite(value) && value >= window.startMs && value <= window.endMs;
}

function round2(value) {
  return Math.round((finiteNumber(value) + Number.EPSILON) * 100) / 100;
}

function average(values) {
  if (!values.length) return null;
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sortChronological(items = []) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const left = dateMs(a?.date ?? a?.recordedAt ?? a?.observationDate);
    const right = dateMs(b?.date ?? b?.recordedAt ?? b?.observationDate);
    if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
    if (!Number.isFinite(left)) return -1;
    if (!Number.isFinite(right)) return 1;
    return left - right;
  });
}

function baseResult(rule, overrides = {}) {
  return {
    triggered: false,
    ruleId: text(rule?.id),
    ruleCode: text(rule?.code),
    evidence: {},
    windowStart: '',
    windowEnd: '',
    metric: 0,
    ...overrides,
  };
}

function evaluateAttendanceCount(rule, facts, now) {
  const config = rule?.config || {};
  const threshold = clampInteger(config.threshold, 1, 1, 1000);
  const days = clampInteger(config.days, 14, 1, 3650);
  const expectedStatus = text(config.status).toLowerCase();
  const window = rollingWindow(now, days);
  const matches = (facts?.attendance || []).filter((item) => (
    inWindow(item?.date ?? item?.attendanceDate, window)
    && (!expectedStatus || text(item?.status).toLowerCase() === expectedStatus)
  ));
  return baseResult(rule, {
    triggered: matches.length >= threshold,
    metric: matches.length,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
    evidence: {
      ruleType: 'attendance_count',
      status: expectedStatus,
      threshold,
      days,
      count: matches.length,
      dates: matches.map((item) => dateOnly(item?.date ?? item?.attendanceDate)).filter(Boolean),
    },
  });
}

function numericGrades(facts) {
  return sortChronological(facts?.grades || [])
    .map((item) => ({ ...item, numericScore: Number(item?.score) }))
    .filter((item) => Number.isFinite(item.numericScore));
}

function evaluateGradeWindowDrop(rule, facts) {
  const config = rule?.config || {};
  const sampleSize = clampInteger(config.sampleSize, 3, 1, 20);
  const delta = Math.max(0, finiteNumber(config.delta, 1));
  const grades = numericGrades(facts);
  const required = sampleSize * 2;
  if (grades.length < required) {
    return baseResult(rule, {
      evidence: { ruleType: 'grade_window_drop', reason: 'insufficient_data', sampleSize, available: grades.length, required },
    });
  }
  const selected = grades.slice(-required);
  const previous = selected.slice(0, sampleSize);
  const latest = selected.slice(sampleSize);
  const previousAverage = average(previous.map((item) => item.numericScore));
  const latestAverage = average(latest.map((item) => item.numericScore));
  const drop = round2(previousAverage - latestAverage);
  return baseResult(rule, {
    triggered: drop >= delta,
    metric: drop,
    windowStart: dateOnly(selected[0]?.date),
    windowEnd: dateOnly(selected.at(-1)?.date),
    evidence: {
      ruleType: 'grade_window_drop',
      sampleSize,
      delta,
      previousAverage,
      latestAverage,
      drop,
      previousScores: previous.map((item) => item.numericScore),
      latestScores: latest.map((item) => item.numericScore),
    },
  });
}

function evaluateConsecutiveScoresBelow(rule, facts) {
  const config = rule?.config || {};
  const count = clampInteger(config.count ?? config.sampleSize, 3, 1, 20);
  const threshold = finiteNumber(config.threshold, 5);
  const grades = numericGrades(facts);
  if (grades.length < count) {
    return baseResult(rule, {
      evidence: { ruleType: 'consecutive_scores_below', reason: 'insufficient_data', count, available: grades.length },
    });
  }
  const latest = grades.slice(-count);
  const belowCount = latest.filter((item) => item.numericScore < threshold).length;
  return baseResult(rule, {
    triggered: belowCount === count,
    metric: belowCount,
    windowStart: dateOnly(latest[0]?.date),
    windowEnd: dateOnly(latest.at(-1)?.date),
    evidence: {
      ruleType: 'consecutive_scores_below',
      threshold,
      count,
      belowCount,
      scores: latest.map((item) => item.numericScore),
    },
  });
}

function evaluateObservationCount(rule, facts, now) {
  const config = rule?.config || {};
  const threshold = clampInteger(config.threshold, 1, 1, 1000);
  const days = clampInteger(config.days, 14, 1, 3650);
  const observationType = text(config.observationType ?? config.type).toUpperCase();
  const window = rollingWindow(now, days);
  const matches = (facts?.observations || []).filter((item) => {
    const itemType = text(item?.type ?? item?.observationType ?? item?.observation_type).toUpperCase();
    const itemDate = item?.date ?? item?.observationDate ?? item?.observation_date ?? item?.createdAt ?? item?.created_at;
    return inWindow(itemDate, window) && (!observationType || itemType === observationType);
  });
  return baseResult(rule, {
    triggered: matches.length >= threshold,
    metric: matches.length,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
    evidence: {
      ruleType: 'observation_count',
      observationType,
      threshold,
      days,
      count: matches.length,
      dates: matches.map((item) => dateOnly(item?.date ?? item?.observationDate ?? item?.observation_date ?? item?.createdAt ?? item?.created_at)).filter(Boolean),
    },
  });
}

function evaluateCombinedAll(rule, facts, now) {
  const configuredRules = Array.isArray(rule?.config?.rules) ? rule.config.rules : [];
  if (!configuredRules.length) {
    return baseResult(rule, { evidence: { ruleType: 'combined_all', reason: 'empty_components', components: [] } });
  }
  const components = configuredRules.map((component, index) => evaluateRule({
    id: `${text(rule?.id || rule?.code)}:component:${index}`,
    version: rule?.version || 1,
    code: `${text(rule?.code)}:component:${index}`,
    ruleType: component?.ruleType,
    config: component?.config || {},
  }, facts, now));
  const starts = components.map((item) => item.windowStart).filter(Boolean).sort();
  const ends = components.map((item) => item.windowEnd).filter(Boolean).sort();
  return baseResult(rule, {
    triggered: components.every((item) => item.triggered),
    metric: components.filter((item) => item.triggered).length,
    windowStart: starts[0] || '',
    windowEnd: ends.at(-1) || '',
    evidence: { ruleType: 'combined_all', components },
  });
}

export function evaluateRule(rule, facts = {}, now = new Date()) {
  const ruleType = text(rule?.ruleType ?? rule?.rule_type);
  if (!RULE_TYPES.has(ruleType)) {
    return baseResult(rule, { evidence: { reason: 'unsupported_rule_type', ruleType } });
  }
  const normalizedRule = { ...rule, ruleType, config: rule?.config || {} };
  switch (ruleType) {
    case 'attendance_count': return evaluateAttendanceCount(normalizedRule, facts, now);
    case 'grade_window_drop': return evaluateGradeWindowDrop(normalizedRule, facts);
    case 'consecutive_scores_below': return evaluateConsecutiveScoresBelow(normalizedRule, facts);
    case 'observation_count': return evaluateObservationCount(normalizedRule, facts, now);
    case 'combined_all': return evaluateCombinedAll(normalizedRule, facts, now);
    default: return baseResult(normalizedRule, { evidence: { reason: 'unsupported_rule_type', ruleType } });
  }
}

export function makeAlertDedupeKey(rule, studentRef, windowStart, windowEnd) {
  const identity = text(rule?.id || rule?.code || 'rule');
  const version = clampInteger(rule?.version, 1, 1, 1000000);
  return [identity, `v${version}`, text(studentRef).toLowerCase(), dateOnly(windowStart), dateOnly(windowEnd)].join('|');
}

export function evaluateRules(rules = [], factsByStudent = {}, now = new Date()) {
  const results = [];
  for (const [studentRef, facts] of Object.entries(factsByStudent || {})) {
    if (!text(studentRef)) continue;
    for (const rule of Array.isArray(rules) ? rules : []) {
      if (rule?.enabled === false) continue;
      const result = evaluateRule(rule, facts, now);
      if (!result.triggered) continue;
      results.push({
        ...result,
        studentRef,
        dedupeKey: makeAlertDedupeKey(rule, studentRef, result.windowStart, result.windowEnd),
      });
    }
  }
  return results;
}
