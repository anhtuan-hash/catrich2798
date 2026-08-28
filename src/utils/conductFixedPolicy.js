import { OFFICIAL_CONDUCT_RULES } from '../data/homeroomConduct.js';
import {
  calculateWeeklyConduct,
  conductWeeksForWorkspace,
} from './homeroomConduct.js';

export const FIXED_CONDUCT_POLICY = Object.freeze({
  weeklyBaseScore: 100,
  divisor: 25,
  maximum: 4,
  thresholds: Object.freeze({ good: 3.6, fair: 3.0, pass: 2.4 }),
});

const PROHIBITED_RULES = OFFICIAL_CONDUCT_RULES.filter((rule) => rule?.isProhibited === true);
const PROHIBITED_IDS = new Set(PROHIBITED_RULES.map((rule) => String(rule.id || '').trim()).filter(Boolean));
const PROHIBITED_CODES = new Set(PROHIBITED_RULES.map((rule) => String(rule.code || '').trim()).filter(Boolean));
const PROHIBITED_TITLES = new Set(PROHIBITED_RULES.map((rule) => String(rule.title || '').trim().toLowerCase()).filter(Boolean));
const PROHIBITED_CATEGORY = 'hành vi nghiêm cấm';

function text(value) {
  return String(value ?? '').trim();
}

export function conductWeekPoint(score) {
  const numeric = Number(score);
  const safe = Number.isFinite(numeric) ? numeric : FIXED_CONDUCT_POLICY.weeklyBaseScore;
  return Math.max(0, Math.min(FIXED_CONDUCT_POLICY.maximum, safe / FIXED_CONDUCT_POLICY.divisor));
}

export function classifyConductPoint(point) {
  const value = Number(point) || 0;
  if (value >= FIXED_CONDUCT_POLICY.thresholds.good) return { id: 'good', label: 'Tốt' };
  if (value >= FIXED_CONDUCT_POLICY.thresholds.fair) return { id: 'fair', label: 'Khá' };
  if (value >= FIXED_CONDUCT_POLICY.thresholds.pass) return { id: 'pass', label: 'Đạt' };
  return { id: 'fail', label: 'Chưa đạt' };
}

export function downgradeConductOneLevel(classification = {}) {
  const order = ['good', 'fair', 'pass', 'fail'];
  const labels = { good: 'Tốt', fair: 'Khá', pass: 'Đạt', fail: 'Chưa đạt' };
  const index = order.indexOf(classification?.id);
  const nextId = index < 0 ? 'fail' : order[Math.min(index + 1, order.length - 1)];
  return { id: nextId, label: labels[nextId] };
}

export function isConfirmedProhibitedRecord(record = {}) {
  const status = (text(record.status) || 'confirmed').toLowerCase();
  if (status !== 'confirmed') return false;
  const ruleId = text(record.ruleId);
  const code = text(record.code);
  const title = text(record.title).toLowerCase();
  const category = text(record.category).toLowerCase();
  return record.isProhibited === true
    || PROHIBITED_IDS.has(ruleId)
    || PROHIBITED_CODES.has(code)
    || PROHIBITED_TITLES.has(title)
    || category === PROHIBITED_CATEGORY;
}

export function prohibitedRecordsForRange(workspace, startDate, endDate, studentId = '') {
  return (Array.isArray(workspace?.conductRecords) ? workspace.conductRecords : []).filter((record) => {
    if (!isConfirmedProhibitedRecord(record)) return false;
    if (studentId && record.studentId !== studentId) return false;
    const date = text(record.date || record.weekStart).slice(0, 10);
    if (!date) return false;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  });
}

export function calculateFixedConductPeriod(workspace, startDate, endDate) {
  const weeks = conductWeeksForWorkspace(workspace, startDate, endDate, {
    includeOrientation: true,
    includeInAverageOnly: true,
  });
  const rowsByWeek = weeks.map((weekStart) => calculateWeeklyConduct(workspace, weekStart));
  const students = (Array.isArray(workspace?.students) ? workspace.students : []).filter((student) => student?.active !== false);

  return students.map((student) => {
    const weekly = rowsByWeek
      .map((rows) => rows.find((row) => row.student.id === student.id))
      .filter(Boolean);
    const weeklyPoints = weekly.map((row) => conductWeekPoint(row.score));
    const average = weeklyPoints.length
      ? weeklyPoints.reduce((sum, point) => sum + point, 0) / weeklyPoints.length
      : FIXED_CONDUCT_POLICY.maximum;
    const roundedAverage = Math.round(average * 100) / 100;
    const baseClassification = classifyConductPoint(roundedAverage);
    const prohibitedRecords = prohibitedRecordsForRange(workspace, startDate, endDate, student.id);
    const prohibitedViolationCount = prohibitedRecords.length;
    const prohibitedDowngraded = prohibitedViolationCount > 0 && baseClassification.id !== 'fail';
    const classification = prohibitedViolationCount > 0
      ? downgradeConductOneLevel(baseClassification)
      : baseClassification;

    return {
      student,
      weekCount: weekly.length,
      weekly,
      weeklyPoints,
      average: roundedAverage,
      baseClassification,
      classification,
      prohibitedRecords,
      prohibitedViolationCount,
      prohibitedDowngraded,
      totalDeduction: weekly.reduce((sum, row) => sum + Number(row.totalDeduction || 0), 0),
      totalBonus: weekly.reduce((sum, row) => sum + Number(row.totalBonus || 0), 0),
      lockedWeeks: weekly.filter((row) => row.locked).length,
    };
  });
}
