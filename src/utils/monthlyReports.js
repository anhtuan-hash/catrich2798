import { isSupabaseConfigured, supabase } from './supabase.js';
import { isDepartmentLeaderRole } from './roles.js';

const TABLE = 'department_monthly_reports';
const CONTEXT_RPC = 'bes_monthly_report_context';
const LOCAL_PREFIX = 'bes-monthly-report-v2';

export const REPORT_STATUS = Object.freeze({
  draft: 'Bản nháp',
  submitted: 'Đã gửi',
  revision: 'Cần chỉnh sửa',
  approved: 'Đã duyệt',
});

export const PROFESSIONAL_STAT_DEFINITIONS = Object.freeze([
  { key: 'observations', label: 'Dự giờ' },
  { key: 'demonstrations', label: 'Thao giảng' },
  { key: 'itApplications', label: 'UDCNTT' },
  { key: 'seminars', label: 'SH chuyên đề' },
  { key: 'projects', label: 'Dự án' },
  { key: 'teachingAidsMade', label: 'Làm ĐDDH' },
  { key: 'teachingAidsUsed', label: 'SD ĐDDH' },
  { key: 'initiatives', label: 'SKKN' },
  { key: 'records', label: 'HSSS' },
  { key: 'experiments', label: 'TNTH' },
  { key: 'interactiveBoard', label: 'SD bảng TTTM' },
  { key: 'digitalRepository', label: 'Lượt khai thác các kho học liệu số' },
]);

export const currentReportMonth = () => new Date().toISOString().slice(0, 7);
export const normalizeReportMonth = (value) => /^\d{4}-\d{2}$/.test(String(value || '').slice(0, 7))
  ? String(value).slice(0, 7)
  : currentReportMonth();
export const reportMonthDate = (value) => `${normalizeReportMonth(value)}-01`;
export const reportMonthLabel = (value) => {
  const [year, month] = normalizeReportMonth(value).split('-');
  return `Tháng ${Number(month)}/${year}`;
};
export const schoolYearForMonth = (value) => {
  const [year, month] = normalizeReportMonth(value).split('-').map(Number);
  const start = month >= 8 ? year : year - 1;
  return `${start}–${start + 1}`;
};

const arr = (value) => Array.isArray(value) ? value : [];
const str = (value) => String(value ?? '').trim();
const num = (value) => Math.max(0, Number(value || 0) || 0);
const localKey = (user, context, month) => `${LOCAL_PREFIX}:${user?.id || 'unknown'}:${context?.departmentHeadId || 'none'}:${context?.departmentId || 'none'}:${normalizeReportMonth(month)}`;

function emptyStats() {
  return Object.fromEntries(PROFESSIONAL_STAT_DEFINITIONS.map(({ key }) => [key, 0]));
}

function normalizeStats(value = {}) {
  const next = emptyStats();
  for (const { key } of PROFESSIONAL_STAT_DEFINITIONS) next[key] = num(value?.[key]);
  return next;
}

function normalizeContext(row = {}) {
  const member = row.member && typeof row.member === 'object' ? row.member : {};
  return {
    departmentHeadId: str(row.department_head_id || row.departmentHeadId),
    departmentId: str(row.department_id || row.departmentId),
    departmentName: str(row.department_name || row.departmentName) || 'Tổ chuyên môn',
    departmentShortName: str(row.department_short_name || row.departmentShortName) || 'Tổ',
    teacherId: str(row.teacher_account_id || row.teacherId || member.teacherAccountId),
    member,
    teachingClasses: arr(member.teachingClasses).map(String),
    homeroomClass: str(member.homeroomClass),
    employmentType: str(member.employmentType) || 'core',
    role: str(member.role) || 'teacher',
  };
}

function legacyProfessionalNarrative(value = {}) {
  return arr(value.professionalDevelopment)
    .map((row) => [row.title, row.type, row.organizer].map(str).filter(Boolean).join(' – '))
    .filter(Boolean)
    .join('; ');
}

function legacyMonthlyNarrative(value = {}) {
  const progress = arr(value.teachingProgress)
    .filter((row) => row?.className || row?.currentContent)
    .map((row) => {
      const status = row.status === 'delayed' ? 'chậm tiến độ' : row.status === 'ahead' ? 'nhanh hơn kế hoạch' : row.status === 'not_started' ? 'chưa phát sinh' : 'đúng tiến độ';
      return `${str(row.className) || 'Lớp'}: ${str(row.currentContent) || 'chưa ghi nội dung'} (${status})`;
    });
  const assessments = arr(value.assessments).map((row) => [row.type, row.className, row.content].map(str).filter(Boolean).join(' – '));
  const activities = arr(value.professionalActivities).map((row) => [row.type, row.title, row.result].map(str).filter(Boolean).join(' – '));
  const tasks = arr(value.otherTasks).map((row) => [row.type, row.target, row.result].map(str).filter(Boolean).join(' – '));
  return [...progress, ...assessments, ...activities, ...tasks].filter(Boolean).join('; ');
}

