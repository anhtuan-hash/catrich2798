import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CONDUCT_CATEGORIES,
  CONDUCT_DOCUMENT,
  DEFAULT_CONDUCT_THRESHOLDS,
  OFFICIAL_CONDUCT_RULES,
} from '../data/homeroomConduct.js';
import {
  PETRUS_KY_ACADEMIC_PLAN_2026_2027,
  PETRUS_KY_ACADEMIC_PLAN_DOCUMENT,
  formatPetrusKyWeekOption,
} from '../data/homeroomAcademicPlan.js';
import {
  addConductRecord,
  addConductReward,
  addCustomConductRule,
  allConductRules,
  calculateConductPeriod,
  calculateWeeklyConduct,
  cancelConductRecord,
  buildConductAuditTrail,
  conductStudentTrend,
  conductRecordsForWeek,
  endOfConductWeek,
  enumerateConductWeeks,
  conductWeekEndForWorkspace,
  conductWeeksForWorkspace,
  findConductPlanRow,
  getActiveConductAcademicPlan,
  resolveConductWeekStart,
  finalizeConductWeek,
  getConductWeekSummary,
  buildConductPeriodRangesForWorkspace,
  createAcademicCalendarDefaults,
  inferAcademicCalendar,
  inferConductPeriodRanges,
  isConductWeekLocked,
  reopenConductWeek,
  applyAutomaticConductWeekClosures,
  setCustomConductRuleActive,
  startOfConductWeek,
  syncAttendanceToConduct,
  updateConductRecord,
  validateAcademicCalendar,
  DEFAULT_CONDUCT_LOCK_PASSWORD,
  verifyConductLockPassword,
  changeConductLockPassword,
  resetConductLockPassword,
  resetConductWeekData,
  isGrade12Workspace,
} from '../utils/homeroomConduct.js';

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function today() {
  return toLocalIsoDate(new Date());
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function monthRange(monthValue) {
  const match = String(monthValue || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return { start: today(), end: today() };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  return { start, end: toLocalIsoDate(endDate) };
}

function durationSummary(start, end) {
  const startDate = new Date(`${start || ''}T00:00:00`);
  const endDate = new Date(`${end || ''}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) return 'Chưa hợp lệ';
  const days = Math.floor((endDate - startDate) / 86400000) + 1;
  return `${days} ngày · khoảng ${Math.max(1, Math.ceil(days / 7))} tuần`;
}

function schoolYearLabel(calendar = {}) {
  const startYear = String(calendar.schoolYearStart || '').slice(0, 4);
  const endYear = String(calendar.schoolYearEnd || '').slice(0, 4);
  return /^20\d{2}$/.test(startYear) && /^20\d{2}$/.test(endYear) ? `${startYear}-${endYear}` : 'Chưa xác định';
}

function scoreTone(classification) {
  return classification?.id || 'good';
}

function shiftConductWeek(value, offset) {
  const [year, month, day] = startOfConductWeek(value).split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  date.setDate(date.getDate() + (Number(offset) || 0) * 7);
  return toLocalIsoDate(date);
}

function recordStatusLabel(status) {
  if (status === 'pending') return 'Chờ xác nhận';
  if (status === 'cancelled') return 'Đã hủy';
  return 'Đã xác nhận';
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function auditActionLabel(action) {
  const labels = {
    'record-created': 'Ghi nhận vi phạm',
    'reward-created': 'Ghi nhận khen thưởng',
    'record-edited': 'Điều chỉnh ghi nhận',
    'record-cancelled': 'Hủy ghi nhận',
    'record-restored': 'Khôi phục ghi nhận',
    'week-locked': 'Tổng kết và khóa tuần',
    'week-reopened': 'Mở khóa tuần',
    'week-reset': 'Reset dữ liệu tuần',
  };
  return labels[action] || action;
}

function TrendChart({ points = [] }) {
  if (!points.length) return <div className="hr-conduct-trend-empty">Chưa có dữ liệu theo tuần.</div>;
  const width = 640;
  const height = 190;
  const pad = 24;
  const xs = points.map((_, index) => points.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (points.length - 1));
  const ys = points.map((item) => pad + ((100 - Math.max(0, Math.min(100, Number(item.score) || 0))) * (height - pad * 2)) / 100);
  const polyline = xs.map((x, index) => `${x},${ys[index]}`).join(' ');
  return (
    <div className="hr-conduct-trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ xu hướng điểm rèn luyện">
        {[0, 25, 50, 75, 100].map((score) => {
          const y = pad + ((100 - score) * (height - pad * 2)) / 100;
          return <g key={score}><line x1={pad} x2={width - pad} y1={y} y2={y} /><text x={4} y={y + 4}>{score}</text></g>;
        })}
        <polyline points={polyline} />
        {points.map((item, index) => <g key={item.weekStart}><circle cx={xs[index]} cy={ys[index]} r="5" /><title>{formatDate(item.weekStart)}: {item.score} điểm</title></g>)}
      </svg>
      <div className="hr-conduct-trend-labels">{points.map((item, index) => <span key={item.weekStart} style={{ left: `${points.length === 1 ? 50 : (index * 100) / (points.length - 1)}%` }}>{String(index + 1).padStart(2, '0')}</span>)}</div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const labels = { positive: 'Khen thưởng', normal: 'Thông thường', moderate: 'Cần lưu ý', serious: 'Nghiêm trọng', critical: 'Đặc biệt nghiêm trọng' };
  return <span className={`hr-conduct-severity ${severity || 'normal'}`}>{labels[severity] || severity}</span>;
}

function ConductStat({ label, value, note, tone = 'green' }) {
  return (
    <article className={`hr-conduct-stat ${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

const EMPTY_CUSTOM = {
  title: '', category: 'Nội quy bổ sung', personalDeduction: 5, description: '', reference: '', effectiveDate: today(),
};

export default function HomeroomConductTab({ workspace, onCommit, currentUser }) {
  const initialConductWeek = resolveConductWeekStart(workspace, today(), { nearest: true });
  const [weekStart, setWeekStart] = useState(() => initialConductWeek);
  const [studentId, setStudentId] = useState('');
  const [ruleId, setRuleId] = useState(OFFICIAL_CONDUCT_RULES[0]?.id || '');
  const [recordDate, setRecordDate] = useState(initialConductWeek);
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState('');
  const [status, setStatus] = useState('confirmed');
  const [otherTitle, setOtherTitle] = useState('');
  const [otherDeduction, setOtherDeduction] = useState(5);
  const [saveOtherRule, setSaveOtherRule] = useState(true);
  const [customDraft, setCustomDraft] = useState(EMPTY_CUSTOM);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [showDocument, setShowDocument] = useState(false);
  const [showAcademicPlanDocument, setShowAcademicPlanDocument] = useState(false);
  const [periodMode, setPeriodMode] = useState('month');
  const [monthValue, setMonthValue] = useState(today().slice(0, 7));
  const [weekReviewMode, setWeekReviewMode] = useState('scores');
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardDraft, setRewardDraft] = useState({ studentId: '', date: initialConductWeek, title: '', bonus: 5, note: '', evidence: '' });
  const [studentProfileId, setStudentProfileId] = useState('');
  const [auditQuery, setAuditQuery] = useState('');
  const [recordFilterStudentId, setRecordFilterStudentId] = useState('all');
  const [recordFilterStatus, setRecordFilterStatus] = useState('active');
  const [recordQuery, setRecordQuery] = useState('');
  const [editingRecordId, setEditingRecordId] = useState('');
  const [editDraft, setEditDraft] = useState(null);
  const [recordSaveFeedback, setRecordSaveFeedback] = useState({ status: 'idle', title: '', detail: '' });
  const recordSaveTimer = useRef(null);
  const autoLockToken = useRef('');
  const [lockDialog, setLockDialog] = useState({ open: false, mode: 'lock', password: '', reason: '', error: '', busy: false, resetConfirmed: false });
  const [cancelDialog, setCancelDialog] = useState({ open: false, record: null, busy: false, error: '', anchor: null });
  const [lockPasswordDraft, setLockPasswordDraft] = useState({ current: '', next: '', confirm: '' });
  const [lockPasswordStatus, setLockPasswordStatus] = useState({ type: '', message: '' });
  const [settingsDraft, setSettingsDraft] = useState(() => {
    const academicCalendar = inferAcademicCalendar(workspace);
    return {
      weeklyBaseScore: Number(workspace.conductSettings?.weeklyBaseScore) || 100,
      academicPlanId: workspace.conductSettings?.academicPlanId || PETRUS_KY_ACADEMIC_PLAN_2026_2027.id,
      academicCalendarMode: workspace.conductSettings?.academicCalendarMode || 'school-plan',
      thresholds: { ...DEFAULT_CONDUCT_THRESHOLDS, ...(workspace.conductSettings?.thresholds || {}) },
      academicCalendar,
      periodRanges: buildConductPeriodRangesForWorkspace(workspace, academicCalendar, inferConductPeriodRanges(workspace)),
      autoLockWeeks: workspace.conductSettings?.autoLockWeeks !== false,
      lockDay: Number(workspace.conductSettings?.lockDay ?? 0),
      lockTime: workspace.conductSettings?.lockTime || '23:59',
      requireLockPassword: workspace.conductSettings?.requireLockPassword !== false,
    };
  });

  useEffect(() => {
    const academicCalendar = inferAcademicCalendar(workspace);
    setSettingsDraft({
      weeklyBaseScore: Number(workspace.conductSettings?.weeklyBaseScore) || 100,
      academicPlanId: workspace.conductSettings?.academicPlanId || PETRUS_KY_ACADEMIC_PLAN_2026_2027.id,
      academicCalendarMode: workspace.conductSettings?.academicCalendarMode || 'school-plan',
      thresholds: { ...DEFAULT_CONDUCT_THRESHOLDS, ...(workspace.conductSettings?.thresholds || {}) },
      academicCalendar,
      periodRanges: buildConductPeriodRangesForWorkspace(workspace, academicCalendar, inferConductPeriodRanges(workspace)),
      autoLockWeeks: workspace.conductSettings?.autoLockWeeks !== false,
      lockDay: Number(workspace.conductSettings?.lockDay ?? 0),
      lockTime: workspace.conductSettings?.lockTime || '23:59',
      requireLockPassword: workspace.conductSettings?.requireLockPassword !== false,
    });
  }, [workspace.id]);

  useEffect(() => {
    const resolved = resolveConductWeekStart(workspace, weekStart || today(), { nearest: true });
    if (resolved !== weekStart) setWeekStart(resolved);
    const recordRow = findConductPlanRow(workspace, recordDate);
    if (getActiveConductAcademicPlan(workspace) && !recordRow?.conductEligible) setRecordDate(resolved);
  }, [workspace.id, workspace.classProfile?.schoolYear]);

  useEffect(() => () => window.clearTimeout(recordSaveTimer.current), []);

  useEffect(() => {
    const token = `${workspace.id}:${workspace.updatedAt || ''}`;
    if (autoLockToken.current === token) return;
    autoLockToken.current = token;
    const result = applyAutomaticConductWeekClosures(workspace, 'Hệ thống');
    if (!result.lockedWeeks.length) return;
    onCommit(result.workspace, `Đã tự động tổng kết ${result.lockedWeeks.length} tuần đã qua theo lịch rèn luyện.`);
  }, [workspace.id, workspace.updatedAt, onCommit]);

  const showRecordSaveFeedback = (status, title, detail, duration = 2200) => {
    window.clearTimeout(recordSaveTimer.current);
    setRecordSaveFeedback({ status, title, detail });
    if (status !== 'saving') {
      recordSaveTimer.current = window.setTimeout(
        () => setRecordSaveFeedback({ status: 'idle', title: '', detail: '' }),
        duration,
      );
    }
  };

  const calendarErrors = useMemo(() => validateAcademicCalendar(settingsDraft.academicCalendar), [settingsDraft.academicCalendar]);
  const activeSchoolYearLabel = useMemo(() => schoolYearLabel(settingsDraft.academicCalendar), [settingsDraft.academicCalendar]);
  const activeAcademicPlan = useMemo(() => getActiveConductAcademicPlan(workspace), [workspace]);
  const selectedPlanRow = useMemo(() => findConductPlanRow(workspace, weekStart), [workspace, weekStart]);
  const selectedWeekEnd = useMemo(() => conductWeekEndForWorkspace(workspace, weekStart), [workspace, weekStart]);

  const students = useMemo(() => workspace.students.filter((item) => item.active !== false), [workspace.students]);
  const rules = useMemo(() => allConductRules(workspace), [workspace.conductCustomRules]);
  const selectedRule = useMemo(() => rules.find((item) => item.id === ruleId) || null, [rules, ruleId]);
  const weekRows = useMemo(() => calculateWeeklyConduct(workspace, weekStart), [workspace, weekStart]);
  const weekRecords = useMemo(() => conductRecordsForWeek(workspace, weekStart), [workspace, weekStart]);
  const allWeekRecords = useMemo(() => conductRecordsForWeek(workspace, weekStart, { includeCancelled: true }), [workspace, weekStart]);
  const selectedWeekRecordCount = weekRecords.filter((item) => item.status === 'confirmed').length;
  const averageWeekScore = weekRows.length ? weekRows.reduce((sum, row) => sum + row.score, 0) / weekRows.length : 100;
  const criticalCount = weekRows.filter((row) => row.critical).length;
  const availableWeeks = useMemo(() => {
    const calendar = inferAcademicCalendar(workspace);
    const weeks = conductWeeksForWorkspace(workspace, calendar.schoolYearStart, calendar.schoolYearEnd, { includeOrientation: true, includeInAverageOnly: false });
    if (!weeks.includes(weekStart)) weeks.push(weekStart);
    return [...new Set(weeks)].sort();
  }, [workspace, weekStart]);
  const selectAdjacentWeek = (offset) => {
    const index = availableWeeks.indexOf(weekStart);
    if (index < 0) return;
    const nextIndex = Math.min(availableWeeks.length - 1, Math.max(0, index + offset));
    setWeekStart(availableWeeks[nextIndex]);
  };
  const weekOptionText = (week) => {
    const row = findConductPlanRow(workspace, week);
    if (row) return formatPetrusKyWeekOption(row);
    return `${formatDate(week)} – ${formatDate(conductWeekEndForWorkspace(workspace, week))}`;
  };
  const filteredWeekRecords = useMemo(() => {
    const query = recordQuery.trim().toLowerCase();
    return allWeekRecords.filter((record) => {
      if (recordFilterStudentId !== 'all' && record.studentId !== recordFilterStudentId) return false;
      if (recordFilterStatus === 'active' && record.status === 'cancelled') return false;
      if (recordFilterStatus !== 'all' && recordFilterStatus !== 'active' && record.status !== recordFilterStatus) return false;
      if (!query) return true;
      const student = workspace.students.find((item) => item.id === record.studentId);
      return `${student?.fullName || ''} ${student?.code || ''} ${record.code || ''} ${record.title || ''} ${record.note || ''} ${record.evidence || ''}`.toLowerCase().includes(query);
    });
  }, [allWeekRecords, recordFilterStudentId, recordFilterStatus, recordQuery, workspace.students]);
  const editingRecord = useMemo(
    () => workspace.conductRecords?.find((item) => item.id === editingRecordId) || null,
    [workspace.conductRecords, editingRecordId],
  );
  const selectedWeekSummary = useMemo(() => getConductWeekSummary(workspace, weekStart), [workspace, weekStart]);
  const selectedWeekLocked = selectedWeekSummary?.status === 'locked';
  const weekCounts = useMemo(() => {
    const counts = { good: 0, fair: 0, pass: 0, fail: 0 };
    weekRows.forEach((row) => { counts[row.classification?.id || 'fail'] = (counts[row.classification?.id || 'fail'] || 0) + 1; });
    return counts;
  }, [weekRows]);
  const rewardCount = weekRecords.filter((item) => item.status === 'confirmed' && item.entryType === 'reward').length;
  const violationCount = weekRecords.filter((item) => item.status === 'confirmed' && item.entryType !== 'reward').length;
  const weekAuditTrail = useMemo(() => buildConductAuditTrail(workspace, weekStart), [workspace, weekStart]);
  const filteredAuditTrail = useMemo(() => {
    const query = auditQuery.trim().toLowerCase();
    if (!query) return weekAuditTrail;
    return weekAuditTrail.filter((event) => {
      const student = workspace.students.find((item) => item.id === event.studentId);
      return `${auditActionLabel(event.action)} ${event.title || ''} ${event.detail || ''} ${event.by || ''} ${student?.fullName || ''}`.toLowerCase().includes(query);
    });
  }, [weekAuditTrail, auditQuery, workspace.students]);
  const studentProfile = useMemo(() => workspace.students.find((item) => item.id === studentProfileId) || null, [workspace.students, studentProfileId]);
  const studentTrend = useMemo(() => {
    if (!studentProfileId) return [];
    const calendar = inferAcademicCalendar(workspace);
    return conductStudentTrend(workspace, studentProfileId, calendar.schoolYearStart, weekStart);
  }, [workspace, studentProfileId, weekStart]);

  const periodRange = useMemo(() => {
    if (periodMode === 'month') return { ...monthRange(monthValue), label: `Tháng ${monthValue.slice(5, 7)}/${monthValue.slice(0, 4)}` };
    const period = settingsDraft.periodRanges?.[periodMode] || inferConductPeriodRanges(workspace)[periodMode];
    return { start: period?.start || today(), end: period?.end || today(), label: period?.label || periodMode };
  }, [periodMode, monthValue, settingsDraft.periodRanges, workspace]);

  const periodRows = useMemo(
    () => calculateConductPeriod({ ...workspace, conductSettings: settingsDraft }, periodRange.start, periodRange.end),
    [workspace, settingsDraft, periodRange.start, periodRange.end],
  );

  const catalogRules = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    return rules.filter((rule) => {
      if (catalogCategory !== 'all' && rule.category !== catalogCategory) return false;
      if (!q) return true;
      return `${rule.code} ${rule.title} ${rule.description} ${rule.reference}`.toLowerCase().includes(q);
    });
  }, [rules, catalogCategory, catalogQuery]);

  const handleRecord = async () => {
    if (recordSaveFeedback.status === 'saving') return;
    if (!studentId) return window.alert('Vui lòng chọn học sinh.');
    let next = workspace;
    let rule = selectedRule;
    if (ruleId === '__other__') {
      const title = otherTitle.trim();
      const deduction = Number(otherDeduction);
      if (!title) return window.alert('Vui lòng nhập nội dung vi phạm khác.');
      if (!Number.isFinite(deduction) || deduction < 5) return window.alert('Điểm trừ tối thiểu là 5.');
      if (saveOtherRule) {
        next = addCustomConductRule(next, {
          title,
          personalDeduction: deduction,
          category: 'Nội quy bổ sung',
          description: note,
          reference: 'Nội quy bổ sung / cập nhật sau Quyết định 95/QĐ-PEK',
        });
        rule = next.conductCustomRules[0];
      } else {
        rule = { id: '', code: 'OTHER', title, personalDeduction: deduction, category: 'Vi phạm khác', severity: deduction >= 40 ? 'critical' : deduction >= 20 ? 'serious' : deduction >= 10 ? 'moderate' : 'normal' };
      }
    }
    if (!rule) return window.alert('Không tìm thấy nội dung vi phạm.');

    let targetWeek;
    try {
      targetWeek = resolveConductWeekStart(next, recordDate);
      setWeekStart(targetWeek);
    } catch (error) {
      return window.alert(error?.message || 'Ngày vi phạm không thuộc tuần học đang áp dụng.');
    }

    const student = students.find((item) => item.id === studentId);
    showRecordSaveFeedback(
      'saving',
      'Đang lưu kết quả vi phạm…',
      `Hệ thống đang trừ ${rule.personalDeduction} điểm và cập nhật bảng rèn luyện của ${student?.fullName || 'học sinh'}.`,
    );

    try {
      next = addConductRecord(next, {
        studentId,
        date: recordDate,
        weekStart: targetWeek,
        ruleId: rule.id,
        code: rule.code,
        category: rule.category,
        title: rule.title,
        deduction: rule.personalDeduction,
        schoolPoint: rule.schoolPoint,
        note,
        evidence,
        severity: rule.severity,
        status,
        requiresEscalation: rule.requiresEscalation,
        createdBy: currentUser?.name || currentUser?.email,
      });
      const [saveResult] = await Promise.all([
        onCommit(next, `Đã ghi nhận vi phạm và trừ ${rule.personalDeduction} điểm rèn luyện.`),
        new Promise((resolve) => window.setTimeout(resolve, 720)),
      ]);
      setNote('');
      setEvidence('');
      setOtherTitle('');
      setOtherDeduction(5);

      if (saveResult?.ok === false) {
        showRecordSaveFeedback(
          'warning',
          'Đã lưu trên thiết bị',
          'Điểm tuần đã được cập nhật. Dữ liệu cloud chưa đồng bộ và hệ thống sẽ thử lại khi kết nối ổn định.',
          3200,
        );
      } else {
        showRecordSaveFeedback(
          'success',
          'Đã lưu kết quả vi phạm',
          `${student?.fullName || 'Học sinh'} đã bị trừ ${rule.personalDeduction} điểm. Bảng tổng kết tuần đã cập nhật.`,
          2300,
        );
      }
    } catch (error) {
      showRecordSaveFeedback(
        'error',
        'Chưa thể lưu kết quả',
        error?.message || 'Đã xảy ra lỗi khi ghi nhận vi phạm. Vui lòng thử lại.',
        3800,
      );
    }
  };

  const handleReward = async () => {
    if (!rewardDraft.studentId) return window.alert('Vui lòng chọn học sinh.');
    if (!rewardDraft.title.trim()) return window.alert('Vui lòng nhập nội dung khen thưởng hoặc khắc phục.');
    const bonus = Math.max(1, Number(rewardDraft.bonus) || 0);
    if (!bonus) return window.alert('Điểm cộng phải từ 1 điểm.');
    const student = workspace.students.find((item) => item.id === rewardDraft.studentId);
    showRecordSaveFeedback('saving', 'Đang cộng điểm rèn luyện…', `Hệ thống đang cộng ${bonus} điểm cho ${student?.fullName || 'học sinh'} và cập nhật tổng kết tuần.`);
    try {
      const next = addConductReward(workspace, {
        ...rewardDraft,
        bonus,
        status: 'confirmed',
        createdBy: currentUser?.name || currentUser?.email,
      });
      const [saveResult] = await Promise.all([
        onCommit(next, `Đã cộng ${bonus} điểm rèn luyện cho ${student?.fullName || 'học sinh'}.`),
        new Promise((resolve) => window.setTimeout(resolve, 620)),
      ]);
      const rewardWeek = resolveConductWeekStart(workspace, rewardDraft.date);
      setWeekStart(rewardWeek);
      setRewardDraft({ studentId: '', date: rewardWeek, title: '', bonus: 5, note: '', evidence: '' });
      setShowRewardForm(false);
      showRecordSaveFeedback(saveResult?.ok === false ? 'warning' : 'success', saveResult?.ok === false ? 'Đã lưu trên thiết bị' : 'Đã cộng điểm', `${student?.fullName || 'Học sinh'} được cộng ${bonus} điểm.`, 2400);
    } catch (error) {
      showRecordSaveFeedback('error', 'Chưa thể cộng điểm', error?.message || 'Vui lòng thử lại.', 3600);
    }
  };

  const openWeekLockDialog = (mode) => {
    const pending = allWeekRecords.filter((item) => item.status === 'pending').length;
    if (mode === 'lock' && pending && !window.confirm(`Tuần này còn ${pending} ghi nhận đang chờ xác nhận. Vẫn tiếp tục tổng kết?`)) return;
    setLockDialog({
      open: true,
      mode,
      password: '',
      reason: mode === 'lock' ? 'Đã rà soát dữ liệu và xác nhận kết quả rèn luyện tuần' : mode === 'reset' ? 'Reset dữ liệu tuần khẩn cấp' : 'Mở khóa để điều chỉnh dữ liệu tuần',
      error: '',
      busy: false,
      resetConfirmed: false,
    });
  };

  const closeWeekLockDialog = () => {
    if (lockDialog.busy) return;
    setLockDialog({ open: false, mode: 'lock', password: '', reason: '', error: '', busy: false, resetConfirmed: false });
  };

  const handleWeekLockSubmit = async () => {
    const verified = await verifyConductLockPassword(workspace, lockDialog.password);
    if (!verified) {
      setLockDialog((current) => ({ ...current, error: 'Mật khẩu khóa rèn luyện không đúng.', password: '' }));
      return;
    }
    if (lockDialog.mode === 'reset' && !lockDialog.resetConfirmed) {
      setLockDialog((current) => ({ ...current, error: 'Vui lòng xác nhận đã hiểu dữ liệu của tuần sẽ bị xóa.' }));
      return;
    }
    setLockDialog((current) => ({ ...current, busy: true, error: '' }));
    const actor = currentUser?.name || currentUser?.email || 'GVCN';
    const locking = lockDialog.mode === 'lock';
    const resetting = lockDialog.mode === 'reset';
    showRecordSaveFeedback(
      'saving',
      locking ? 'Đang tổng kết tuần…' : resetting ? 'Đang reset dữ liệu tuần…' : 'Đang mở khóa tuần…',
      locking
        ? 'Hệ thống đang tính điểm, xếp loại, tạo bản chốt và khóa dữ liệu của tuần.'
        : resetting
          ? 'Hệ thống đang xóa các ghi nhận của tuần và đưa tuần về trạng thái mở.'
          : 'Hệ thống đang xác thực và mở dữ liệu để điều chỉnh.',
    );
    try {
      const next = locking
        ? finalizeConductWeek(workspace, weekStart, actor, 'Tổng kết tuần')
        : resetting
          ? resetConductWeekData(workspace, weekStart, actor)
          : reopenConductWeek(workspace, weekStart, actor);
      const message = locking
        ? `Đã tổng kết và khóa ${selectedPlanRow?.schoolPlanLabel || 'tuần'} (${formatDate(weekStart)} – ${formatDate(selectedWeekEnd)}).`
        : resetting
          ? `Đã reset toàn bộ dữ liệu tuần ${formatDate(weekStart)} – ${formatDate(selectedWeekEnd)}.`
          : 'Đã mở khóa tuần để điều chỉnh.';
      const [saveResult] = await Promise.all([
        onCommit(next, message),
        new Promise((resolve) => window.setTimeout(resolve, 720)),
      ]);
      setLockDialog({ open: false, mode: 'lock', password: '', reason: '', error: '', busy: false, resetConfirmed: false });
      showRecordSaveFeedback(
        saveResult?.ok === false ? 'warning' : 'success',
        locking ? (saveResult?.ok === false ? 'Đã khóa trên thiết bị' : 'Đã tổng kết tuần') : resetting ? 'Đã reset dữ liệu tuần' : 'Đã mở khóa tuần',
        locking
          ? 'Kết quả đã được chốt. Có thể mở khóa bằng mật khẩu khi cần sửa.'
          : resetting
            ? 'Tuần đã trở về 100 điểm ban đầu và có thể nhập dữ liệu mới.'
            : 'Tuần sẽ giữ trạng thái mở cho đến khi bạn tổng kết và khóa lại.',
        2800,
      );
    } catch (error) {
      setLockDialog((current) => ({ ...current, busy: false, error: error?.message || 'Không thể thực hiện thao tác.' }));
      showRecordSaveFeedback('error', resetting ? 'Không thể reset tuần' : locking ? 'Chưa thể tổng kết tuần' : 'Không thể mở khóa tuần', error?.message || 'Vui lòng thử lại.', 3600);
    }
  };

  const handleChangeLockPassword = async () => {
    setLockPasswordStatus({ type: '', message: '' });
    if (!(await verifyConductLockPassword(workspace, lockPasswordDraft.current))) {
      setLockPasswordStatus({ type: 'error', message: 'Mật khẩu hiện tại không đúng.' });
      return;
    }
    if (lockPasswordDraft.next.length < 6) {
      setLockPasswordStatus({ type: 'error', message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    if (lockPasswordDraft.next !== lockPasswordDraft.confirm) {
      setLockPasswordStatus({ type: 'error', message: 'Hai lần nhập mật khẩu mới chưa khớp.' });
      return;
    }
    try {
      const next = await changeConductLockPassword(workspace, lockPasswordDraft.next, currentUser?.name || currentUser?.email || 'GVCN');
      await onCommit(next, 'Đã đổi mật khẩu khóa tổng kết rèn luyện.');
      setLockPasswordDraft({ current: '', next: '', confirm: '' });
      setLockPasswordStatus({ type: 'success', message: 'Đã đổi mật khẩu khóa tổng kết.' });
    } catch (error) {
      setLockPasswordStatus({ type: 'error', message: error?.message || 'Không thể đổi mật khẩu.' });
    }
  };

  const handleAdminResetLockPassword = async () => {
    if (currentUser?.role !== 'admin') return;
    if (!window.confirm(`Đặt lại mật khẩu khóa rèn luyện về mặc định: ${DEFAULT_CONDUCT_LOCK_PASSWORD}?`)) return;
    const next = resetConductLockPassword(workspace, currentUser?.name || currentUser?.email || 'Admin');
    await onCommit(next, `Quản trị đã đặt lại mật khẩu khóa rèn luyện về mặc định ${DEFAULT_CONDUCT_LOCK_PASSWORD}.`);
    setLockPasswordDraft({ current: '', next: '', confirm: '' });
    setLockPasswordStatus({ type: 'success', message: `Đã reset về mật khẩu mặc định: ${DEFAULT_CONDUCT_LOCK_PASSWORD}` });
  };


  const printWeeklyReport = () => {
    const rows = weekRows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.student.code || '')}</td><td>${escapeHtml(row.student.fullName)}</td><td>${row.baseScore}</td><td>-${row.totalDeduction}</td><td>+${row.totalBonus || 0}</td><td><b>${row.score}</b></td><td>${escapeHtml(row.classification.label)}</td><td>${row.critical ? 'Cần xem xét' : ''}</td></tr>`).join('');
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
    if (!popup) return window.alert('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup.');
    popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo rèn luyện tuần</title><style>body{font-family:Arial,sans-serif;color:#172b24;padding:28px}h1{font-size:22px;margin:0 0 6px}.meta{margin-bottom:18px;color:#52645e}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #aab8b3;padding:7px;text-align:left}th{background:#edf5f2}.summary{display:flex;gap:18px;margin:14px 0}.summary b{font-size:18px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:44px;text-align:center}@media print{button{display:none}}</style></head><body><h1>BẢNG TỔNG KẾT RÈN LUYỆN THEO TUẦN</h1><div class="meta">Lớp: <b>${escapeHtml(workspace.classProfile?.className || '')}</b> · Năm học: ${escapeHtml(workspace.classProfile?.schoolYear || '')}<br>Tuần: ${escapeHtml(selectedPlanRow?.schoolPlanLabel || '')} · ${formatDate(weekStart)} – ${formatDate(selectedWeekEnd)} · Trạng thái: ${selectedWeekLocked ? 'Đã khóa' : 'Đang mở'}</div><div class="summary"><span>Điểm TB: <b>${averageWeekScore.toFixed(2)}</b></span><span>Vi phạm: <b>${violationCount}</b></span><span>Khen thưởng: <b>${rewardCount}</b></span><span>Cần xem xét: <b>${criticalCount}</b></span></div><table><thead><tr><th>STT</th><th>Mã HS</th><th>Họ và tên</th><th>Điểm đầu</th><th>Trừ</th><th>Cộng</th><th>Điểm cuối</th><th>Kết quả</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table><div class="sign"><div><b>Giáo viên chủ nhiệm</b><p>(Ký và ghi rõ họ tên)</p></div><div><b>Xác nhận</b><p>(Ký và ghi rõ họ tên)</p></div></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    popup.document.close();
  };

  const openRecordEditor = (record) => {
    if (isConductWeekLocked(workspace, record.weekStart || record.date)) {
      window.alert('Tuần này đã được tổng kết và khóa. Hãy mở khóa tuần trước khi điều chỉnh.');
      return;
    }
    setEditingRecordId(record.id);
    setEditDraft({
      studentId: record.studentId || '',
      date: record.date || weekStart,
      ruleId: record.ruleId || '',
      code: record.code || 'OTHER',
      category: record.category || 'Khác',
      title: record.title || '',
      entryType: record.entryType === 'reward' ? 'reward' : 'violation',
      deduction: record.entryType === 'reward' ? 0 : Math.max(5, Number(record.deduction) || 5),
      bonus: record.entryType === 'reward' ? Math.max(1, Number(record.bonus) || 1) : 0,
      schoolPoint: record.schoolPoint ?? '',
      note: record.note || '',
      evidence: record.evidence || '',
      severity: record.severity || 'normal',
      status: record.status || 'confirmed',
      requiresEscalation: Boolean(record.requiresEscalation),
      editReason: '',
    });
  };

  const handleEditRuleSelection = (nextRuleId) => {
    const nextRule = rules.find((item) => item.id === nextRuleId);
    if (!nextRule) {
      setEditDraft((current) => ({ ...current, ruleId: '', code: 'OTHER' }));
      return;
    }
    setEditDraft((current) => ({
      ...current,
      ruleId: nextRule.id,
      code: nextRule.code,
      category: nextRule.category,
      title: nextRule.title,
      deduction: nextRule.personalDeduction,
      schoolPoint: nextRule.schoolPoint ?? '',
      severity: nextRule.severity || 'normal',
      requiresEscalation: Boolean(nextRule.requiresEscalation),
    }));
  };

  const handleSaveRecordEdit = async () => {
    if (!editingRecordId || !editDraft) return;
    if (!editDraft.studentId) return window.alert('Vui lòng chọn học sinh.');
    if (!String(editDraft.title || '').trim()) return window.alert('Vui lòng nhập nội dung ghi nhận.');
    if (!String(editDraft.editReason || '').trim()) return window.alert('Vui lòng nhập lý do điều chỉnh để lưu lịch sử.');
    const student = workspace.students.find((item) => item.id === editDraft.studentId);
    showRecordSaveFeedback(
      'saving',
      'Đang điều chỉnh ghi nhận…',
      `Hệ thống đang cập nhật điểm rèn luyện tuần của ${student?.fullName || 'học sinh'} và lưu lịch sử thay đổi.`,
    );
    try {
      const next = updateConductRecord(
        workspace,
        editingRecordId,
        editDraft,
        currentUser?.name || currentUser?.email,
      );
      const [saveResult] = await Promise.all([
        onCommit(next, `Đã điều chỉnh ghi nhận “${editDraft.title}” và cập nhật lại điểm rèn luyện.`),
        new Promise((resolve) => window.setTimeout(resolve, 650)),
      ]);
      const movedWeek = startOfConductWeek(editDraft.date);
      setWeekStart(movedWeek);
      setEditingRecordId('');
      setEditDraft(null);
      if (saveResult?.ok === false) {
        showRecordSaveFeedback(
          'warning',
          'Đã điều chỉnh trên thiết bị',
          'Bảng điểm tuần đã cập nhật. Dữ liệu cloud chưa đồng bộ và sẽ được thử lại khi kết nối ổn định.',
          3200,
        );
      } else {
        showRecordSaveFeedback(
          'success',
          'Đã lưu điều chỉnh',
          editDraft.entryType === 'reward' ? `${student?.fullName || 'Học sinh'} hiện được cộng ${Math.max(1, Number(editDraft.bonus) || 1)} điểm.` : `${student?.fullName || 'Học sinh'} hiện bị trừ ${Math.max(5, Number(editDraft.deduction) || 5)} điểm cho lượt ghi nhận này.`,
          2400,
        );
      }
    } catch (error) {
      showRecordSaveFeedback(
        'error',
        'Chưa thể lưu điều chỉnh',
        error?.message || 'Đã xảy ra lỗi khi cập nhật vi phạm. Vui lòng thử lại.',
        3800,
      );
    }
  };

  const handleCancel = (record, event) => {
    if (!record?.id) return;
    if (isConductWeekLocked(workspace, record.weekStart || record.date)) {
      showRecordSaveFeedback('error', 'Tuần đang bị khóa', 'Hãy mở khóa tuần trước khi hủy ghi nhận này.', 3000);
      return;
    }
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;
    const dialogWidth = Math.min(560, Math.max(300, viewportWidth - 24));
    const estimatedHeight = 330;
    const gap = 10;
    const left = rect
      ? Math.max(12, Math.min(rect.right - dialogWidth, viewportWidth - dialogWidth - 12))
      : Math.max(12, (viewportWidth - dialogWidth) / 2);
    const top = rect
      ? (rect.bottom + gap + estimatedHeight <= viewportHeight
        ? rect.bottom + gap
        : Math.max(12, rect.top - estimatedHeight - gap))
      : Math.max(12, (viewportHeight - estimatedHeight) / 2);
    setCancelDialog({ open: true, record, busy: false, error: '', anchor: { top, left, width: dialogWidth } });
  };

  const closeCancelDialog = () => {
    if (cancelDialog.busy) return;
    setCancelDialog({ open: false, record: null, busy: false, error: '', anchor: null });
  };

  const confirmCancelRecord = async () => {
    const record = cancelDialog.record;
    if (!record?.id || cancelDialog.busy) return;
    if (isConductWeekLocked(workspace, record.weekStart || record.date)) {
      setCancelDialog((current) => ({ ...current, error: 'Tuần đã bị khóa lại. Hãy mở khóa tuần rồi thử lại.' }));
      return;
    }
    setCancelDialog((current) => ({ ...current, busy: true, error: '' }));
    const student = workspace.students.find((item) => item.id === record.studentId);
    showRecordSaveFeedback(
      'saving',
      'Đang hủy ghi nhận…',
      `Hệ thống đang loại lượt “${record.title}” khỏi bảng điểm tuần của ${student?.fullName || 'học sinh'} và lưu nhật ký thao tác.`,
    );
    try {
      const next = cancelConductRecord(
        workspace,
        record.id,
        'Hủy ghi nhận theo thao tác của GVCN',
        currentUser?.name || currentUser?.email,
      );
      const [saveResult] = await Promise.all([
        onCommit(next, 'Đã hủy ghi nhận; điểm tuần đã được tính lại.'),
        new Promise((resolve) => window.setTimeout(resolve, 550)),
      ]);
      setCancelDialog({ open: false, record: null, busy: false, error: '', anchor: null });
      if (saveResult?.ok === false) {
        showRecordSaveFeedback(
          'warning',
          'Đã hủy trên thiết bị',
          'Điểm tuần đã được tính lại. Dữ liệu cloud chưa đồng bộ và sẽ được thử lại khi kết nối ổn định.',
          3200,
        );
      } else {
        showRecordSaveFeedback(
          'success',
          'Đã hủy ghi nhận',
          record.entryType === 'reward' ? `Đã loại ${record.bonus || 0} điểm cộng của ${student?.fullName || 'học sinh'} khỏi tuần này.` : `${student?.fullName || 'Học sinh'} đã được hoàn lại ${record.deduction || 0} điểm bị trừ trong tuần này.`,
          2600,
        );
      }
    } catch (error) {
      setCancelDialog((current) => ({ ...current, busy: false, error: error?.message || 'Không thể hủy ghi nhận.' }));
      showRecordSaveFeedback('error', 'Chưa thể hủy ghi nhận', error?.message || 'Vui lòng thử lại.', 3500);
    }
  };

  const handleSyncAttendance = async () => {
    const result = syncAttendanceToConduct(workspace, weekStart, currentUser?.name || currentUser?.email);
    if (!result.added) return window.alert('Không có lượt đi trễ hoặc vắng không phép mới cần đồng bộ trong tuần này.');
    await onCommit(result.workspace, `Đã đồng bộ ${result.added} vi phạm chuyên cần từ dữ liệu điểm danh.`);
  };

  const handleAddCustomRule = async () => {
    try {
      const next = addCustomConductRule(workspace, customDraft);
      await onCommit(next, 'Đã thêm nội quy mới vào danh mục vi phạm của lớp.');
      setCustomDraft(EMPTY_CUSTOM);
    } catch (error) {
      window.alert(error?.message || 'Không thể thêm nội quy mới.');
    }
  };

  const handleToggleCustom = async (rule) => {
    await onCommit(setCustomConductRuleActive(workspace, rule.id, rule.active === false), rule.active === false ? 'Đã kích hoạt lại nội quy bổ sung.' : 'Đã tạm ẩn nội quy bổ sung.');
  };

  const handleSaveSettings = async () => {
    const thresholds = {
      good: Number(settingsDraft.thresholds.good),
      fair: Number(settingsDraft.thresholds.fair),
      pass: Number(settingsDraft.thresholds.pass),
    };
    if (!(thresholds.good > thresholds.fair && thresholds.fair > thresholds.pass && thresholds.pass >= 0)) {
      return window.alert('Ngưỡng điểm phải theo thứ tự: Tốt > Khá > Đạt.');
    }
    const useSchoolPlan = settingsDraft.academicCalendarMode === 'school-plan';
    const academicCalendar = useSchoolPlan
      ? { ...PETRUS_KY_ACADEMIC_PLAN_2026_2027.calendar }
      : { ...(settingsDraft.academicCalendar || {}) };
    const errors = validateAcademicCalendar(academicCalendar);
    if (errors.length) return window.alert(`Cần kiểm tra lịch năm học:\n• ${errors.join('\n• ')}`);
    const periodRanges = buildConductPeriodRangesForWorkspace(workspace, academicCalendar, settingsDraft.periodRanges);
    const yearLabel = schoolYearLabel(academicCalendar);
    const academicTerms = [
      ...(workspace.academicTerms || []).filter((item) => !['conduct-semester-1', 'conduct-semester-2'].includes(item.id)),
      { id: 'conduct-semester-1', label: 'Học kỳ I', startDate: academicCalendar.semester1Start, endDate: academicCalendar.semester1End, source: 'conduct-calendar' },
      { id: 'conduct-semester-2', label: 'Học kỳ II', startDate: academicCalendar.semester2Start, endDate: academicCalendar.semester2End, source: 'conduct-calendar' },
    ];
    const next = {
      ...workspace,
      classProfile: { ...workspace.classProfile, schoolYear: yearLabel === 'Chưa xác định' ? workspace.classProfile?.schoolYear : yearLabel },
      academicTerms,
      conductSettings: {
        ...(workspace.conductSettings || {}),
        weeklyBaseScore: Math.max(1, Number(settingsDraft.weeklyBaseScore) || 100),
        thresholds,
        academicPlanId: useSchoolPlan ? PETRUS_KY_ACADEMIC_PLAN_2026_2027.id : '',
        academicCalendarMode: useSchoolPlan ? 'school-plan' : 'custom',
        academicCalendar,
        periodRanges,
        autoLockWeeks: settingsDraft.autoLockWeeks !== false,
        lockDay: Number(settingsDraft.lockDay ?? 0),
        lockTime: settingsDraft.lockTime || '23:59',
        requireLockPassword: true,
      },
    };
    setSettingsDraft((current) => ({
      ...current,
      academicPlanId: useSchoolPlan ? PETRUS_KY_ACADEMIC_PLAN_2026_2027.id : '',
      academicCalendarMode: useSchoolPlan ? 'school-plan' : 'custom',
      academicCalendar,
      periodRanges,
    }));
    await onCommit(next, useSchoolPlan
      ? 'Đã áp dụng chính xác Khung kế hoạch thời gian năm học 2026-2027 của Trường Pétrus Ký.'
      : `Đã lưu lịch năm học ${yearLabel}, thời gian hai học kỳ và các giai đoạn xét rèn luyện.`);
  };

  const updateAcademicCalendar = (key, value) => {
    setSettingsDraft((current) => {
      const academicCalendar = { ...(current.academicCalendar || {}), [key]: value };
      return {
        ...current,
        academicPlanId: '',
        academicCalendarMode: 'custom',
        academicCalendar,
        periodRanges: buildConductPeriodRangesForWorkspace(workspace, academicCalendar, current.periodRanges),
      };
    });
  };

  const applySchoolYearPreset = () => {
    const academicCalendar = createAcademicCalendarDefaults(workspace.classProfile?.schoolYear);
    setSettingsDraft((current) => ({
      ...current,
      academicPlanId: '',
      academicCalendarMode: 'custom',
      academicCalendar,
      periodRanges: buildConductPeriodRangesForWorkspace(workspace, academicCalendar, current.periodRanges),
    }));
  };

  const applyPetrusKyAcademicPlan = () => {
    const academicCalendar = { ...PETRUS_KY_ACADEMIC_PLAN_2026_2027.calendar };
    setSettingsDraft((current) => ({
      ...current,
      academicPlanId: PETRUS_KY_ACADEMIC_PLAN_2026_2027.id,
      academicCalendarMode: 'school-plan',
      academicCalendar,
      periodRanges: buildConductPeriodRangesForWorkspace(workspace, academicCalendar, current.periodRanges),
    }));
    setWeekStart(PETRUS_KY_ACADEMIC_PLAN_2026_2027.rows.find((row) => row.conductEligible)?.startDate || weekStart);
    setRecordDate(PETRUS_KY_ACADEMIC_PLAN_2026_2027.rows.find((row) => row.conductEligible)?.startDate || recordDate);
  };


  return (
    <div className="hr-tab-stack hr-conduct-workspace">
      {recordSaveFeedback.status !== 'idle' ? (
        <div className={`hr-conduct-save-overlay ${recordSaveFeedback.status}`} role="status" aria-live="assertive" aria-busy={recordSaveFeedback.status === 'saving'}>
          <div className="hr-conduct-save-dialog">
            {recordSaveFeedback.status === 'saving' ? (
              <div className="hr-conduct-save-spinner"><i /><i /><i /></div>
            ) : (
              <span className="hr-conduct-save-result-icon">{recordSaveFeedback.status === 'success' ? '✓' : recordSaveFeedback.status === 'warning' ? '!' : '×'}</span>
            )}
            <div>
              <strong>{recordSaveFeedback.title}</strong>
              <p>{recordSaveFeedback.detail}</p>
            </div>
            {recordSaveFeedback.status === 'saving' ? <small>Vui lòng chờ trong giây lát…</small> : null}
          </div>
        </div>
      ) : null}
      {lockDialog.open && typeof document !== 'undefined' ? createPortal(
        <div className="hr-conduct-edit-overlay hr-conduct-lock-overlay" role="dialog" aria-modal="true" aria-labelledby="conduct-lock-dialog-title" onMouseDown={closeWeekLockDialog}>
          <section className="hr-conduct-lock-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <small>{lockDialog.mode === 'lock' ? 'TỔNG KẾT RÈN LUYỆN' : lockDialog.mode === 'reset' ? 'KHÔI PHỤC KHẨN CẤP' : 'MỞ KHÓA ĐỂ ĐIỀU CHỈNH'}</small>
                <h2 id="conduct-lock-dialog-title">{lockDialog.mode === 'lock' ? 'Xác nhận khóa kết quả tuần' : lockDialog.mode === 'reset' ? 'Reset dữ liệu tuần khẩn cấp' : 'Xác nhận mở khóa tuần'}</h2>
                <p>{selectedPlanRow?.schoolPlanLabel || 'Tuần rèn luyện'} · {formatDate(weekStart)} – {formatDate(selectedWeekEnd)}</p>
              </div>
              <button type="button" aria-label="Đóng" disabled={lockDialog.busy} onClick={closeWeekLockDialog}>×</button>
            </header>
            <div className="hr-conduct-lock-dialog-body">
              <div className="hr-conduct-lock-security-note">
                <span>🔐</span>
                <div><b>Mật khẩu bảo vệ tổng kết</b><p>Mật khẩu mặc định là <code>{DEFAULT_CONDUCT_LOCK_PASSWORD}</code>. Có thể đổi trong mục Bảo mật khóa tổng kết bên dưới.</p></div>
              </div>
              {lockDialog.mode === 'reset' ? (
                <div className="hr-conduct-reset-warning">
                  <b>Tuần này có {allWeekRecords.length} ghi nhận.</b>
                  <p>Reset sẽ xóa toàn bộ vi phạm, điểm cộng và kết quả đã chốt của đúng tuần đang chọn; bảng điểm trở về mức đầu tuần.</p>
                  <label><input type="checkbox" checked={lockDialog.resetConfirmed} onChange={(event) => setLockDialog((current) => ({ ...current, resetConfirmed: event.target.checked, error: '' }))} /><span>Tôi hiểu thao tác này không thể hoàn tác.</span></label>
                </div>
              ) : null}
              <label><span>Mật khẩu khóa rèn luyện <b>*</b></span><input type="password" autoFocus value={lockDialog.password} onChange={(event) => setLockDialog((current) => ({ ...current, password: event.target.value, error: '' }))} onKeyDown={(event) => { if (event.key === 'Enter') handleWeekLockSubmit(); }} placeholder="Nhập mật khẩu" /></label>
              {lockDialog.error ? <div className="hr-lock-password-message error">{lockDialog.error}</div> : null}
            </div>
            <footer><button type="button" className="secondary" disabled={lockDialog.busy} onClick={closeWeekLockDialog}>Hủy</button><button type="button" className={lockDialog.mode === 'lock' ? 'primary' : lockDialog.mode === 'reset' ? 'danger' : 'warning'} disabled={lockDialog.busy || !lockDialog.password || (lockDialog.mode === 'reset' && !lockDialog.resetConfirmed)} onClick={handleWeekLockSubmit}>{lockDialog.busy ? 'Đang xử lý…' : lockDialog.mode === 'lock' ? 'Tổng kết & khóa' : lockDialog.mode === 'reset' ? 'Xác nhận reset tuần' : 'Mở khóa tuần'}</button></footer>
          </section>
        </div>,
        document.body,
      ) : null}
      {cancelDialog.open && cancelDialog.record && typeof document !== 'undefined' ? createPortal(
        <div className="hr-conduct-cancel-overlay" role="dialog" aria-modal="true" aria-labelledby="conduct-cancel-dialog-title" onMouseDown={closeCancelDialog}>
          <section
            className="hr-conduct-cancel-dialog"
            style={cancelDialog.anchor ? { top: `${cancelDialog.anchor.top}px`, left: `${cancelDialog.anchor.left}px`, width: `${cancelDialog.anchor.width}px` } : undefined}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <small>HỦY GHI NHẬN RÈN LUYỆN</small>
                <h2 id="conduct-cancel-dialog-title">Xác nhận hủy ghi nhận</h2>
                <p>Hộp xác nhận được mở ngay cạnh nút vừa nhấn. Bản ghi vẫn được giữ trong nhật ký.</p>
              </div>
              <button type="button" aria-label="Đóng" disabled={cancelDialog.busy} onClick={closeCancelDialog}>×</button>
            </header>
            <div className="hr-conduct-cancel-dialog-body">
              <div className="hr-conduct-cancel-record">
                <span>{formatDate(cancelDialog.record.date)}</span>
                <div>
                  <b>{workspace.students.find((item) => item.id === cancelDialog.record.studentId)?.fullName || 'Học sinh đã lưu trữ'}</b>
                  <strong>{cancelDialog.record.title}</strong>
                  <small>{cancelDialog.record.entryType === 'reward' ? `Điểm cộng: +${cancelDialog.record.bonus || 0}` : `Điểm trừ: −${cancelDialog.record.deduction || 0}`}</small>
                </div>
              </div>
              <div className="hr-conduct-cancel-note">Sau khi hủy, bảng điểm tuần được tính lại ngay. Không cần nhập lý do.</div>
              {cancelDialog.error ? <div className="hr-lock-password-message error">{cancelDialog.error}</div> : null}
            </div>
            <footer>
              <button type="button" className="secondary" disabled={cancelDialog.busy} onClick={closeCancelDialog}>Quay lại</button>
              <button type="button" className="danger" disabled={cancelDialog.busy} onClick={confirmCancelRecord}>{cancelDialog.busy ? 'Đang hủy…' : 'Xác nhận hủy ghi nhận'}</button>
            </footer>
          </section>
        </div>,
        document.body,
      ) : null}
      {editingRecord && editDraft ? (
        <div className="hr-conduct-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="conduct-edit-title" onMouseDown={() => { if (recordSaveFeedback.status !== 'saving') { setEditingRecordId(''); setEditDraft(null); } }}>
          <section className="hr-conduct-edit-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><small>XEM LẠI & ĐIỀU CHỈNH</small><h2 id="conduct-edit-title">Thông tin ghi nhận rèn luyện</h2><p>Mọi thay đổi đều được lưu kèm người chỉnh sửa, thời gian và lý do.</p></div>
              <button type="button" aria-label="Đóng" onClick={() => { setEditingRecordId(''); setEditDraft(null); }}>×</button>
            </header>

            <div className="hr-conduct-edit-body">
              <div className="hr-form-grid four">
                <label><span>Học sinh</span><select value={editDraft.studentId} onChange={(event) => setEditDraft((current) => ({ ...current, studentId: event.target.value }))}>{students.map((student) => <option key={student.id} value={student.id}>{student.code ? `${student.code} · ` : ''}{student.fullName}</option>)}</select></label>
                <label><span>Ngày ghi nhận</span><input type="date" value={editDraft.date} onChange={(event) => setEditDraft((current) => ({ ...current, date: event.target.value }))} /></label>
                <label><span>Trạng thái</span><select value={editDraft.status} onChange={(event) => setEditDraft((current) => ({ ...current, status: event.target.value }))}><option value="confirmed">Đã xác nhận</option><option value="pending">Chờ xác nhận</option><option value="cancelled">Đã hủy</option></select></label>
                <label><span>Mức độ</span><select value={editDraft.severity} onChange={(event) => setEditDraft((current) => ({ ...current, severity: event.target.value }))}><option value="positive">Khen thưởng</option><option value="normal">Thông thường</option><option value="moderate">Cần lưu ý</option><option value="serious">Nghiêm trọng</option><option value="critical">Đặc biệt nghiêm trọng</option></select></label>
              </div>

              {editDraft.entryType === 'reward' ? (
                <div className="hr-form-grid three hr-conduct-edit-rule-row">
                  <label><span>Loại ghi nhận</span><select value="reward" disabled><option value="reward">Khen thưởng / khắc phục</option></select></label>
                  <label><span>Nội dung khen thưởng</span><input value={editDraft.title} onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))} /></label>
                  <label><span>Điểm cộng</span><input type="number" min="1" step="1" value={editDraft.bonus} onChange={(event) => setEditDraft((current) => ({ ...current, bonus: event.target.value }))} /></label>
                </div>
              ) : (
                <div className="hr-form-grid three hr-conduct-edit-rule-row">
                  <label><span>Chọn lại theo danh mục</span><select value={editDraft.ruleId || '__manual__'} onChange={(event) => handleEditRuleSelection(event.target.value)}><option value="__manual__">Nhập / điều chỉnh thủ công</option>{rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.code} · {rule.title} (−{rule.personalDeduction})</option>)}</select></label>
                  <label><span>Nội dung vi phạm</span><input value={editDraft.title} onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value, ruleId: '' }))} /></label>
                  <label><span>Điểm trừ</span><input type="number" min="5" step="1" value={editDraft.deduction} onChange={(event) => setEditDraft((current) => ({ ...current, deduction: event.target.value }))} /></label>
                </div>
              )}

              <div className="hr-form-grid two">
                <label><span>Nhóm / loại</span><input value={editDraft.category} onChange={(event) => setEditDraft((current) => ({ ...current, category: event.target.value }))} /></label>
                <label><span>Điểm thi đua trường (nếu có)</span><input type="number" step="0.1" value={editDraft.schoolPoint} onChange={(event) => setEditDraft((current) => ({ ...current, schoolPoint: event.target.value }))} placeholder="Để trống nếu không áp dụng" /></label>
              </div>

              <div className="hr-form-grid two">
                <label><span>Mô tả / giải trình</span><textarea value={editDraft.note} onChange={(event) => setEditDraft((current) => ({ ...current, note: event.target.value }))} /></label>
                <label><span>Minh chứng / biên bản</span><textarea value={editDraft.evidence} onChange={(event) => setEditDraft((current) => ({ ...current, evidence: event.target.value }))} /></label>
              </div>

              <label className="hr-conduct-edit-reason"><span>Lý do điều chỉnh <b>*</b></span><textarea value={editDraft.editReason} onChange={(event) => setEditDraft((current) => ({ ...current, editReason: event.target.value }))} placeholder="Ví dụ: Sửa nhầm học sinh, cập nhật số điểm theo biên bản, bổ sung minh chứng…" /></label>

              <div className="hr-conduct-edit-meta">
                <span>Ghi nhận ban đầu: <b>{formatDateTime(editingRecord.createdAt)}</b></span>
                <span>Người ghi nhận: <b>{editingRecord.createdBy || 'GVCN'}</b></span>
                <span>Đã điều chỉnh: <b>{editingRecord.history?.length || 0} lần</b></span>
                {editingRecord.source === 'attendance' ? <span>Nguồn: <b>Đồng bộ điểm danh</b></span> : null}
              </div>

              {editingRecord.history?.length ? (
                <details className="hr-conduct-edit-history">
                  <summary>Xem lịch sử điều chỉnh ({editingRecord.history.length})</summary>
                  <div>{[...editingRecord.history].reverse().map((revision, index) => <article key={revision.id || index}><header><b>{formatDateTime(revision.editedAt)}</b><span>{revision.editedBy || 'GVCN'}</span></header><p>{revision.reason || 'Điều chỉnh thông tin'}</p><small>Trước khi sửa: {revision.before?.title || editingRecord.title} · {revision.before?.entryType === 'reward' ? `+${revision.before?.bonus ?? editingRecord.bonus}` : `−${revision.before?.deduction ?? editingRecord.deduction}`} điểm · {recordStatusLabel(revision.before?.status)}</small></article>)}</div>
                </details>
              ) : null}
            </div>

            <footer>
              <button type="button" className="secondary" onClick={() => { setEditingRecordId(''); setEditDraft(null); }}>Đóng</button>
              <button type="button" className="primary hr-conduct-save-button" disabled={recordSaveFeedback.status === 'saving'} onClick={handleSaveRecordEdit}>{recordSaveFeedback.status === 'saving' ? <><i />Đang lưu…</> : 'Lưu điều chỉnh'}</button>
            </footer>
          </section>
        </div>
      ) : null}
      {showRewardForm ? (
        <div className="hr-conduct-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="conduct-reward-title" onMouseDown={() => setShowRewardForm(false)}>
          <section className="hr-conduct-edit-dialog hr-conduct-reward-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><small>KHEN THƯỞNG / KHẮC PHỤC</small><h2 id="conduct-reward-title">Cộng điểm rèn luyện trong tuần</h2><p>Điểm cộng giúp ghi nhận tiến bộ hoặc thành tích nhưng tổng điểm không vượt quá mức tối đa đã cấu hình.</p></div><button type="button" onClick={() => setShowRewardForm(false)}>×</button></header>
            <div className="hr-conduct-edit-body">
              <div className="hr-form-grid four">
                <label><span>Học sinh</span><select value={rewardDraft.studentId} onChange={(event) => setRewardDraft((current) => ({ ...current, studentId: event.target.value }))}><option value="">— Chọn học sinh —</option>{students.map((student) => <option key={student.id} value={student.id}>{student.code ? `${student.code} · ` : ''}{student.fullName}</option>)}</select></label>
                <label><span>Ngày ghi nhận</span><input type="date" value={rewardDraft.date} onChange={(event) => setRewardDraft((current) => ({ ...current, date: event.target.value }))} /></label>
                <label><span>Điểm cộng</span><input type="number" min="1" max="100" value={rewardDraft.bonus} onChange={(event) => setRewardDraft((current) => ({ ...current, bonus: event.target.value }))} /></label>
                <label><span>Nội dung</span><input value={rewardDraft.title} onChange={(event) => setRewardDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Tiến bộ, khắc phục tốt, đạt thành tích…" /></label>
              </div>
              <div className="hr-form-grid two"><label><span>Ghi chú</span><textarea value={rewardDraft.note} onChange={(event) => setRewardDraft((current) => ({ ...current, note: event.target.value }))} /></label><label><span>Minh chứng</span><textarea value={rewardDraft.evidence} onChange={(event) => setRewardDraft((current) => ({ ...current, evidence: event.target.value }))} /></label></div>
            </div>
            <footer><button type="button" className="secondary" onClick={() => setShowRewardForm(false)}>Hủy</button><button type="button" className="primary" onClick={handleReward}>Cộng điểm</button></footer>
          </section>
        </div>
      ) : null}
      {studentProfile ? (
        <div className="hr-conduct-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="conduct-profile-title" onMouseDown={() => setStudentProfileId('')}>
          <section className="hr-conduct-edit-dialog hr-conduct-profile-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><small>HỒ SƠ RÈN LUYỆN HỌC SINH</small><h2 id="conduct-profile-title">{studentProfile.fullName}</h2><p>{studentProfile.code || 'Chưa có mã học sinh'} · Xu hướng từ đầu năm học đến tuần đang xem.</p></div><button type="button" onClick={() => setStudentProfileId('')}>×</button></header>
            <div className="hr-conduct-edit-body">
              <TrendChart points={studentTrend} />
              <div className="hr-conduct-profile-summary">
                <article><small>Điểm mới nhất</small><b>{studentTrend.at(-1)?.score ?? 100}</b></article>
                <article><small>Điểm trung bình</small><b>{studentTrend.length ? (studentTrend.reduce((sum, item) => sum + item.score, 0) / studentTrend.length).toFixed(1) : '100.0'}</b></article>
                <article><small>Tổng điểm trừ</small><b>−{studentTrend.reduce((sum, item) => sum + item.totalDeduction, 0)}</b></article>
                <article><small>Tổng điểm cộng</small><b>+{studentTrend.reduce((sum, item) => sum + item.totalBonus, 0)}</b></article>
              </div>
              <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Tuần</th><th>Trừ</th><th>Cộng</th><th>Điểm</th><th>Kết quả</th><th>Trạng thái</th></tr></thead><tbody>{[...studentTrend].reverse().map((item) => <tr key={item.weekStart}><td>{formatDate(item.weekStart)} – {formatDate(item.weekEnd)}</td><td>−{item.totalDeduction}</td><td>+{item.totalBonus}</td><td><b>{item.score}</b></td><td><span className={`hr-conduct-result ${scoreTone(item.classification)}`}>{item.classification.label}</span></td><td>{item.locked ? 'Đã khóa' : 'Đang mở'}</td></tr>)}</tbody></table></div>
            </div>
            <footer><button type="button" className="primary" onClick={() => setStudentProfileId('')}>Đóng</button></footer>
          </section>
        </div>
      ) : null}
      <section className="hr-panel hr-conduct-hero">
        <div>
          <small>100 ĐIỂM MỖI TUẦN · KHUNG KẾ HOẠCH PÉTRUS KÝ 2026-2027</small>
          <h2>Sổ rèn luyện điện tử theo đúng tuần của trường</h2>
          <p>Mỗi học sinh bắt đầu tuần với 100 điểm. Với lớp 12, bốn tuần hè từ 15/06 đến 11/07/2026 được tính vào trung bình Học kỳ I và cả năm; với các khối khác, các tuần này chỉ dùng để theo dõi riêng. Tuần 0 không tính trung bình.</p>
        </div>
        <div className="hr-conduct-week-picker">
          <label><span>Tuần đang theo dõi</span><select value={weekStart} onChange={(event) => { setWeekStart(event.target.value); setRecordDate(event.target.value); }}>{availableWeeks.map((week) => <option key={week} value={week}>{weekOptionText(week)}</option>)}</select></label>
          <b>{selectedPlanRow?.schoolPlanLabel || 'Tuần rèn luyện'} · {formatDate(weekStart)} → {formatDate(selectedWeekEnd)}</b>
          <span className={`hr-conduct-week-state ${selectedWeekLocked ? 'locked' : 'open'}`}>{selectedWeekLocked ? '🔒 Đã tổng kết' : '● Đang mở'}</span>
          <button type="button" className="secondary" onClick={handleSyncAttendance} disabled={selectedWeekLocked}>Đồng bộ từ điểm danh</button>
        </div>
      </section>

      {selectedPlanRow ? (
        <section className={`hr-panel hr-school-plan-week ${selectedPlanRow.kind}`}>
          <div className="hr-school-plan-week-index"><span>{selectedPlanRow.schoolWeekNumber === null ? '—' : selectedPlanRow.schoolWeekNumber}</span><small>{selectedPlanRow.kind === 'summer-prep' ? 'TUẦN HÈ' : selectedPlanRow.semester === 'ORIENTATION' ? 'TUẦN 0' : selectedPlanRow.semester}</small></div>
          <div className="hr-school-plan-week-main">
            <small>KHGD NHÀ TRƯỜNG · DÒNG {selectedPlanRow.row} TRONG VĂN BẢN</small>
            <h3>{selectedPlanRow.schoolPlanLabel}</h3>
            <p>{selectedPlanRow.notes || 'Không có ghi chú hoạt động bổ sung trong tuần này.'}</p>
          </div>
          <div className="hr-school-plan-week-meta">
            <span><b>Thời gian</b>{formatDate(selectedPlanRow.startDate)} – {formatDate(selectedPlanRow.endDate)}</span>
            <span><b>KHGD chính khóa</b>{selectedPlanRow.curriculumPlanLabel || 'Chưa bắt đầu / không ghi tuần'}</span>
            <span><b>Tính trung bình</b>{selectedPlanRow.includeInAverage ? 'Có' : 'Không (tuần ổn định tổ chức)'}</span>
          </div>
        </section>
      ) : null}

      <section className="hr-conduct-stat-grid hr-conduct-dashboard-grid">
        <ConductStat label="Điểm trung bình tuần" value={averageWeekScore.toFixed(1)} note={`${weekRows.length} học sinh`} tone="green" />
        <ConductStat label="Tốt" value={weekCounts.good} note="90–100 điểm" tone="green" />
        <ConductStat label="Khá" value={weekCounts.fair} note="75–89 điểm" tone="blue" />
        <ConductStat label="Đạt / Chưa đạt" value={`${weekCounts.pass} / ${weekCounts.fail}`} note="Cần theo dõi" tone="orange" />
        <ConductStat label="Vi phạm / Khen thưởng" value={`${violationCount} / ${rewardCount}`} note={`${weekRecords.filter((item) => item.status === 'pending').length} chờ xác nhận`} tone="orange" />
        <ConductStat label="Cảnh báo nghiêm trọng" value={criticalCount} note="Cần GVCN xem xét" tone="red" />
      </section>

      <section className={`hr-panel hr-conduct-lock-panel ${selectedWeekLocked ? 'locked' : 'open'}`}>
        <div><span>{selectedWeekLocked ? '🔒' : '✓'}</span><div><small>{selectedWeekLocked ? 'TUẦN ĐÃ ĐƯỢC CHỐT' : 'TUẦN ĐANG MỞ'}</small><h3>{selectedWeekLocked ? `Khóa lúc ${formatDateTime(selectedWeekSummary?.lockedAt)}` : 'Có thể tiếp tục ghi nhận và điều chỉnh'}</h3><p>{selectedWeekLocked ? `${selectedWeekSummary?.lockedBy || 'Hệ thống'} · ${selectedWeekSummary?.lockReason || 'Tổng kết tuần'}` : 'Sau khi rà soát, hãy tổng kết để cố định kết quả. Tuần đã mở sẽ không tự khóa lại cho đến khi bạn chủ động khóa.'}</p></div></div>
        <div className="hr-conduct-lock-actions"><button type="button" className="secondary" onClick={printWeeklyReport}>In / lưu PDF</button>{selectedWeekLocked ? <button type="button" className="warning" onClick={() => openWeekLockDialog('unlock')}>Mở khóa tuần</button> : <button type="button" className="primary" onClick={() => openWeekLockDialog('lock')}>Tổng kết & khóa tuần</button>}<button type="button" className="danger" onClick={() => openWeekLockDialog('reset')}>Reset dữ liệu tuần khẩn cấp</button></div>
      </section>

      <section className="hr-panel hr-conduct-entry">
        <div className="hr-panel-head">
          <div><small>GHI NHẬN MỚI</small><h2>Chọn học sinh và nội dung vi phạm</h2><p>Danh mục chính thức bám theo Quyết định 95/QĐ-PEK. Vi phạm khác có thể nhập và lưu thành nội quy mới.</p></div>
          <div className="hr-head-actions"><button type="button" className="secondary" disabled={selectedWeekLocked} onClick={() => { setRewardDraft((current) => ({ ...current, date: weekStart })); setShowRewardForm(true); }}>＋ Cộng điểm</button><button type="button" className={`primary hr-conduct-save-button ${recordSaveFeedback.status === 'saving' ? 'is-saving' : ''}`} disabled={recordSaveFeedback.status === 'saving' || isConductWeekLocked(workspace, resolveConductWeekStart(workspace, recordDate, { nearest: true }))} onClick={handleRecord}>{recordSaveFeedback.status === 'saving' ? <><i />Đang lưu…</> : <>Ghi nhận & trừ điểm</>}</button></div>
        </div>
        <div className="hr-form-grid four">
          <label><span>Học sinh</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">— Chọn học sinh —</option>{students.map((student) => <option key={student.id} value={student.id}>{student.code ? `${student.code} · ` : ''}{student.fullName}</option>)}</select></label>
          <label><span>Ngày vi phạm</span><input type="date" min={activeAcademicPlan?.calendar.schoolYearStart || ''} max={activeAcademicPlan?.calendar.semester2End || ''} value={recordDate} onChange={(event) => { const value = event.target.value; setRecordDate(value); try { setWeekStart(resolveConductWeekStart(workspace, value)); } catch { /* giữ tuần hiện tại và báo khi lưu */ } }} /></label>
          <label className="hr-conduct-rule-select"><span>Nội dung vi phạm</span><select value={ruleId} onChange={(event) => setRuleId(event.target.value)}>{rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.code} · {rule.title} (−{rule.personalDeduction})</option>)}<option value="__other__">＋ Vi phạm khác / nội quy mới</option></select></label>
          <label><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="confirmed">Đã xác nhận</option><option value="pending">Chờ xác nhận</option></select></label>
        </div>

        {ruleId === '__other__' ? (
          <div className="hr-conduct-other-box">
            <label><span>Nội dung vi phạm khác</span><input value={otherTitle} onChange={(event) => setOtherTitle(event.target.value)} placeholder="Ví dụ: Không thực hiện quy định mới của trường…" /></label>
            <label><span>Số điểm trừ</span><input type="number" min="5" step="5" value={otherDeduction} onChange={(event) => setOtherDeduction(event.target.value)} /></label>
            <label className="hr-check-label"><input type="checkbox" checked={saveOtherRule} onChange={(event) => setSaveOtherRule(event.target.checked)} /><span>Lưu vào danh mục để dùng cho các tuần sau</span></label>
          </div>
        ) : selectedRule ? (
          <div className={`hr-conduct-rule-preview ${selectedRule.severity || 'normal'}`}>
            <div><b>{selectedRule.code} · {selectedRule.title}</b><p>{selectedRule.description}</p><small>{selectedRule.reference}</small></div>
            <aside><SeverityBadge severity={selectedRule.severity} /><strong>−{selectedRule.personalDeduction}</strong><span>điểm rèn luyện</span>{selectedRule.schoolPoint !== null && selectedRule.schoolPoint !== undefined ? <small>Điểm thi đua trường: {selectedRule.schoolPoint}</small> : null}</aside>
          </div>
        ) : null}

        <div className="hr-form-grid two">
          <label><span>Mô tả / giải trình</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Thời gian, tiết học, diễn biến, ý kiến học sinh…" /></label>
          <label><span>Minh chứng / biên bản</span><textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Tên file, đường dẫn, người chứng kiến hoặc số biên bản…" /></label>
        </div>
      </section>

      <section className="hr-panel hr-conduct-week-review">
        <div className="hr-panel-head hr-conduct-week-review-head">
          <div><small>TỔNG KẾT THEO TUẦN</small><h2>Bảng điểm và lịch sử vi phạm</h2><p>Chọn bất kỳ tuần nào trong năm học để xem điểm, mở lại vi phạm đã ghi nhận và điều chỉnh khi cần.</p></div>
          <div className="hr-conduct-week-nav">
            <button type="button" className="secondary" aria-label="Tuần trước" onClick={() => selectAdjacentWeek(-1)}>←</button>
            <label><span>Tuần cần xem</span><select value={weekStart} onChange={(event) => setWeekStart(event.target.value)}>{availableWeeks.map((week) => <option key={week} value={week}>{weekOptionText(week)}</option>)}</select></label>
            <button type="button" className="secondary" aria-label="Tuần sau" onClick={() => selectAdjacentWeek(1)}>→</button>
            <button type="button" className="secondary current" onClick={() => setWeekStart(resolveConductWeekStart(workspace, today(), { nearest: true }))}>Tuần hiện tại</button>
          </div>
        </div>

        <div className="hr-conduct-week-tabs" role="tablist" aria-label="Nội dung tổng kết tuần">
          <button type="button" role="tab" aria-selected={weekReviewMode === 'scores'} className={weekReviewMode === 'scores' ? 'active' : ''} onClick={() => setWeekReviewMode('scores')}>Bảng điểm tuần</button>
          <button type="button" role="tab" aria-selected={weekReviewMode === 'records'} className={weekReviewMode === 'records' ? 'active' : ''} onClick={() => setWeekReviewMode('records')}>Ghi nhận <span>{allWeekRecords.length}</span></button>
          <button type="button" role="tab" aria-selected={weekReviewMode === 'timeline'} className={weekReviewMode === 'timeline' ? 'active' : ''} onClick={() => setWeekReviewMode('timeline')}>Dòng thời gian</button>
          <button type="button" role="tab" aria-selected={weekReviewMode === 'audit'} className={weekReviewMode === 'audit' ? 'active' : ''} onClick={() => setWeekReviewMode('audit')}>Nhật ký sửa đổi <span>{weekAuditTrail.length}</span></button>
          <div><b>{selectedPlanRow?.schoolPlanLabel || 'Tuần rèn luyện'} · {formatDate(weekStart)} → {formatDate(selectedWeekEnd)}</b><small>{selectedWeekLocked ? 'Đã khóa' : 'Đang mở'} · {selectedWeekRecordCount} xác nhận · {allWeekRecords.filter((item) => item.status === 'pending').length} chờ · {allWeekRecords.filter((item) => item.status === 'cancelled').length} hủy</small></div>
        </div>

        {weekReviewMode === 'scores' ? (
          <div className="hr-table-wrap"><table className="hr-table hr-conduct-score-table"><thead><tr><th>Học sinh</th><th>Điểm đầu</th><th>Điểm trừ</th><th>Điểm cộng</th><th>Điểm cuối</th><th>Kết quả</th><th>Ghi nhận</th><th>Cảnh báo</th></tr></thead><tbody>{weekRows.map((row) => <tr key={row.student.id}><td><button type="button" className="hr-conduct-student-link" onClick={() => setStudentProfileId(row.student.id)}><span>{row.student.fullName.slice(0, 1)}</span><p><b>{row.student.fullName}</b><small>{row.student.code || 'Chưa có mã học sinh'} · Xem hồ sơ</small></p></button></td><td>{row.baseScore}</td><td><b className="hr-conduct-minus">−{row.totalDeduction}</b></td><td><b className="hr-conduct-plus">+{row.totalBonus || 0}</b></td><td><strong className={`hr-conduct-score ${scoreTone(row.classification)}`}>{row.score}</strong></td><td><span className={`hr-conduct-result ${scoreTone(row.classification)}`}>{row.classification.label}</span></td><td><button type="button" className="hr-conduct-record-count" onClick={() => { setRecordFilterStudentId(row.student.id); setRecordFilterStatus('active'); setWeekReviewMode('records'); }}>{row.records.length} lượt</button></td><td>{row.critical ? <span className="hr-conduct-alert">Cần xem xét</span> : <span className="hr-conduct-clear">Bình thường</span>}</td></tr>)}</tbody></table></div>
        ) : weekReviewMode === 'records' ? (
          <div className="hr-conduct-record-review">
            <div className="hr-conduct-record-filters">
              <input value={recordQuery} onChange={(event) => setRecordQuery(event.target.value)} placeholder="Tìm học sinh, mã, nội dung hoặc minh chứng…" />
              <select value={recordFilterStudentId} onChange={(event) => setRecordFilterStudentId(event.target.value)}><option value="all">Tất cả học sinh</option>{students.map((student) => <option key={student.id} value={student.id}>{student.code ? `${student.code} · ` : ''}{student.fullName}</option>)}</select>
              <select value={recordFilterStatus} onChange={(event) => setRecordFilterStatus(event.target.value)}><option value="active">Đang tính điểm</option><option value="confirmed">Đã xác nhận</option><option value="pending">Chờ xác nhận</option><option value="cancelled">Đã hủy</option><option value="all">Tất cả trạng thái</option></select>
              <button type="button" className="secondary" onClick={() => { setRecordQuery(''); setRecordFilterStudentId('all'); setRecordFilterStatus('active'); }}>Xóa bộ lọc</button>
            </div>
            {selectedWeekLocked ? <div className="hr-conduct-locked-note">🔒 Tuần đã khóa. Nhấn “Mở khóa tuần”, nhập mật khẩu và có thể sửa ngay; không cần nhập lý do.</div> : null}
            {filteredWeekRecords.length ? <div className="hr-conduct-record-list">{filteredWeekRecords.map((record) => {
              const student = students.find((item) => item.id === record.studentId) || workspace.students.find((item) => item.id === record.studentId);
              const isReward = record.entryType === 'reward';
              return <article key={record.id} className={`${record.status} ${isReward ? 'reward' : ''}`}><time>{formatDate(record.date)}<small>{record.code || (isReward ? 'BONUS' : 'OTHER')}</small></time><div><b>{student?.fullName || 'Học sinh đã lưu trữ'}</b><strong>{record.title}</strong><p>{record.note || 'Không có mô tả bổ sung.'}</p><small>{record.source === 'attendance' ? 'Đồng bộ từ điểm danh' : isReward ? 'Khen thưởng / khắc phục' : 'Ghi nhận thủ công'} · {record.createdBy || 'GVCN'}{record.evidence ? ` · Minh chứng: ${record.evidence}` : ''}{record.history?.length ? ` · Đã sửa ${record.history.length} lần` : ''}</small>{record.status === 'cancelled' && record.cancelReason ? <em>Lý do hủy: {record.cancelReason}</em> : null}</div><aside>{isReward ? <span className="hr-conduct-severity positive">Khen thưởng</span> : <SeverityBadge severity={record.severity} />}<b className={isReward ? 'hr-conduct-plus' : ''}>{isReward ? `+${record.bonus || 0}` : `−${record.deduction}`}</b><span className={`hr-conduct-status ${record.status}`}>{recordStatusLabel(record.status)}</span><div className="hr-conduct-record-actions"><button type="button" className="edit" disabled={selectedWeekLocked} onClick={() => openRecordEditor(record)}>{selectedWeekLocked ? 'Đã khóa' : 'Xem / điều chỉnh'}</button>{record.status !== 'cancelled' ? <button type="button" disabled={selectedWeekLocked} onClick={(event) => handleCancel(record, event)}>Hủy ghi nhận</button> : null}</div></aside></article>;
            })}</div> : <div className="hr-empty"><span>⌕</span><h3>Không tìm thấy ghi nhận phù hợp</h3><p>Hãy đổi tuần hoặc xóa bộ lọc để xem toàn bộ dữ liệu.</p></div>}
          </div>
        ) : weekReviewMode === 'timeline' ? (
          <div className="hr-conduct-timeline">{[...allWeekRecords].sort((a, b) => `${a.date}${a.createdAt}`.localeCompare(`${b.date}${b.createdAt}`)).map((record) => { const student = workspace.students.find((item) => item.id === record.studentId); const isReward = record.entryType === 'reward'; return <article key={record.id} className={`${record.status} ${isReward ? 'reward' : ''}`}><time>{formatDate(record.date)}</time><i /><div><small>{student?.fullName || 'Học sinh đã lưu trữ'} · {recordStatusLabel(record.status)}</small><b>{record.title}</b><p>{isReward ? `+${record.bonus || 0}` : `−${record.deduction || 0}`} điểm · {record.createdBy || 'GVCN'}</p></div></article>;})}{!allWeekRecords.length ? <div className="hr-empty"><span>✓</span><h3>Tuần chưa có ghi nhận</h3><p>Tất cả học sinh đang ở mức điểm khởi tạo.</p></div> : null}</div>
        ) : (
          <div className="hr-conduct-audit"><div className="hr-conduct-audit-search"><input value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} placeholder="Tìm người sửa, học sinh, nội dung hoặc lý do…" /><span>{filteredAuditTrail.length} sự kiện</span></div>{filteredAuditTrail.length ? filteredAuditTrail.map((event) => { const student = workspace.students.find((item) => item.id === event.studentId); return <article key={event.id}><time>{formatDateTime(event.at)}</time><span className={`action ${event.action}`}>{auditActionLabel(event.action)}</span><div><b>{event.title}</b><p>{student ? `${student.fullName} · ` : ''}{event.detail || 'Không có ghi chú'}{event.automatic ? ' · Tự động' : ''}</p></div><strong>{event.by || 'Hệ thống'}</strong></article>; }) : <div className="hr-empty"><span>⌁</span><h3>Chưa có lịch sử thay đổi</h3><p>Các thao tác ghi nhận, chỉnh sửa, khóa và mở khóa sẽ xuất hiện ở đây.</p></div>}</div>
        )}
      </section>

      <section className="hr-panel hr-conduct-period">
        <div className="hr-panel-head"><div><small>TỔNG HỢP ĐỊNH KỲ</small><h2>Tháng · Giữa kỳ · Cuối kỳ · Cả năm</h2><p>Kết quả là trung bình điểm của các tuần thuộc giai đoạn. Riêng lớp 12, bốn tuần hè 15/06–11/07/2026 được tính vào Học kỳ I và cả năm.</p></div><div className="hr-head-actions"><select value={periodMode} onChange={(event) => setPeriodMode(event.target.value)}><option value="month">Theo tháng</option><option value="mid1">Giữa học kỳ I</option><option value="semester1">Cuối học kỳ I</option><option value="mid2">Giữa học kỳ II</option><option value="semester2">Cuối học kỳ II</option><option value="year">Cả năm</option></select>{periodMode === 'month' ? <input type="month" value={monthValue} onChange={(event) => setMonthValue(event.target.value)} /> : null}</div></div>
        <div className="hr-conduct-period-label"><b>{periodRange.label}</b><span>{formatDate(periodRange.start)} → {formatDate(periodRange.end)}</span></div>
        <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Học sinh</th><th>Số tuần</th><th>Đã khóa</th><th>Điểm trừ</th><th>Điểm cộng</th><th>Điểm trung bình</th><th>Kết quả</th><th>Cảnh báo</th></tr></thead><tbody>{periodRows.map((row) => <tr key={row.student.id}><td><b>{row.student.fullName}</b><small>{row.student.code || '—'}</small></td><td>{row.weekCount}</td><td>{row.lockedWeeks || 0}</td><td>−{row.totalDeduction}</td><td className="hr-conduct-plus">+{row.totalBonus || 0}</td><td><strong className={`hr-conduct-score ${scoreTone(row.classification)}`}>{row.average.toFixed(2)}</strong></td><td><span className={`hr-conduct-result ${scoreTone(row.classification)}`}>{row.classification.label}</span></td><td>{row.criticalWeeks ? <span className="hr-conduct-alert">{row.criticalWeeks} tuần</span> : '0'}</td></tr>)}</tbody></table></div>
      </section>

      <section className="hr-panel hr-conduct-settings">
        <div className="hr-panel-head"><div><small>THANG ĐIỂM & LỊCH NĂM HỌC</small><h2>Cấu hình thời gian xét rèn luyện</h2><p>Mặc định dùng chính xác Khung kế hoạch thời gian năm học 2026-2027 của Trường Pétrus Ký. Có thể chuyển sang lịch tùy chỉnh cho năm học khác.</p></div><div className="hr-head-actions"><button type="button" className={settingsDraft.academicCalendarMode === 'school-plan' ? 'primary' : 'secondary'} onClick={applyPetrusKyAcademicPlan}>Áp dụng lịch Pétrus Ký 2026-2027</button><button type="button" className="secondary" onClick={applySchoolYearPreset}>Lịch tùy chỉnh</button><button type="button" className="primary" onClick={handleSaveSettings}>Lưu cấu hình</button></div></div>
        <div className={`hr-school-plan-source ${settingsDraft.academicCalendarMode === 'school-plan' ? 'active' : 'custom'}`}>
          <div><span>{settingsDraft.academicCalendarMode === 'school-plan' ? '✓' : '✎'}</span><section><small>NGUỒN TUẦN RÈN LUYỆN</small><h3>{settingsDraft.academicCalendarMode === 'school-plan' ? PETRUS_KY_ACADEMIC_PLAN_2026_2027.title : 'Lịch tùy chỉnh của lớp'}</h3><p>{settingsDraft.academicCalendarMode === 'school-plan' ? isGrade12Workspace(workspace) ? '46 tuần tính trung bình cho lớp 12: 4 tuần hè + 21 tuần HKI + 21 tuần HKII; Tuần 0 theo dõi riêng.' : '42 tuần tính trung bình (21 tuần HKI + 21 tuần HKII); 4 tuần hè khối 12 và Tuần 0 chỉ theo dõi riêng.' : 'Ngày và tuần được tạo từ khoảng thời gian tự nhập; không đối chiếu tự động với văn bản của trường.'}</p></section></div>
          <aside><b>{settingsDraft.academicCalendarMode === 'school-plan' ? 'ĐANG ÁP DỤNG' : 'TÙY CHỈNH'}</b><span>{PETRUS_KY_ACADEMIC_PLAN_2026_2027.schoolYear}</span></aside>
        </div>
        <div className="hr-form-grid four">
          <label><span>Điểm đầu tuần</span><input type="number" min="1" value={settingsDraft.weeklyBaseScore} onChange={(event) => setSettingsDraft((current) => ({ ...current, weeklyBaseScore: event.target.value }))} /></label>
          <label><span>Tốt từ</span><input type="number" min="0" max="100" value={settingsDraft.thresholds.good} onChange={(event) => setSettingsDraft((current) => ({ ...current, thresholds: { ...current.thresholds, good: event.target.value } }))} /></label>
          <label><span>Khá từ</span><input type="number" min="0" max="100" value={settingsDraft.thresholds.fair} onChange={(event) => setSettingsDraft((current) => ({ ...current, thresholds: { ...current.thresholds, fair: event.target.value } }))} /></label>
          <label><span>Đạt từ</span><input type="number" min="0" max="100" value={settingsDraft.thresholds.pass} onChange={(event) => setSettingsDraft((current) => ({ ...current, thresholds: { ...current.thresholds, pass: event.target.value } }))} /></label>
        </div>
        <div className="hr-conduct-auto-lock-settings">
          <label className="hr-check-label"><input type="checkbox" checked={settingsDraft.autoLockWeeks !== false} onChange={(event) => setSettingsDraft((current) => ({ ...current, autoLockWeeks: event.target.checked }))} /><span>Tự động tổng kết và khóa tuần</span></label>
          <label><span>Ngày khóa</span><select value={settingsDraft.lockDay} onChange={(event) => setSettingsDraft((current) => ({ ...current, lockDay: Number(event.target.value) }))}><option value={0}>Chủ nhật</option><option value={6}>Thứ Bảy</option><option value={5}>Thứ Sáu</option></select></label>
          <label><span>Thời điểm khóa</span><input type="time" value={settingsDraft.lockTime} onChange={(event) => setSettingsDraft((current) => ({ ...current, lockTime: event.target.value }))} /></label>
          <p>Việc tự khóa được thực hiện khi ứng dụng đang mở hoặc ở lần mở tiếp theo sau thời điểm đã đặt. Tuần được mở thủ công sẽ không bị tự khóa lại; GVCN chỉ cần nhập mật khẩu, không cần lý do.</p>
        </div>

        <div className="hr-conduct-lock-password-settings">
          <div className="hr-lock-password-heading">
            <span>🔐</span>
            <div><small>BẢO MẬT KHÓA TỔNG KẾT</small><h3>Mật khẩu khóa và mở kết quả tuần</h3><p>Hệ thống yêu cầu mật khẩu khi tổng kết thủ công và khi mở khóa để sửa dữ liệu.</p></div>
            <aside><small>TRẠNG THÁI</small><b>{workspace.conductSettings?.lockPasswordHash ? 'Đã đổi mật khẩu' : 'Đang dùng mặc định'}</b></aside>
          </div>
          <div className="hr-lock-default-password"><span>Mật khẩu mặc định</span><code>{DEFAULT_CONDUCT_LOCK_PASSWORD}</code><small>Chỉ GVCN và quản trị viên nên biết mật khẩu này.</small></div>
          <div className="hr-form-grid three">
            <label><span>Mật khẩu hiện tại</span><input type="password" autoComplete="current-password" value={lockPasswordDraft.current} onChange={(event) => setLockPasswordDraft((current) => ({ ...current, current: event.target.value }))} /></label>
            <label><span>Mật khẩu mới</span><input type="password" autoComplete="new-password" value={lockPasswordDraft.next} onChange={(event) => setLockPasswordDraft((current) => ({ ...current, next: event.target.value }))} placeholder="Tối thiểu 6 ký tự" /></label>
            <label><span>Nhập lại mật khẩu mới</span><input type="password" autoComplete="new-password" value={lockPasswordDraft.confirm} onChange={(event) => setLockPasswordDraft((current) => ({ ...current, confirm: event.target.value }))} /></label>
          </div>
          <div className="hr-lock-password-actions">
            <button type="button" className="primary" onClick={handleChangeLockPassword}>Đổi mật khẩu</button>
            {currentUser?.role === 'admin' ? <button type="button" className="warning" onClick={handleAdminResetLockPassword}>Quản trị: Reset về mặc định</button> : null}
            {workspace.conductSettings?.lockPasswordChangedAt ? <small>Thay đổi gần nhất: {formatDateTime(workspace.conductSettings.lockPasswordChangedAt)} · {workspace.conductSettings.lockPasswordChangedBy || 'Không rõ'}</small> : null}
          </div>
          {lockPasswordStatus.message ? <div className={`hr-lock-password-message ${lockPasswordStatus.type}`}>{lockPasswordStatus.message}</div> : null}
        </div>

        <div className="hr-academic-calendar-head">
          <div><small>NĂM HỌC ĐANG CẤU HÌNH</small><strong>{activeSchoolYearLabel}</strong><span>{formatDate(settingsDraft.academicCalendar?.schoolYearStart)} → {formatDate(settingsDraft.academicCalendar?.schoolYearEnd)}</span></div>
          <p>{durationSummary(settingsDraft.academicCalendar?.schoolYearStart, settingsDraft.academicCalendar?.schoolYearEnd)}</p>
        </div>

        <div className="hr-academic-calendar-grid">
          <article className="school-year">
            <header><span>01</span><div><small>TOÀN NĂM</small><h3>Năm học</h3></div></header>
            <label><span>Ngày bắt đầu năm học</span><input type="date" disabled={settingsDraft.academicCalendarMode === 'school-plan'} value={settingsDraft.academicCalendar?.schoolYearStart || ''} onChange={(event) => updateAcademicCalendar('schoolYearStart', event.target.value)} /></label>
            <label><span>Ngày kết thúc năm học</span><input type="date" disabled={settingsDraft.academicCalendarMode === 'school-plan'} value={settingsDraft.academicCalendar?.schoolYearEnd || ''} onChange={(event) => updateAcademicCalendar('schoolYearEnd', event.target.value)} /></label>
            <footer>{durationSummary(settingsDraft.academicCalendar?.schoolYearStart, settingsDraft.academicCalendar?.schoolYearEnd)}</footer>
          </article>
          <article className="semester-one">
            <header><span>02</span><div><small>GIAI ĐOẠN 1</small><h3>Học kỳ I</h3></div></header>
            <label><span>Bắt đầu học kỳ I</span><input type="date" disabled={settingsDraft.academicCalendarMode === 'school-plan'} value={settingsDraft.academicCalendar?.semester1Start || ''} onChange={(event) => updateAcademicCalendar('semester1Start', event.target.value)} /></label>
            <label><span>Mốc tổng kết giữa kỳ I</span><input type="date" disabled={settingsDraft.academicCalendarMode === 'school-plan'} value={settingsDraft.academicCalendar?.midterm1End || ''} onChange={(event) => updateAcademicCalendar('midterm1End', event.target.value)} /></label>
            <label><span>Kết thúc học kỳ I</span><input type="date" disabled={settingsDraft.academicCalendarMode === 'school-plan'} value={settingsDraft.academicCalendar?.semester1End || ''} onChange={(event) => updateAcademicCalendar('semester1End', event.target.value)} /></label>
            <footer>{durationSummary(settingsDraft.academicCalendar?.semester1Start, settingsDraft.academicCalendar?.semester1End)}</footer>
          </article>
          <article className="semester-two">
            <header><span>03</span><div><small>GIAI ĐOẠN 2</small><h3>Học kỳ II</h3></div></header>
            <label><span>Bắt đầu học kỳ II</span><input type="date" disabled={settingsDraft.academicCalendarMode === 'school-plan'} value={settingsDraft.academicCalendar?.semester2Start || ''} onChange={(event) => updateAcademicCalendar('semester2Start', event.target.value)} /></label>
            <label><span>Mốc tổng kết giữa kỳ II</span><input type="date" disabled={settingsDraft.academicCalendarMode === 'school-plan'} value={settingsDraft.academicCalendar?.midterm2End || ''} onChange={(event) => updateAcademicCalendar('midterm2End', event.target.value)} /></label>
            <label><span>Kết thúc học kỳ II</span><input type="date" disabled={settingsDraft.academicCalendarMode === 'school-plan'} value={settingsDraft.academicCalendar?.semester2End || ''} onChange={(event) => updateAcademicCalendar('semester2End', event.target.value)} /></label>
            <footer>{durationSummary(settingsDraft.academicCalendar?.semester2Start, settingsDraft.academicCalendar?.semester2End)}</footer>
          </article>
        </div>

        {calendarErrors.length ? <div className="hr-calendar-validation invalid"><b>Lịch năm học chưa hợp lệ</b><span>{calendarErrors.join(' ')}</span></div> : <div className="hr-calendar-validation valid"><b>✓ Lịch năm học hợp lệ</b><span>{settingsDraft.academicCalendarMode === 'school-plan' ? 'Các mốc và tuần được khóa theo văn bản kế hoạch của Trường Pétrus Ký.' : 'Hệ thống sẽ dùng các mốc tùy chỉnh này để tính giữa kỳ, cuối kỳ và cả năm.'}</span></div>}

        <div className="hr-conduct-period-settings generated">{Object.entries(settingsDraft.periodRanges || {}).map(([key, period]) => <article key={key}><small>MỐC TÍNH TỰ ĐỘNG</small><b>{period.label}</b><span>{formatDate(period.start)} → {formatDate(period.end)}</span></article>)}</div>

        <details className="hr-school-plan-table" open={settingsDraft.academicCalendarMode === 'school-plan'}>
          <summary><span>📅 Danh mục tuần theo văn bản nhà trường</span><b>53 dòng kế hoạch + 4 tuần hè khối 12 · 47 tuần có thể theo dõi · {isGrade12Workspace(workspace) ? '46' : '42'} tuần tính trung bình</b></summary>
          <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>STT</th><th>Thời gian</th><th>KHGD nhà trường</th><th>KHGD chính khóa</th><th>Tính rèn luyện</th><th>Ghi chú</th></tr></thead><tbody>{PETRUS_KY_ACADEMIC_PLAN_2026_2027.rows.map((row) => <tr key={row.id} className={`plan-${row.kind} ${row.startDate === weekStart ? 'current' : ''}`}><td>{row.row}</td><td><b>{formatDate(row.startDate)}</b><small>đến {formatDate(row.endDate)}</small></td><td><b>{row.schoolPlanLabel}</b></td><td>{row.curriculumPlanLabel || '—'}</td><td>{row.conductEligible ? <span className={`hr-plan-eligible ${row.includeInAverage || (row.kind === 'summer-prep' && isGrade12Workspace(workspace)) ? 'included' : 'orientation'}`}>{row.includeInAverage ? 'Có · tính TB' : row.kind === 'summer-prep' && isGrade12Workspace(workspace) ? 'Có · tính TB lớp 12' : 'Theo dõi riêng'}</span> : <span className="hr-plan-eligible excluded">Không</span>}</td><td><small>{row.notes || '—'}</small></td></tr>)}</tbody></table></div>
        </details>
      </section>

      <section className="hr-panel hr-conduct-custom-catalog">
        <div className="hr-panel-head"><div><small>NỘI QUY BỔ SUNG</small><h2>Thêm vi phạm mới cho các quy định sau này</h2><p>Điểm trừ tối thiểu là 5. Nội dung mới được lưu riêng trong lớp và xuất hiện ngay trong ô chọn vi phạm.</p></div><button type="button" className="primary" onClick={handleAddCustomRule}>Thêm vào danh mục</button></div>
        <div className="hr-form-grid four">
          <label><span>Tên vi phạm mới</span><input value={customDraft.title} onChange={(event) => setCustomDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Nhập nội dung nội quy mới…" /></label>
          <label><span>Nhóm</span><input value={customDraft.category} onChange={(event) => setCustomDraft((current) => ({ ...current, category: event.target.value }))} /></label>
          <label><span>Điểm trừ</span><input type="number" min="5" step="5" value={customDraft.personalDeduction} onChange={(event) => setCustomDraft((current) => ({ ...current, personalDeduction: event.target.value }))} /></label>
          <label><span>Ngày hiệu lực</span><input type="date" value={customDraft.effectiveDate} onChange={(event) => setCustomDraft((current) => ({ ...current, effectiveDate: event.target.value }))} /></label>
        </div>
        <div className="hr-form-grid two"><label><span>Mô tả</span><textarea value={customDraft.description} onChange={(event) => setCustomDraft((current) => ({ ...current, description: event.target.value }))} /></label><label><span>Văn bản / căn cứ mới</span><textarea value={customDraft.reference} onChange={(event) => setCustomDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Ví dụ: Thông báo số…, ngày…" /></label></div>
        {workspace.conductCustomRules?.length ? <div className="hr-conduct-custom-list">{workspace.conductCustomRules.map((rule) => <article key={rule.id} className={rule.active === false ? 'inactive' : ''}><span>{rule.code}</span><div><b>{rule.title}</b><small>{rule.category} · Hiệu lực {formatDate(rule.effectiveDate)} · {rule.reference || 'Chưa có căn cứ'}</small></div><strong>−{rule.personalDeduction}</strong><button type="button" onClick={() => handleToggleCustom(rule)}>{rule.active === false ? 'Kích hoạt' : 'Tạm ẩn'}</button></article>)}</div> : null}
      </section>

      <section className="hr-panel hr-conduct-catalog">
        <div className="hr-panel-head"><div><small>DANH MỤC THAM CHIẾU</small><h2>Thang điểm vi phạm đang áp dụng</h2><p>Điểm thi đua trường được giữ để đối chiếu; cột điểm rèn luyện là mức dùng cho thang 100 điểm cá nhân.</p></div><div className="hr-filter-row"><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Tìm mã hoặc nội dung…" /><select value={catalogCategory} onChange={(event) => setCatalogCategory(event.target.value)}><option value="all">Tất cả nhóm</option>{[...new Set([...CONDUCT_CATEGORIES, ...workspace.conductCustomRules.map((item) => item.category)])].map((category) => <option key={category} value={category}>{category}</option>)}</select></div></div>
        <div className="hr-table-wrap"><table className="hr-table hr-conduct-catalog-table"><thead><tr><th>Mã</th><th>Nhóm</th><th>Nội dung</th><th>Điểm thi đua trường</th><th>Điểm rèn luyện</th><th>Mức độ</th><th>Căn cứ</th></tr></thead><tbody>{catalogRules.map((rule) => <tr key={rule.id}><td><b>{rule.code}</b></td><td>{rule.category}</td><td><b>{rule.title}</b><small>{rule.description}</small></td><td>{rule.schoolPoint === null || rule.schoolPoint === undefined ? '—' : rule.schoolPoint}</td><td><strong className="hr-conduct-minus">−{rule.personalDeduction}</strong></td><td><SeverityBadge severity={rule.severity} /></td><td><small>{rule.reference}</small></td></tr>)}</tbody></table></div>
      </section>

      <section className="hr-panel hr-conduct-document hr-reference-library">
        <div className="hr-panel-head"><div><small>KHO VĂN BẢN THAM CHIẾU</small><h2>Văn bản nội quy và kế hoạch năm học</h2><p>Hai PDF gốc được lưu ngay trong ứng dụng để GVCN mở, tải xuống và đối chiếu khi ghi nhận hoặc tổng kết rèn luyện.</p></div></div>
        <div className="hr-reference-document-grid">
          <article>
            <header><span>01</span><div><small>NỘI QUY & THI ĐUA</small><h3>{CONDUCT_DOCUMENT.title}</h3></div></header>
            <p>{CONDUCT_DOCUMENT.school} · Ban hành ngày {formatDate(CONDUCT_DOCUMENT.issuedDate)} · Áp dụng từ năm học {CONDUCT_DOCUMENT.effectiveSchoolYear}.</p>
            <div className="hr-conduct-document-note"><b>Phạm vi</b><span>Trang 2–8: Nội quy học sinh · Trang 9–13: Bảng lượng hóa điểm thi đua.</span></div>
            <footer><a className="hr-doc-button" href={CONDUCT_DOCUMENT.path} target="_blank" rel="noreferrer">Mở quyết định</a><a className="hr-doc-button secondary" href={CONDUCT_DOCUMENT.path} download>Tải PDF</a><button type="button" className="secondary" onClick={() => setShowDocument((value) => !value)}>{showDocument ? 'Ẩn xem trước' : 'Xem trong app'}</button></footer>
          </article>
          <article className="academic-plan">
            <header><span>02</span><div><small>KHUNG THỜI GIAN 2026-2027</small><h3>{PETRUS_KY_ACADEMIC_PLAN_DOCUMENT.title}</h3></div></header>
            <p>{PETRUS_KY_ACADEMIC_PLAN_DOCUMENT.school} · {PETRUS_KY_ACADEMIC_PLAN_DOCUMENT.pageCount} trang · Nguồn tạo 53 dòng kế hoạch + 4 tuần hè khối 12 và 42 tuần tính kết quả rèn luyện.</p>
            <div className="hr-conduct-document-note"><b>Phạm vi</b><span>Trang 2–4: lịch tuần từ 13/07/2026 đến 17/07/2027, gồm KHGD nhà trường, KHGD chính khóa và ghi chú hoạt động.</span></div>
            <footer><a className="hr-doc-button" href={PETRUS_KY_ACADEMIC_PLAN_DOCUMENT.path} target="_blank" rel="noreferrer">Mở kế hoạch</a><a className="hr-doc-button secondary" href={PETRUS_KY_ACADEMIC_PLAN_DOCUMENT.path} download>Tải PDF</a><button type="button" className="secondary" onClick={() => setShowAcademicPlanDocument((value) => !value)}>{showAcademicPlanDocument ? 'Ẩn xem trước' : 'Xem trong app'}</button></footer>
          </article>
        </div>
        {showDocument ? <iframe className="hr-conduct-pdf-frame" title="Quyết định 95/QĐ-PEK" src={`${CONDUCT_DOCUMENT.path}#view=FitH&toolbar=1`} /> : null}
        {showAcademicPlanDocument ? <iframe className="hr-conduct-pdf-frame" title="Khung kế hoạch thời gian năm học 2026-2027" src={`${PETRUS_KY_ACADEMIC_PLAN_DOCUMENT.path}#view=FitH&toolbar=1`} /> : null}
      </section>
    </div>
  );
}
