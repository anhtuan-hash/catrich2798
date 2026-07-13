import { DEFAULT_CONDUCT_THRESHOLDS, OFFICIAL_CONDUCT_RULES } from '../data/homeroomConduct.js';
import {
  PETRUS_KY_ACADEMIC_PLAN_2026_2027,
  findPetrusKyPlanRow,
} from '../data/homeroomAcademicPlan.js';
import { normalizeHomeroomWorkspace } from './homeroomStore.js';



export const DEFAULT_CONDUCT_LOCK_PASSWORD = 'PEK@2026';

export function isGrade12Workspace(workspace) {
  const current = normalizeHomeroomWorkspace(workspace);
  const grade = safeText(current.classProfile?.grade).toLowerCase();
  const className = safeText(current.classProfile?.className).toLowerCase();
  return /(^|\D)12(\D|$)/.test(grade) || /(^|\D)12(\D|$)/.test(className);
}

export async function hashConductLockPassword(value) {
  const input = safeText(value);
  if (!input) return '';
  if (!globalThis.crypto?.subtle) throw new Error('Trình duyệt không hỗ trợ mã hóa mật khẩu.');
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyConductLockPassword(workspace, password) {
  const current = normalizeHomeroomWorkspace(workspace);
  const input = safeText(password);
  if (!input) return false;
  const storedHash = safeText(current.conductSettings?.lockPasswordHash);
  if (!storedHash) return input === DEFAULT_CONDUCT_LOCK_PASSWORD;
  return (await hashConductLockPassword(input)) === storedHash;
}

export async function changeConductLockPassword(workspace, newPassword, actor = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  const password = safeText(newPassword);
  if (password.length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
  const changedAt = new Date().toISOString();
  return {
    ...current,
    conductSettings: {
      ...(current.conductSettings || {}),
      lockPasswordHash: await hashConductLockPassword(password),
      lockPasswordChangedAt: changedAt,
      lockPasswordChangedBy: safeText(actor),
      lockPasswordUsesDefault: false,
    },
    updatedAt: changedAt,
  };
}

export function resetConductLockPassword(workspace, actor = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  const changedAt = new Date().toISOString();
  return {
    ...current,
    conductSettings: {
      ...(current.conductSettings || {}),
      lockPasswordHash: '',
      lockPasswordChangedAt: changedAt,
      lockPasswordChangedBy: safeText(actor),
      lockPasswordUsesDefault: true,
    },
    updatedAt: changedAt,
  };
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function uid(prefix = 'conduct') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const match = safeText(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

function today() {
  return toLocalIsoDate(new Date());
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(safeText(value)) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function schoolYearNumbers(value = '') {
  const match = safeText(value).match(/(20\d{2})\D+(20\d{2})/);
  const startYear = match ? Number(match[1]) : new Date().getFullYear();
  const endYear = match ? Number(match[2]) : startYear + 1;
  return { startYear, endYear: endYear > startYear ? endYear : startYear + 1 };
}

export function createAcademicCalendarDefaults(schoolYear = '') {
  const { startYear, endYear } = schoolYearNumbers(schoolYear);
  if (`${startYear}-${endYear}` === PETRUS_KY_ACADEMIC_PLAN_2026_2027.schoolYear) {
    return { ...PETRUS_KY_ACADEMIC_PLAN_2026_2027.calendar };
  }
  return {
    schoolYearStart: `${startYear}-08-01`,
    schoolYearEnd: `${endYear}-05-31`,
    semester1Start: `${startYear}-08-01`,
    midterm1End: `${startYear}-10-31`,
    semester1End: `${startYear}-12-31`,
    semester2Start: `${endYear}-01-01`,
    midterm2End: `${endYear}-03-31`,
    semester2End: `${endYear}-05-31`,
  };
}

export function getActiveConductAcademicPlan(workspace) {
  const current = normalizeHomeroomWorkspace(workspace);
  const planId = safeText(current.conductSettings?.academicPlanId);
  const mode = safeText(current.conductSettings?.academicCalendarMode, 'school-plan');
  const { startYear, endYear } = schoolYearNumbers(current.classProfile?.schoolYear);
  const normalizedSchoolYear = `${startYear}-${endYear}`;
  const planSelected = !planId || planId === PETRUS_KY_ACADEMIC_PLAN_2026_2027.id;
  if (mode === 'school-plan' && planSelected && normalizedSchoolYear === PETRUS_KY_ACADEMIC_PLAN_2026_2027.schoolYear) {
    return PETRUS_KY_ACADEMIC_PLAN_2026_2027;
  }
  return null;
}

export function inferAcademicCalendar(workspace) {
  const current = normalizeHomeroomWorkspace(workspace);
  const plan = getActiveConductAcademicPlan(current);
  if (plan) return { ...plan.calendar };
  const defaults = createAcademicCalendarDefaults(current.classProfile?.schoolYear);
  const saved = current.conductSettings?.academicCalendar || {};
  const ranges = current.conductSettings?.periodRanges || {};
  return {
    ...defaults,
    schoolYearStart: saved.schoolYearStart || ranges.year?.start || defaults.schoolYearStart,
    schoolYearEnd: saved.schoolYearEnd || ranges.year?.end || defaults.schoolYearEnd,
    semester1Start: saved.semester1Start || ranges.semester1?.start || defaults.semester1Start,
    midterm1End: saved.midterm1End || ranges.mid1?.end || defaults.midterm1End,
    semester1End: saved.semester1End || ranges.semester1?.end || defaults.semester1End,
    semester2Start: saved.semester2Start || ranges.semester2?.start || defaults.semester2Start,
    midterm2End: saved.midterm2End || ranges.mid2?.end || defaults.midterm2End,
    semester2End: saved.semester2End || ranges.semester2?.end || defaults.semester2End,
  };
}

export function buildPeriodRangesFromAcademicCalendar(calendar = {}, currentRanges = {}) {
  const defaults = createAcademicCalendarDefaults();
  const value = { ...defaults, ...(calendar || {}) };
  return {
    ...currentRanges,
    mid1: { ...(currentRanges.mid1 || {}), label: 'Giữa học kỳ I', start: value.semester1Start, end: value.midterm1End },
    semester1: { ...(currentRanges.semester1 || {}), label: 'Cuối học kỳ I', start: value.semester1Start, end: value.semester1End },
    mid2: { ...(currentRanges.mid2 || {}), label: 'Giữa học kỳ II', start: value.semester2Start, end: value.midterm2End },
    semester2: { ...(currentRanges.semester2 || {}), label: 'Cuối học kỳ II', start: value.semester2Start, end: value.semester2End },
    year: { ...(currentRanges.year || {}), label: 'Cả năm', start: value.schoolYearStart, end: value.schoolYearEnd },
  };
}


export function buildConductPeriodRangesForWorkspace(workspace, calendar = {}, currentRanges = {}) {
  const ranges = buildPeriodRangesFromAcademicCalendar(calendar, currentRanges);
  const plan = getActiveConductAcademicPlan(workspace);
  if (!isGrade12Workspace(workspace)) return ranges;
  const summerStart = plan?.rows.find((row) => row.kind === 'summer-prep' && row.conductEligible)?.startDate
    || (calendar?.schoolYearStart === PETRUS_KY_ACADEMIC_PLAN_2026_2027.calendar.schoolYearStart
      ? PETRUS_KY_ACADEMIC_PLAN_2026_2027.supplementalRows?.[0]?.startDate
      : '');
  if (!summerStart) return ranges;
  return {
    ...ranges,
    mid1: { ...ranges.mid1, start: summerStart },
    semester1: { ...ranges.semester1, start: summerStart },
    year: { ...ranges.year, start: summerStart },
  };
}

export function validateAcademicCalendar(calendar = {}) {
  const value = calendar || {};
  const fields = [
    ['schoolYearStart', 'Ngày bắt đầu năm học'], ['schoolYearEnd', 'Ngày kết thúc năm học'],
    ['semester1Start', 'Ngày bắt đầu học kỳ I'], ['midterm1End', 'Mốc giữa học kỳ I'], ['semester1End', 'Ngày kết thúc học kỳ I'],
    ['semester2Start', 'Ngày bắt đầu học kỳ II'], ['midterm2End', 'Mốc giữa học kỳ II'], ['semester2End', 'Ngày kết thúc học kỳ II'],
  ];
  const errors = fields.filter(([key]) => !isIsoDate(value[key])).map(([, label]) => `${label} chưa hợp lệ.`);
  if (errors.length) return errors;
  const beforeOrEqual = (a, b) => value[a] <= value[b];
  if (!beforeOrEqual('schoolYearStart', 'schoolYearEnd')) errors.push('Ngày kết thúc năm học phải sau ngày bắt đầu.');
  if (!beforeOrEqual('semester1Start', 'midterm1End') || !beforeOrEqual('midterm1End', 'semester1End')) errors.push('Mốc giữa học kỳ I phải nằm trong học kỳ I.');
  if (!beforeOrEqual('semester2Start', 'midterm2End') || !beforeOrEqual('midterm2End', 'semester2End')) errors.push('Mốc giữa học kỳ II phải nằm trong học kỳ II.');
  if (value.semester1Start < value.schoolYearStart || value.semester1End > value.schoolYearEnd) errors.push('Học kỳ I phải nằm trong thời gian năm học.');
  if (value.semester2Start < value.schoolYearStart || value.semester2End > value.schoolYearEnd) errors.push('Học kỳ II phải nằm trong thời gian năm học.');
  if (value.semester1End >= value.semester2Start) errors.push('Học kỳ II phải bắt đầu sau khi học kỳ I kết thúc.');
  return [...new Set(errors)];
}

export function startOfConductWeek(dateValue = today()) {
  const date = parseLocalDate(safeText(dateValue, today()));
  if (Number.isNaN(date.getTime())) return today();
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return toLocalIsoDate(date);
}

export function endOfConductWeek(dateValue = today()) {
  const date = parseLocalDate(startOfConductWeek(dateValue));
  if (Number.isNaN(date.getTime())) return today();
  date.setDate(date.getDate() + 6);
  return toLocalIsoDate(date);
}

export function enumerateConductWeeks(startDate, endDate) {
  const start = parseLocalDate(startOfConductWeek(startDate));
  const end = parseLocalDate(safeText(endDate, startDate));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const weeks = [];
  const cursor = new Date(start);
  while (cursor <= end && weeks.length < 60) {
    weeks.push(toLocalIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}


export function conductPlanRowsForWorkspace(workspace, options = {}) {
  const plan = getActiveConductAcademicPlan(workspace);
  if (!plan) return [];
  const includeNonConduct = options.includeNonConduct === true;
  const includeOrientation = options.includeOrientation !== false;
  const includeInAverageOnly = options.includeInAverageOnly === true;
  return plan.rows.filter((row) => {
    if (!includeNonConduct && !row.conductEligible) return false;
    if (!includeOrientation && row.kind === 'orientation') return false;
    if (includeInAverageOnly && !row.includeInAverage) return false;
    return true;
  });
}

export function findConductPlanRow(workspace, value) {
  const plan = getActiveConductAcademicPlan(workspace);
  if (!plan) return null;
  const date = safeText(value).slice(0, 10);
  if (!date) return null;
  return plan.rows.find((row) => date >= row.startDate && date <= row.endDate) || null;
}

export function resolveConductWeekStart(workspace, value = today(), options = {}) {
  const plan = getActiveConductAcademicPlan(workspace);
  const date = safeText(value, today()).slice(0, 10);
  if (!plan) return startOfConductWeek(date);
  const row = findConductPlanRow(workspace, date) || findPetrusKyPlanRow(date);
  if (row?.conductEligible) return row.startDate;
  if (options.nearest === true) {
    const eligible = plan.rows.filter((item) => item.conductEligible);
    const previous = [...eligible].reverse().find((item) => item.startDate <= date);
    return (previous || eligible[0])?.startDate || startOfConductWeek(date);
  }
  if (options.allowOutsidePlan === true) return startOfConductWeek(date);
  throw new Error('Ngày đã chọn không thuộc tuần rèn luyện trong Khung kế hoạch năm học 2026-2027.');
}

export function conductWeekEndForWorkspace(workspace, weekStart) {
  const row = findConductPlanRow(workspace, weekStart);
  return row?.conductEligible ? row.endDate : endOfConductWeek(weekStart);
}

export function conductWeeksForWorkspace(workspace, startDate = '', endDate = '', options = {}) {
  const plan = getActiveConductAcademicPlan(workspace);
  if (!plan) {
    const calendar = inferAcademicCalendar(workspace);
    return enumerateConductWeeks(startDate || calendar.schoolYearStart, endDate || calendar.schoolYearEnd);
  }
  const includeOrientation = options.includeOrientation === true;
  const includeInAverageOnly = options.includeInAverageOnly !== false;
  return plan.rows
    .filter((row) => row.conductEligible)
    .filter((row) => includeOrientation || row.kind !== 'orientation')
    .filter((row) => !includeInAverageOnly || row.includeInAverage || (row.kind === 'summer-prep' && isGrade12Workspace(workspace)))
    .filter((row) => !startDate || row.endDate >= startDate)
    .filter((row) => !endDate || row.startDate <= endDate)
    .map((row) => row.startDate);
}

export function classifyConductScore(score, thresholds = DEFAULT_CONDUCT_THRESHOLDS) {
  const value = Number(score) || 0;
  const good = Number(thresholds?.good ?? DEFAULT_CONDUCT_THRESHOLDS.good);
  const fair = Number(thresholds?.fair ?? DEFAULT_CONDUCT_THRESHOLDS.fair);
  const pass = Number(thresholds?.pass ?? DEFAULT_CONDUCT_THRESHOLDS.pass);
  if (value >= good) return { id: 'good', label: 'Tốt' };
  if (value >= fair) return { id: 'fair', label: 'Khá' };
  if (value >= pass) return { id: 'pass', label: 'Đạt' };
  return { id: 'fail', label: 'Chưa đạt' };
}

export function allConductRules(workspace) {
  const current = normalizeHomeroomWorkspace(workspace);
  const custom = (current.conductCustomRules || []).filter((item) => item.active !== false).map((item) => ({
    ...item,
    source: 'custom',
    schoolPoint: item.schoolPoint ?? null,
    personalDeduction: Math.max(5, Number(item.personalDeduction) || 5),
  }));
  return [...OFFICIAL_CONDUCT_RULES.map((item) => ({ ...item, source: 'official' })), ...custom];
}

export function findConductRule(workspace, ruleId) {
  return allConductRules(workspace).find((item) => item.id === ruleId) || null;
}

export function addCustomConductRule(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const title = safeText(input.title);
  const deduction = Math.max(5, Number(input.personalDeduction) || 0);
  if (!title) throw new Error('Cần nhập tên vi phạm mới.');
  if (!Number.isFinite(deduction) || deduction < 5) throw new Error('Điểm trừ tối thiểu là 5.');
  const id = safeText(input.id, uid('custom-rule'));
  const existing = current.conductCustomRules.find((item) => item.id === id);
  const item = {
    id,
    code: safeText(input.code, `NEW-${String(current.conductCustomRules.length + 1).padStart(2, '0')}`),
    category: safeText(input.category, 'Nội quy bổ sung'),
    title,
    description: safeText(input.description),
    personalDeduction: deduction,
    severity: safeText(input.severity, deduction >= 40 ? 'critical' : deduction >= 20 ? 'serious' : deduction >= 10 ? 'moderate' : 'normal'),
    reference: safeText(input.reference, 'Nội quy bổ sung của trường'),
    effectiveDate: safeText(input.effectiveDate, today()),
    active: input.active !== false,
    source: 'custom',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return {
    ...current,
    conductCustomRules: [item, ...current.conductCustomRules.filter((entry) => entry.id !== id)],
    updatedAt: new Date().toISOString(),
  };
}

export function setCustomConductRuleActive(workspace, ruleId, active) {
  const current = normalizeHomeroomWorkspace(workspace);
  return {
    ...current,
    conductCustomRules: current.conductCustomRules.map((item) => item.id === ruleId ? { ...item, active, updatedAt: new Date().toISOString() } : item),
    updatedAt: new Date().toISOString(),
  };
}

export function getConductWeekSummary(workspace, weekStart) {
  const current = normalizeHomeroomWorkspace(workspace);
  const key = startOfConductWeek(weekStart);
  return (current.conductWeekSummaries || []).find((item) => startOfConductWeek(item.weekStart) === key) || null;
}

export function isConductWeekLocked(workspace, weekStart) {
  return getConductWeekSummary(workspace, weekStart)?.status === 'locked';
}

function normalizeRecordPoints(input = {}, existing = {}) {
  const entryType = safeText(input.entryType, existing.entryType || 'violation') === 'reward' ? 'reward' : 'violation';
  if (entryType === 'reward') {
    const bonus = Math.max(1, Number(input.bonus ?? input.points ?? existing.bonus) || 0);
    if (!Number.isFinite(bonus) || bonus < 1) throw new Error('Điểm thưởng tối thiểu là 1.');
    return { entryType, deduction: 0, bonus };
  }
  const deduction = Math.max(5, Number(input.deduction ?? input.points ?? existing.deduction) || 0);
  if (!Number.isFinite(deduction) || deduction < 5) throw new Error('Điểm trừ tối thiểu là 5.');
  return { entryType, deduction, bonus: 0 };
}

export function addConductRecord(workspace, input = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const studentId = safeText(input.studentId);
  const title = safeText(input.title);
  const date = safeText(input.date, today());
  const weekKey = resolveConductWeekStart(current, input.weekStart || date, { allowOutsidePlan: input.allowOutsidePlan === true });
  const points = normalizeRecordPoints(input);
  if (!studentId) throw new Error('Cần chọn học sinh.');
  if (!title) throw new Error(points.entryType === 'reward' ? 'Cần nhập nội dung khen thưởng.' : 'Cần chọn hoặc nhập nội dung vi phạm.');
  if (!isIsoDate(date)) throw new Error('Ngày ghi nhận chưa hợp lệ.');
  if (!input.allowLocked && isConductWeekLocked(current, weekKey)) throw new Error('Tuần này đã được tổng kết và khóa. Hãy mở khóa tuần trước khi bổ sung dữ liệu.');
  const id = safeText(input.id, uid('conduct-record'));
  const existing = current.conductRecords.find((item) => item.id === id);
  const item = {
    id,
    studentId,
    date,
    weekStart: weekKey,
    ruleId: safeText(input.ruleId),
    code: safeText(input.code, points.entryType === 'reward' ? 'BONUS' : ''),
    category: safeText(input.category, points.entryType === 'reward' ? 'Khen thưởng / khắc phục' : 'Khác'),
    title,
    entryType: points.entryType,
    deduction: points.deduction,
    bonus: points.bonus,
    schoolPoint: input.schoolPoint === null || input.schoolPoint === undefined || input.schoolPoint === '' ? null : Number(input.schoolPoint),
    note: input.note === undefined ? safeText(existing?.note) : safeText(input.note),
    evidence: input.evidence === undefined ? safeText(existing?.evidence) : safeText(input.evidence),
    severity: safeText(input.severity, points.entryType === 'reward' ? 'positive' : points.deduction >= 40 ? 'critical' : points.deduction >= 20 ? 'serious' : points.deduction >= 10 ? 'moderate' : 'normal'),
    status: safeText(input.status, 'confirmed'),
    source: safeText(input.source, 'manual'),
    sourceKey: safeText(input.sourceKey),
    requiresEscalation: points.entryType === 'reward' ? false : Boolean(input.requiresEscalation),
    createdBy: safeText(input.createdBy),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (item.sourceKey && current.conductRecords.some((entry) => entry.sourceKey === item.sourceKey && entry.id !== id && entry.status !== 'cancelled')) return current;
  return {
    ...current,
    conductRecords: [item, ...current.conductRecords.filter((entry) => entry.id !== id)],
    updatedAt: new Date().toISOString(),
  };
}

export function addConductReward(workspace, input = {}) {
  return addConductRecord(workspace, { ...input, entryType: 'reward', bonus: input.bonus ?? input.points, deduction: 0 });
}

function conductRecordSnapshot(item = {}) {
  const entryType = safeText(item.entryType, 'violation') === 'reward' ? 'reward' : 'violation';
  return {
    studentId: safeText(item.studentId),
    date: safeText(item.date),
    weekStart: startOfConductWeek(item.weekStart || item.date || today()),
    ruleId: safeText(item.ruleId),
    code: safeText(item.code),
    category: safeText(item.category),
    title: safeText(item.title),
    entryType,
    deduction: entryType === 'reward' ? 0 : Math.max(5, Number(item.deduction) || 5),
    bonus: entryType === 'reward' ? Math.max(1, Number(item.bonus) || 1) : 0,
    schoolPoint: item.schoolPoint === null || item.schoolPoint === undefined ? null : Number(item.schoolPoint),
    note: safeText(item.note),
    evidence: safeText(item.evidence),
    severity: safeText(item.severity, entryType === 'reward' ? 'positive' : 'normal'),
    status: safeText(item.status, 'confirmed'),
    source: safeText(item.source, 'manual'),
    requiresEscalation: Boolean(item.requiresEscalation),
    updatedAt: safeText(item.updatedAt),
  };
}

export function updateConductRecord(workspace, recordId, input = {}, actor = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  const existing = current.conductRecords.find((item) => item.id === recordId);
  if (!existing) throw new Error('Không tìm thấy lượt ghi nhận cần điều chỉnh.');

  const studentId = safeText(input.studentId, existing.studentId);
  const title = safeText(input.title, existing.title);
  const date = safeText(input.date, existing.date || today());
  const oldWeek = resolveConductWeekStart(current, existing.weekStart || existing.date, { allowOutsidePlan: true });
  const nextWeek = resolveConductWeekStart(current, date, { allowOutsidePlan: input.allowOutsidePlan === true });
  const points = normalizeRecordPoints(input, existing);
  const status = ['confirmed', 'pending', 'cancelled'].includes(safeText(input.status))
    ? safeText(input.status)
    : safeText(existing.status, 'confirmed');
  const editReason = safeText(input.editReason, 'Điều chỉnh thông tin ghi nhận');

  if (!studentId) throw new Error('Cần chọn học sinh.');
  if (!title) throw new Error('Cần nhập nội dung ghi nhận.');
  if (!isIsoDate(date)) throw new Error('Ngày ghi nhận chưa hợp lệ.');
  if (!input.allowLocked && (isConductWeekLocked(current, oldWeek) || isConductWeekLocked(current, nextWeek))) {
    throw new Error('Tuần liên quan đã được tổng kết và khóa. Hãy mở khóa tuần trước khi điều chỉnh.');
  }

  const changedAt = new Date().toISOString();
  const history = [
    ...(Array.isArray(existing.history) ? existing.history : []),
    {
      id: uid('conduct-revision'),
      editedAt: changedAt,
      editedBy: safeText(actor),
      reason: editReason,
      before: conductRecordSnapshot(existing),
    },
  ].slice(-80);

  const updated = {
    ...existing,
    studentId,
    date,
    weekStart: nextWeek,
    ruleId: safeText(input.ruleId, existing.ruleId),
    code: safeText(input.code, existing.code),
    category: safeText(input.category, existing.category || (points.entryType === 'reward' ? 'Khen thưởng / khắc phục' : 'Khác')),
    title,
    entryType: points.entryType,
    deduction: points.deduction,
    bonus: points.bonus,
    schoolPoint: input.schoolPoint === '' || input.schoolPoint === null || input.schoolPoint === undefined
      ? (input.schoolPoint === '' ? null : existing.schoolPoint ?? null)
      : Number(input.schoolPoint),
    note: input.note === undefined ? safeText(existing.note) : safeText(input.note),
    evidence: input.evidence === undefined ? safeText(existing.evidence) : safeText(input.evidence),
    severity: safeText(input.severity, existing.severity || (points.entryType === 'reward' ? 'positive' : points.deduction >= 40 ? 'critical' : points.deduction >= 20 ? 'serious' : points.deduction >= 10 ? 'moderate' : 'normal')),
    status,
    requiresEscalation: points.entryType === 'reward' ? false : (input.requiresEscalation === undefined ? Boolean(existing.requiresEscalation) : Boolean(input.requiresEscalation)),
    lastEditReason: editReason,
    lastEditedBy: safeText(actor),
    lastEditedAt: changedAt,
    history,
    updatedAt: changedAt,
  };

  if (status === 'cancelled') {
    updated.cancelReason = safeText(input.cancelReason, editReason);
    updated.cancelledAt = existing.cancelledAt || changedAt;
  } else {
    delete updated.cancelReason;
    delete updated.cancelledAt;
  }

  return {
    ...current,
    conductRecords: current.conductRecords.map((item) => item.id === recordId ? updated : item),
    updatedAt: changedAt,
  };
}

export function cancelConductRecord(workspace, recordId, reason = '', actor = '') {
  return updateConductRecord(workspace, recordId, {
    status: 'cancelled',
    editReason: safeText(reason, 'Hủy ghi nhận'),
    cancelReason: safeText(reason, 'Hủy ghi nhận'),
  }, actor);
}

export function conductRecordsForWeek(workspace, weekStart, options = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const key = startOfConductWeek(weekStart);
  const includeCancelled = typeof options === 'boolean' ? options : Boolean(options?.includeCancelled);
  return current.conductRecords.filter((item) => {
    if (startOfConductWeek(item.weekStart || item.date) !== key) return false;
    return includeCancelled || item.status !== 'cancelled';
  });
}

function calculateWeeklyConductLive(current, weekStart) {
  const settings = current.conductSettings || {};
  const baseScore = Number(settings.weeklyBaseScore) || 100;
  const maxScore = Math.max(baseScore, Number(settings.carryBonusCap) || baseScore);
  const thresholds = settings.thresholds || DEFAULT_CONDUCT_THRESHOLDS;
  const records = conductRecordsForWeek(current, weekStart).filter((item) => item.status === 'confirmed');
  return current.students.filter((student) => student.active !== false).map((student) => {
    const studentRecords = records.filter((item) => item.studentId === student.id);
    const violations = studentRecords.filter((item) => safeText(item.entryType, 'violation') !== 'reward');
    const rewards = studentRecords.filter((item) => item.entryType === 'reward');
    const totalDeduction = violations.reduce((sum, item) => sum + Math.max(0, Number(item.deduction) || 0), 0);
    const totalBonus = rewards.reduce((sum, item) => sum + Math.max(0, Number(item.bonus) || 0), 0);
    const score = Math.max(0, Math.min(maxScore, baseScore - totalDeduction + totalBonus));
    const critical = violations.some((item) => item.severity === 'critical' || item.requiresEscalation);
    return {
      student,
      weekStart: startOfConductWeek(weekStart),
      weekEnd: conductWeekEndForWorkspace(current, weekStart),
      baseScore,
      totalDeduction,
      totalBonus,
      score,
      classification: classifyConductScore(score, thresholds),
      critical,
      records: studentRecords,
      violations,
      rewards,
    };
  });
}

function snapshotWeeklyRows(rows = []) {
  return rows.map((row) => ({
    studentId: row.student.id,
    studentName: row.student.fullName,
    studentCode: row.student.code || '',
    baseScore: row.baseScore,
    totalDeduction: row.totalDeduction,
    totalBonus: row.totalBonus || 0,
    score: row.score,
    classification: row.classification,
    critical: Boolean(row.critical),
    recordIds: row.records.map((item) => item.id),
  }));
}

function weeklyStats(rows = [], records = []) {
  const counts = { good: 0, fair: 0, pass: 0, fail: 0 };
  rows.forEach((row) => { counts[row.classification?.id || 'fail'] = (counts[row.classification?.id || 'fail'] || 0) + 1; });
  return {
    studentCount: rows.length,
    average: rows.length ? Math.round((rows.reduce((sum, row) => sum + row.score, 0) / rows.length) * 100) / 100 : 100,
    counts,
    violationCount: records.filter((item) => item.status === 'confirmed' && item.entryType !== 'reward').length,
    rewardCount: records.filter((item) => item.status === 'confirmed' && item.entryType === 'reward').length,
    pendingCount: records.filter((item) => item.status === 'pending').length,
    criticalCount: rows.filter((row) => row.critical).length,
  };
}

export function calculateWeeklyConduct(workspace, weekStart, options = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const key = startOfConductWeek(weekStart);
  const summary = getConductWeekSummary(current, key);
  if (summary?.status === 'locked' && Array.isArray(summary.rows) && !options.live) {
    return summary.rows.map((row) => {
      const student = current.students.find((item) => item.id === row.studentId) || {
        id: row.studentId,
        fullName: row.studentName || 'Học sinh đã lưu trữ',
        code: row.studentCode || '',
        active: false,
      };
      const records = current.conductRecords.filter((item) => row.recordIds?.includes(item.id));
      return {
        ...row,
        student,
        weekStart: key,
        weekEnd: conductWeekEndForWorkspace(current, key),
        classification: row.classification || classifyConductScore(row.score, current.conductSettings?.thresholds),
        records,
        violations: records.filter((item) => item.entryType !== 'reward'),
        rewards: records.filter((item) => item.entryType === 'reward'),
        locked: true,
      };
    });
  }
  return calculateWeeklyConductLive(current, key);
}

export function finalizeConductWeek(workspace, weekStart, actor = '', reason = 'Tổng kết tuần', options = {}) {
  const current = normalizeHomeroomWorkspace(workspace);
  const key = startOfConductWeek(weekStart);
  const existing = getConductWeekSummary(current, key);
  if (existing?.status === 'locked' && !options.force) return current;
  const rows = calculateWeeklyConductLive(current, key);
  const records = conductRecordsForWeek(current, key, { includeCancelled: true });
  const changedAt = new Date().toISOString();
  const history = [
    ...(Array.isArray(existing?.history) ? existing.history : []),
    {
      id: uid('conduct-week-event'),
      action: 'locked',
      at: changedAt,
      by: safeText(actor),
      reason: safeText(reason, 'Tổng kết tuần'),
      automatic: Boolean(options.automatic),
    },
  ].slice(-80);
  const item = {
    id: existing?.id || uid('conduct-week'),
    weekStart: key,
    weekEnd: conductWeekEndForWorkspace(current, key),
    status: 'locked',
    lockedAt: changedAt,
    lockedBy: safeText(actor),
    lockReason: safeText(reason, options.automatic ? 'Tự động tổng kết cuối tuần' : 'Tổng kết tuần'),
    automatic: Boolean(options.automatic),
    rows: snapshotWeeklyRows(rows),
    stats: weeklyStats(rows, records),
    history,
    createdAt: existing?.createdAt || changedAt,
    updatedAt: changedAt,
  };
  return {
    ...current,
    conductWeekSummaries: [item, ...(current.conductWeekSummaries || []).filter((entry) => startOfConductWeek(entry.weekStart) !== key)],
    updatedAt: changedAt,
  };
}

export function reopenConductWeek(workspace, weekStart, actor = '', reason = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  const key = startOfConductWeek(weekStart);
  const existing = getConductWeekSummary(current, key);
  if (!existing || existing.status !== 'locked') return current;
  const reopenReason = safeText(reason, 'Mở khóa để điều chỉnh dữ liệu tuần');
  const changedAt = new Date().toISOString();
  const history = [
    ...(Array.isArray(existing.history) ? existing.history : []),
    { id: uid('conduct-week-event'), action: 'reopened', at: changedAt, by: safeText(actor), reason: reopenReason, automatic: false },
  ].slice(-80);
  const item = {
    ...existing,
    status: 'open',
    reopenedAt: changedAt,
    reopenedBy: safeText(actor),
    reopenReason,
    history,
    updatedAt: changedAt,
  };
  return {
    ...current,
    conductWeekSummaries: [item, ...(current.conductWeekSummaries || []).filter((entry) => startOfConductWeek(entry.weekStart) !== key)],
    updatedAt: changedAt,
  };
}

export function resetConductWeekData(workspace, weekStart, actor = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  const key = startOfConductWeek(weekStart);
  const existing = getConductWeekSummary(current, key);
  const changedAt = new Date().toISOString();
  const removedRecords = (current.conductRecords || []).filter((record) => startOfConductWeek(record.weekStart || record.date) === key);
  const history = [
    ...(Array.isArray(existing?.history) ? existing.history : []),
    {
      id: uid('conduct-week-event'),
      action: 'reset',
      at: changedAt,
      by: safeText(actor),
      reason: `Đã xóa khẩn cấp ${removedRecords.length} ghi nhận trong tuần`,
      automatic: false,
    },
  ].slice(-80);
  const item = {
    id: existing?.id || uid('conduct-week'),
    weekStart: key,
    weekEnd: conductWeekEndForWorkspace(current, key),
    status: 'open',
    resetAt: changedAt,
    resetBy: safeText(actor),
    reopenedAt: changedAt,
    reopenedBy: safeText(actor),
    rows: [],
    stats: { studentCount: current.students.filter((student) => student.active !== false).length, average: Number(current.conductSettings?.weeklyBaseScore) || 100, counts: { good: 0, fair: 0, pass: 0, fail: 0 }, violationCount: 0, rewardCount: 0, pendingCount: 0, criticalCount: 0 },
    history,
    createdAt: existing?.createdAt || changedAt,
    updatedAt: changedAt,
  };
  return {
    ...current,
    conductRecords: (current.conductRecords || []).filter((record) => startOfConductWeek(record.weekStart || record.date) !== key),
    conductWeekSummaries: [item, ...(current.conductWeekSummaries || []).filter((entry) => startOfConductWeek(entry.weekStart) !== key)],
    updatedAt: changedAt,
  };
}

function conductWeekLockDeadline(weekStart, settings = {}) {
  const date = new Date(`${startOfConductWeek(weekStart)}T00:00:00`);
  const lockDay = Number.isInteger(Number(settings.lockDay)) ? Number(settings.lockDay) : 0;
  const daysFromMonday = (lockDay + 6) % 7;
  date.setDate(date.getDate() + daysFromMonday);
  const match = safeText(settings.lockTime, '23:59').match(/^(\d{1,2}):(\d{2})$/);
  date.setHours(match ? Math.min(23, Number(match[1])) : 23, match ? Math.min(59, Number(match[2])) : 59, 0, 0);
  return date;
}

export function applyAutomaticConductWeekClosures(workspace, actor = 'Hệ thống', nowValue = new Date()) {
  let current = normalizeHomeroomWorkspace(workspace);
  if (current.conductSettings?.autoLockWeeks === false) return { workspace: current, lockedWeeks: [] };
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const calendar = inferAcademicCalendar(current);
  const weeks = conductWeeksForWorkspace(current, calendar.schoolYearStart, calendar.schoolYearEnd, { includeOrientation: true, includeInAverageOnly: false });
  const lockedWeeks = [];
  weeks.forEach((week) => {
    const existingSummary = getConductWeekSummary(current, week);
    if (existingSummary?.status === 'locked') return;
    // A manually reopened week must stay editable until the user locks it again.
    if (existingSummary?.status === 'open' && (existingSummary?.reopenedAt || existingSummary?.resetAt)) return;
    if (conductWeekLockDeadline(week, current.conductSettings) > now) return;
    current = finalizeConductWeek(current, week, actor, 'Tự động tổng kết theo lịch cuối tuần', { automatic: true });
    lockedWeeks.push(week);
  });
  return { workspace: current, lockedWeeks };
}

export function buildConductAuditTrail(workspace, weekStart = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  const key = weekStart ? startOfConductWeek(weekStart) : '';
  const events = [];
  current.conductRecords.forEach((record) => {
    const recordWeek = startOfConductWeek(record.weekStart || record.date);
    if (key && recordWeek !== key) return;
    events.push({ id: `${record.id}:created`, at: record.createdAt, by: record.createdBy, action: record.entryType === 'reward' ? 'reward-created' : 'record-created', title: record.title, studentId: record.studentId, detail: record.entryType === 'reward' ? `+${record.bonus || 0} điểm` : `−${record.deduction || 0} điểm` });
    (record.history || []).forEach((revision) => events.push({ id: revision.id, at: revision.editedAt, by: revision.editedBy, action: revision.before?.status === 'cancelled' ? 'record-restored' : 'record-edited', title: record.title, studentId: record.studentId, detail: revision.reason || 'Điều chỉnh thông tin' }));
    if (record.status === 'cancelled') events.push({ id: `${record.id}:cancelled`, at: record.cancelledAt || record.updatedAt, by: record.lastEditedBy, action: 'record-cancelled', title: record.title, studentId: record.studentId, detail: record.cancelReason || 'Đã hủy ghi nhận' });
  });
  (current.conductWeekSummaries || []).forEach((summary) => {
    if (key && startOfConductWeek(summary.weekStart) !== key) return;
    (summary.history || []).forEach((event) => events.push({ id: event.id, at: event.at, by: event.by, action: event.action === 'locked' ? 'week-locked' : event.action === 'reset' ? 'week-reset' : 'week-reopened', title: `Tuần ${summary.weekStart}`, detail: event.reason, automatic: event.automatic }));
  });
  return events.filter((item) => item.at).sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export function conductStudentTrend(workspace, studentId, startDate, endDate) {
  const current = normalizeHomeroomWorkspace(workspace);
  return conductWeeksForWorkspace(current, startDate, endDate, { includeOrientation: false, includeInAverageOnly: true }).map((weekStart) => {
    const row = calculateWeeklyConduct(current, weekStart).find((item) => item.student.id === studentId);
    return row ? { weekStart, weekEnd: row.weekEnd, score: row.score, classification: row.classification, totalDeduction: row.totalDeduction, totalBonus: row.totalBonus || 0, locked: isConductWeekLocked(current, weekStart) } : null;
  }).filter(Boolean);
}

export function calculateConductPeriod(workspace, startDate, endDate) {
  const current = normalizeHomeroomWorkspace(workspace);
  const weeks = conductWeeksForWorkspace(current, startDate, endDate, { includeOrientation: false, includeInAverageOnly: true });
  const rowsByWeek = weeks.map((weekStart) => calculateWeeklyConduct(current, weekStart));
  return current.students.filter((student) => student.active !== false).map((student) => {
    const weekly = rowsByWeek.map((rows) => rows.find((row) => row.student.id === student.id)).filter(Boolean);
    const average = weekly.length ? weekly.reduce((sum, row) => sum + row.score, 0) / weekly.length : 100;
    const criticalWeeks = weekly.filter((row) => row.critical).length;
    return {
      student,
      average: Math.round(average * 100) / 100,
      classification: classifyConductScore(average, current.conductSettings?.thresholds),
      weekCount: weekly.length,
      criticalWeeks,
      totalDeduction: weekly.reduce((sum, row) => sum + row.totalDeduction, 0),
      totalBonus: weekly.reduce((sum, row) => sum + (row.totalBonus || 0), 0),
      lockedWeeks: weekly.filter((row) => row.locked).length,
      weekly,
    };
  });
}

export function inferConductPeriodRanges(workspace) {
  const current = normalizeHomeroomWorkspace(workspace);
  const calendar = inferAcademicCalendar(current);
  const defaults = buildConductPeriodRangesForWorkspace(current, calendar);
  const saved = current.conductSettings?.periodRanges || {};
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, { ...value, ...(saved[key] || {}) }]));
}

export function syncAttendanceToConduct(workspace, weekStart, actor = '') {
  let current = normalizeHomeroomWorkspace(workspace);
  const start = startOfConductWeek(weekStart);
  const end = conductWeekEndForWorkspace(current, weekStart);
  let added = 0;
  Object.entries(current.attendance || {}).forEach(([sessionKey, rows]) => {
    const [date = '', session = 'day', period = ''] = String(sessionKey).split('::');
    const attendanceDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : sessionKey;
    if (attendanceDate < start || attendanceDate > end) return;
    Object.entries(rows || {}).forEach(([studentId, entry]) => {
      const status = entry?.status;
      let rule = null;
      if (status === 'late') rule = OFFICIAL_CONDUCT_RULES.find((item) => item.id === 'attendance-late');
      if (status === 'unexcused') rule = OFFICIAL_CONDUCT_RULES.find((item) => item.id === (period ? 'attendance-unexcused-period' : 'attendance-unexcused-session'));
      if (!rule) return;
      const sourceKey = `attendance:${sessionKey}:${studentId}:${status}`;
      const before = current.conductRecords.length;
      current = addConductRecord(current, {
        studentId,
        date: attendanceDate,
        weekStart: start,
        ruleId: rule.id,
        code: rule.code,
        category: rule.category,
        title: rule.title,
        deduction: rule.personalDeduction,
        schoolPoint: rule.schoolPoint,
        note: safeText(entry?.reason || entry?.note),
        severity: rule.severity,
        status: 'confirmed',
        source: 'attendance',
        sourceKey,
        createdBy: actor,
      });
      if (current.conductRecords.length > before) added += 1;
    });
  });
  return { workspace: current, added };
}