function legacyNextPlanNarrative(value = {}) {
  return arr(value.nextPlans)
    .map((row) => [row.task, row.goal, row.time, row.target].map(str).filter(Boolean).join(' – '))
    .filter(Boolean)
    .join('; ');
}

function legacyStats(value = {}) {
  const stats = emptyStats();
  const activities = arr(value.professionalActivities);
  stats.observations = activities.filter((row) => ['Dự giờ', 'Được dự giờ'].includes(row?.type)).length;
  stats.demonstrations = activities.filter((row) => ['Thao giảng', 'Tiết dạy minh họa'].includes(row?.type)).length;
  stats.seminars = activities.filter((row) => ['Sinh hoạt chuyên đề', 'Báo cáo chuyên đề', 'Hội thảo'].includes(row?.type)).length;
  return stats;
}

export function createEmptyMonthlyPayload(context, month) {
  return {
    schemaVersion: 2,
    month: normalizeReportMonth(month),
    schoolYear: schoolYearForMonth(month),
    organizationNarrative: '',
    professionalDevelopmentNarrative: '',
    professionalStats: emptyStats(),
    professionalStatsConfirmed: false,
    monthlyProfessionalNarrative: '',
    nextPlanNarrative: '',
    recommendationNarrative: '',
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeMonthlyPayload(raw, context, month) {
  const base = createEmptyMonthlyPayload(context, month);
  const value = raw && typeof raw === 'object' ? raw : {};
  const isLegacy = Number(value.schemaVersion || 1) < 2;
  const hasLegacyStructuredData = isLegacy && (
    arr(value.professionalActivities).length
    || arr(value.assessments).length
    || arr(value.learningResources).length
    || arr(value.professionalDevelopment).length
    || arr(value.otherTasks).length
  );

  return {
    ...base,
    schemaVersion: 2,
    month: normalizeReportMonth(month || value.month),
    schoolYear: str(value.schoolYear) || schoolYearForMonth(month || value.month),
    organizationNarrative: str(value.organizationNarrative),
    professionalDevelopmentNarrative: str(value.professionalDevelopmentNarrative) || (isLegacy ? legacyProfessionalNarrative(value) : ''),
    professionalStats: normalizeStats(isLegacy ? legacyStats(value) : value.professionalStats),
    professionalStatsConfirmed: Boolean(value.professionalStatsConfirmed || hasLegacyStructuredData),
    monthlyProfessionalNarrative: str(value.monthlyProfessionalNarrative) || (isLegacy ? legacyMonthlyNarrative(value) : ''),
    nextPlanNarrative: str(value.nextPlanNarrative) || (isLegacy ? legacyNextPlanNarrative(value) : ''),
    recommendationNarrative: str(value.recommendationNarrative) || (isLegacy ? str(value.recommendation?.content) : ''),
    updatedAt: str(value.updatedAt) || new Date().toISOString(),
  };
}

export function reportCompletion(payload = {}) {
  const checks = [
    Boolean(str(payload.organizationNarrative)),
    Boolean(str(payload.professionalDevelopmentNarrative)),
    Boolean(payload.professionalStatsConfirmed),
    Boolean(str(payload.monthlyProfessionalNarrative)),
    Boolean(str(payload.nextPlanNarrative)),
  ];
  const completed = checks.filter(Boolean).length;
  return {
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
    ready: completed === checks.length,
    checks,
  };
}

export function readCachedMonthlyDraft(user, context, month) {
  try {
    const raw = window.localStorage.getItem(localKey(user, context, month));
    return raw ? normalizeMonthlyPayload(JSON.parse(raw), context, month) : null;
  } catch {
    return null;
  }
}

export function cacheMonthlyDraft(user, context, month, payload) {
  const normalized = normalizeMonthlyPayload({ ...payload, updatedAt: new Date().toISOString() }, context, month);
  try {
    window.localStorage.setItem(localKey(user, context, month), JSON.stringify(normalized));
  } catch {
    // The in-memory draft remains available even when storage is unavailable.
  }
  return normalized;
}

export async function loadMonthlyReportContexts(user) {
  if (!user?.id || !isSupabaseConfigured) {
    return {
      contexts: [],
      cloudReady: false,
      warning: !user?.id ? 'Bạn cần đăng nhập để gửi báo cáo.' : 'Supabase chưa được cấu hình.',
    };
  }
  try {
    const { data, error } = await supabase.rpc(CONTEXT_RPC);
    if (error) throw error;
    return { contexts: arr(data).map(normalizeContext), cloudReady: true, warning: '' };
  } catch (error) {
    return {
      contexts: [],
      cloudReady: false,
      warning: error?.message || 'Chưa thể xác định tổ chuyên môn của tài khoản này.',
    };
  }
}

function normalizeReportRow(row = {}, context = null) {
  const ctx = context || normalizeContext(row);
  const month = str(row.report_month).slice(0, 7);
  return {
    id: str(row.id),
    departmentHeadId: str(row.department_head_id || ctx.departmentHeadId),
    departmentId: str(row.department_id || ctx.departmentId),
    teacherId: str(row.teacher_id),
    reportMonth: month,
    schoolYear: str(row.school_year),
    status: str(row.status) || 'draft',
    payload: normalizeMonthlyPayload(row.payload, ctx, month),
    reviewerComment: str(row.reviewer_comment),
    submittedAt: row.submitted_at || null,
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function loadMyMonthlyReport(user, context, month) {
  const cached = readCachedMonthlyDraft(user, context, month);
  if (!isSupabaseConfigured || !user?.id || !context?.departmentHeadId || !context?.departmentId) {
    return { report: null, payload: cached || createEmptyMonthlyPayload(context, month), cloudReady: false };
  }
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('department_head_id', context.departmentHeadId)
      .eq('department_id', context.departmentId)
      .eq('teacher_id', user.id)
      .eq('report_month', reportMonthDate(month))
      .maybeSingle();
    if (error) throw error;
    if (!data) return { report: null, payload: cached || createEmptyMonthlyPayload(context, month), cloudReady: true };
    const report = normalizeReportRow(data, context);
    cacheMonthlyDraft(user, context, month, report.payload);
    return { report, payload: report.payload, cloudReady: true };
  } catch (error) {
    return {
      report: null,
      payload: cached || createEmptyMonthlyPayload(context, month),
      cloudReady: false,
      warning: error?.message || 'Không tải được báo cáo từ Supabase.',
    };
  }
}

export async function saveMyMonthlyReport(user, context, month, payload, { submit = false, currentStatus = 'draft' } = {}) {
  const normalized = cacheMonthlyDraft(user, context, month, payload);
  const completion = reportCompletion(normalized);
  if (submit && !completion.ready) {
    return { ok: false, source: 'validation', payload: normalized, warning: 'Báo cáo chưa hoàn tất các mục bắt buộc.' };
  }
  if (!isSupabaseConfigured || !user?.id || !context?.departmentHeadId || !context?.departmentId) {
    return {
      ok: !submit,
      source: 'local',
      payload: normalized,
      warning: submit ? 'Chưa thể gửi TTCM khi Supabase chưa sẵn sàng.' : 'Bản nháp đã lưu trên thiết bị.',
    };
  }
  try {
    const now = new Date().toISOString();
    const status = submit ? 'submitted' : (currentStatus === 'revision' ? 'revision' : 'draft');
    const row = {
      department_head_id: context.departmentHeadId,
      department_id: context.departmentId,
      teacher_id: user.id,
      report_month: reportMonthDate(month),
      school_year: normalized.schoolYear,
      status,
      payload: normalized,
      updated_at: now,
    };
    if (submit) row.submitted_at = now;
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: 'department_head_id,department_id,teacher_id,report_month' })
      .select('*')
      .single();
    if (error) throw error;
    return { ok: true, source: 'cloud', report: normalizeReportRow(data, context), payload: normalized };
  } catch (error) {
    return { ok: false, source: 'cloud', payload: normalized, warning: error?.message || 'Không thể lưu báo cáo lên Supabase.' };
  }
}

export async function listDepartmentMonthlyReports(user, month, departmentId = '') {
  if (!isDepartmentLeaderRole(user?.role) || !isSupabaseConfigured || !user?.id) {
    return { reports: [], cloudReady: false, warning: 'Chỉ TTCM có thể xem báo cáo của tổ.' };
  }
  try {
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('department_head_id', user.id)
      .eq('report_month', reportMonthDate(month))
      .order('updated_at', { ascending: false });
    if (departmentId) query = query.eq('department_id', departmentId);
    const { data, error } = await query;
    if (error) throw error;
    return { reports: arr(data).map((row) => normalizeReportRow(row)), cloudReady: true, warning: '' };
  } catch (error) {
    return { reports: [], cloudReady: false, warning: error?.message || 'Không tải được báo cáo giáo viên.' };
  }
}

export async function reviewMonthlyReport(user, reportId, status, comment = '') {
  if (!isDepartmentLeaderRole(user?.role) || !user?.id || !['revision', 'approved'].includes(status)) {
    return { ok: false, warning: 'Thao tác duyệt không hợp lệ.' };
  }
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status, reviewer_comment: str(comment), reviewed_at: now, updated_at: now })
      .eq('id', reportId)
      .eq('department_head_id', user.id)
      .select('*')
      .single();
    if (error) throw error;
    return { ok: true, report: normalizeReportRow(data) };
  } catch (error) {
    return { ok: false, warning: error?.message || 'Không thể cập nhật trạng thái báo cáo.' };
  }
}

export function aggregateMonthlyReports(reports = []) {
  const values = arr(reports);
  const stats = emptyStats();
  for (const report of values) {
    const current = normalizeStats(report?.payload?.professionalStats);
    for (const { key } of PROFESSIONAL_STAT_DEFINITIONS) stats[key] += current[key];
  }
  return {
    reports: values.length,
    submitted: values.filter((row) => row.status === 'submitted').length,
    revision: values.filter((row) => row.status === 'revision').length,
    approved: values.filter((row) => row.status === 'approved').length,
    stats,
    recommendations: values.filter((row) => str(row?.payload?.recommendationNarrative)).length,
    organizationNarratives: values.filter((row) => str(row?.payload?.organizationNarrative)).length,
    professionalDevelopmentNarratives: values.filter((row) => str(row?.payload?.professionalDevelopmentNarrative)).length,
  };
}

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');
const unique = (values) => [...new Set(values.map(str).filter(Boolean))];
const listHtml = (items, emptyText = 'Không có.') => items.length
  ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
  : `<p>${escapeHtml(emptyText)}</p>`;

export function buildDepartmentMonthlyReportHtml({ department, members = [], reports = [], month }) {
  const summary = aggregateMonthlyReports(reports);
  const core = members.filter((member) => String(member.employmentType || 'core') !== 'visiting').length;
  const visiting = Math.max(0, members.length - core);
  const organization = unique(reports.map((row) => row?.payload?.organizationNarrative));
  const development = unique(reports.map((row) => row?.payload?.professionalDevelopmentNarrative));
  const monthly = unique(reports.map((row) => row?.payload?.monthlyProfessionalNarrative));
  const plans = unique(reports.map((row) => row?.payload?.nextPlanNarrative));
  const recommendations = unique(reports.map((row) => row?.payload?.recommendationNarrative));
  const reportCount = `${reports.length}/${members.length || reports.length} giáo viên đã gửi hoặc đang trong quy trình duyệt`;
  const rows = PROFESSIONAL_STAT_DEFINITIONS
    .map(({ key, label }) => `<tr><td>${escapeHtml(label)}</td><td>${summary.stats[key] || 0}</td></tr>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Báo cáo chuyên môn ${escapeHtml(reportMonthLabel(month))}</title><style>body{font-family:"Times New Roman",serif;font-size:14pt;line-height:1.5;max-width:900px;margin:40px auto;color:#111}h1,h2{text-align:center}h1{font-size:18pt}h2{font-size:16pt}.meta{text-align:center;margin-bottom:28px}h3{font-size:15pt;margin-top:22px}h4{font-size:14pt;margin:12px 0 6px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #333;padding:7px}th:last-child,td:last-child{width:150px;text-align:center}ul{margin-top:6px}</style></head><body><div class="meta"><b>TRƯỜNG TRUNG TIỂU HỌC PÉTRUS KÝ</b></div><h1>BÁO CÁO</h1><h2>CÔNG TÁC THỰC HIỆN NHIỆM VỤ CHUYÊN MÔN ${escapeHtml(reportMonthLabel(month).toUpperCase())}</h2><div class="meta">TỔ CHUYÊN MÔN: ${escapeHtml((department?.name || 'Tổ chuyên môn').replace(/^Tổ\s+/i, '').toUpperCase())}</div><h3>I. Công tác tổ chức</h3><p><b>1. Nhân sự:</b> ${members.length} giáo viên; cơ hữu ${core}; thỉnh giảng ${visiting}. ${escapeHtml(reportCount)}.</p><h4>2. Thực hiện nội quy, nề nếp giáo viên</h4>${listHtml(organization)}<h4>3. Công tác bồi dưỡng thường xuyên</h4>${listHtml(development)}<h4>4. Số liệu chuyên môn</h4><table><thead><tr><th>Nội dung</th><th>Số lượng</th></tr></thead><tbody>${rows}</tbody></table><h3>II. Tình hình thực hiện chuyên môn trong tháng</h3>${listHtml(monthly)}<h3>III. Kế hoạch thực hiện trong thời gian tới</h3>${listHtml(plans)}<h3>IV. Một số ý kiến, kiến nghị (nếu có)</h3>${listHtml(recommendations)}<p style="text-align:right;margin-top:36px"><b>TỔ TRƯỞNG CHUYÊN MÔN</b></p></body></html>`;
}
