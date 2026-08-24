import { isSupabaseConfigured, supabase } from './supabase.js';
import { isDepartmentLeaderRole } from './roles.js';

const TABLE = 'department_monthly_reports';
const CONTEXT_RPC = 'bes_monthly_report_context';
const LOCAL_PREFIX = 'bes-monthly-report-v1';

export const REPORT_STATUS = Object.freeze({ draft: 'Bản nháp', submitted: 'Đã gửi', revision: 'Cần chỉnh sửa', approved: 'Đã duyệt' });
export const currentReportMonth = () => new Date().toISOString().slice(0, 7);
export const normalizeReportMonth = (value) => /^\d{4}-\d{2}$/.test(String(value || '').slice(0, 7)) ? String(value).slice(0, 7) : currentReportMonth();
export const reportMonthDate = (value) => `${normalizeReportMonth(value)}-01`;
export const reportMonthLabel = (value) => { const [y, m] = normalizeReportMonth(value).split('-'); return `Tháng ${Number(m)}/${y}`; };
export const schoolYearForMonth = (value) => { const [y, m] = normalizeReportMonth(value).split('-').map(Number); const start = m >= 8 ? y : y - 1; return `${start}–${start + 1}`; };

const arr = (value) => Array.isArray(value) ? value : [];
const str = (value) => String(value ?? '').trim();
const num = (value) => Math.max(0, Number(value || 0) || 0);
const uid = (prefix = 'item') => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
const localKey = (user, context, month) => `${LOCAL_PREFIX}:${user?.id || 'unknown'}:${context?.departmentHeadId || 'none'}:${context?.departmentId || 'none'}:${normalizeReportMonth(month)}`;

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

const progressRow = (className = '') => ({
  id: uid('progress'), className, status: 'on_track', currentContent: '', plannedPeriods: 0,
  completedPeriods: 0, makeupPeriods: 0, missedPeriods: 0, delayPeriods: 0, delayReason: '', recoveryPlan: '',
});

export function createEmptyMonthlyPayload(context, month) {
  const classes = context?.teachingClasses?.length ? context.teachingClasses : [''];
  return {
    schemaVersion: 1, month: normalizeReportMonth(month), schoolYear: schoolYearForMonth(month),
    teachingProgress: classes.map(progressRow),
    assessments: [], assessmentConfirmed: false, assessmentNoActivity: false,
    professionalActivities: [], professionalActivitiesConfirmed: false, professionalActivitiesNoActivity: false,
    learningResources: [], learningResourcesConfirmed: false, learningResourcesNoActivity: false,
    professionalDevelopment: [], professionalDevelopmentConfirmed: false, professionalDevelopmentNoActivity: false,
    otherTasks: [], otherTasksConfirmed: false, otherTasksNoActivity: false,
    homeroom: { enabled: Boolean(context?.homeroomClass), className: context?.homeroomClass || '', attendance: '', discipline: '', learning: '', parentCoordination: '', notableCases: '' },
    difficulties: { has: false, categories: [], description: '', handled: '', support: '' },
    recommendation: { has: false, category: '', content: '', urgency: 'normal', target: 'TTCM', private: false },
    nextPlans: [], updatedAt: new Date().toISOString(),
  };
}

const normalizeRows = (value, prefix) => arr(value).map((row) => ({ ...row, id: str(row?.id) || uid(prefix) }));
export function normalizeMonthlyPayload(raw, context, month) {
  const base = createEmptyMonthlyPayload(context, month); const value = raw && typeof raw === 'object' ? raw : {};
  const progress = arr(value.teachingProgress).length ? value.teachingProgress : base.teachingProgress;
  return {
    ...base, ...value, month: normalizeReportMonth(month || value.month), schoolYear: str(value.schoolYear) || schoolYearForMonth(month || value.month),
    teachingProgress: progress.map((row) => ({
      ...progressRow(), ...row, id: str(row.id) || uid('progress'), className: str(row.className),
      status: ['on_track', 'delayed', 'ahead', 'not_started'].includes(row.status) ? row.status : 'on_track',
      currentContent: str(row.currentContent), plannedPeriods: num(row.plannedPeriods), completedPeriods: num(row.completedPeriods),
      makeupPeriods: num(row.makeupPeriods), missedPeriods: num(row.missedPeriods), delayPeriods: num(row.delayPeriods),
      delayReason: str(row.delayReason), recoveryPlan: str(row.recoveryPlan),
    })),
    assessments: normalizeRows(value.assessments, 'assessment'), professionalActivities: normalizeRows(value.professionalActivities, 'activity'),
    learningResources: normalizeRows(value.learningResources, 'resource'), professionalDevelopment: normalizeRows(value.professionalDevelopment, 'development'),
    otherTasks: normalizeRows(value.otherTasks, 'task'), nextPlans: normalizeRows(value.nextPlans, 'plan'),
    homeroom: { ...base.homeroom, ...(value.homeroom || {}) },
    difficulties: { ...base.difficulties, ...(value.difficulties || {}), categories: arr(value.difficulties?.categories) },
    recommendation: { ...base.recommendation, ...(value.recommendation || {}) }, updatedAt: str(value.updatedAt) || new Date().toISOString(),
  };
}

export function reportCompletion(payload = {}) {
  const teaching = arr(payload.teachingProgress).filter((row) => row.className || row.currentContent);
  const checks = [
    teaching.length > 0 && teaching.every((row) => row.status === 'not_started' || (row.className && row.currentContent)),
    Boolean(payload.assessmentConfirmed) && (Boolean(payload.assessmentNoActivity) || arr(payload.assessments).length > 0),
    Boolean(payload.professionalActivitiesConfirmed) && (Boolean(payload.professionalActivitiesNoActivity) || arr(payload.professionalActivities).length > 0),
    Boolean(payload.learningResourcesConfirmed) && (Boolean(payload.learningResourcesNoActivity) || arr(payload.learningResources).length > 0),
    Boolean(payload.professionalDevelopmentConfirmed) && (Boolean(payload.professionalDevelopmentNoActivity) || arr(payload.professionalDevelopment).length > 0),
    Boolean(payload.otherTasksConfirmed) && (Boolean(payload.otherTasksNoActivity) || arr(payload.otherTasks).length > 0),
    arr(payload.nextPlans).length > 0,
  ];
  const completed = checks.filter(Boolean).length;
  return { completed, total: checks.length, percent: Math.round(completed / checks.length * 100), ready: completed === checks.length, checks };
}

export function readCachedMonthlyDraft(user, context, month) {
  try { const raw = window.localStorage.getItem(localKey(user, context, month)); return raw ? normalizeMonthlyPayload(JSON.parse(raw), context, month) : null; } catch { return null; }
}
export function cacheMonthlyDraft(user, context, month, payload) {
  const normalized = normalizeMonthlyPayload({ ...payload, updatedAt: new Date().toISOString() }, context, month);
  try { window.localStorage.setItem(localKey(user, context, month), JSON.stringify(normalized)); } catch { /* in-memory draft remains */ }
  return normalized;
}

export async function loadMonthlyReportContexts(user) {
  if (!user?.id || !isSupabaseConfigured) return { contexts: [], cloudReady: false, warning: !user?.id ? 'Bạn cần đăng nhập để gửi báo cáo.' : 'Supabase chưa được cấu hình.' };
  try { const { data, error } = await supabase.rpc(CONTEXT_RPC); if (error) throw error; return { contexts: arr(data).map(normalizeContext), cloudReady: true, warning: '' }; }
  catch (error) { return { contexts: [], cloudReady: false, warning: error?.message || 'Chưa thể xác định tổ chuyên môn của tài khoản này.' }; }
}

function normalizeReportRow(row = {}, context = null) {
  const ctx = context || normalizeContext(row); const month = str(row.report_month).slice(0, 7);
  return {
    id: str(row.id), departmentHeadId: str(row.department_head_id || ctx.departmentHeadId), departmentId: str(row.department_id || ctx.departmentId),
    teacherId: str(row.teacher_id), reportMonth: month, schoolYear: str(row.school_year), status: str(row.status) || 'draft',
    payload: normalizeMonthlyPayload(row.payload, ctx, month), reviewerComment: str(row.reviewer_comment), submittedAt: row.submitted_at || null,
    reviewedAt: row.reviewed_at || null, createdAt: row.created_at || null, updatedAt: row.updated_at || null,
  };
}

export async function loadMyMonthlyReport(user, context, month) {
  const cached = readCachedMonthlyDraft(user, context, month);
  if (!isSupabaseConfigured || !user?.id || !context?.departmentHeadId || !context?.departmentId) return { report: null, payload: cached || createEmptyMonthlyPayload(context, month), cloudReady: false };
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('department_head_id', context.departmentHeadId).eq('department_id', context.departmentId).eq('teacher_id', user.id).eq('report_month', reportMonthDate(month)).maybeSingle();
    if (error) throw error; if (!data) return { report: null, payload: cached || createEmptyMonthlyPayload(context, month), cloudReady: true };
    const report = normalizeReportRow(data, context); cacheMonthlyDraft(user, context, month, report.payload); return { report, payload: report.payload, cloudReady: true };
  } catch (error) { return { report: null, payload: cached || createEmptyMonthlyPayload(context, month), cloudReady: false, warning: error?.message || 'Không tải được báo cáo từ Supabase.' }; }
}

export async function saveMyMonthlyReport(user, context, month, payload, { submit = false, currentStatus = 'draft' } = {}) {
  const normalized = cacheMonthlyDraft(user, context, month, payload); const completion = reportCompletion(normalized);
  if (submit && !completion.ready) return { ok: false, source: 'validation', payload: normalized, warning: 'Báo cáo chưa hoàn tất các mục bắt buộc.' };
  if (!isSupabaseConfigured || !user?.id || !context?.departmentHeadId || !context?.departmentId) return { ok: !submit, source: 'local', payload: normalized, warning: submit ? 'Chưa thể gửi TTCM khi Supabase chưa sẵn sàng.' : 'Bản nháp đã lưu trên thiết bị.' };
  try {
    const now = new Date().toISOString(); const status = submit ? 'submitted' : (currentStatus === 'revision' ? 'revision' : 'draft');
    const row = { department_head_id: context.departmentHeadId, department_id: context.departmentId, teacher_id: user.id, report_month: reportMonthDate(month), school_year: normalized.schoolYear, status, payload: normalized, updated_at: now };
    if (submit) row.submitted_at = now;
    const { data, error } = await supabase.from(TABLE).upsert(row, { onConflict: 'department_head_id,department_id,teacher_id,report_month' }).select('*').single();
    if (error) throw error; return { ok: true, source: 'cloud', report: normalizeReportRow(data, context), payload: normalized };
  } catch (error) { return { ok: false, source: 'cloud', payload: normalized, warning: error?.message || 'Không thể lưu báo cáo lên Supabase.' }; }
}

export async function listDepartmentMonthlyReports(user, month, departmentId = '') {
  if (!isDepartmentLeaderRole(user?.role) || !isSupabaseConfigured || !user?.id) return { reports: [], cloudReady: false, warning: 'Chỉ TTCM có thể xem báo cáo của tổ.' };
  try { let query = supabase.from(TABLE).select('*').eq('department_head_id', user.id).eq('report_month', reportMonthDate(month)).order('updated_at', { ascending: false }); if (departmentId) query = query.eq('department_id', departmentId); const { data, error } = await query; if (error) throw error; return { reports: arr(data).map((row) => normalizeReportRow(row)), cloudReady: true, warning: '' }; }
  catch (error) { return { reports: [], cloudReady: false, warning: error?.message || 'Không tải được báo cáo giáo viên.' }; }
}

export async function reviewMonthlyReport(user, reportId, status, comment = '') {
  if (!isDepartmentLeaderRole(user?.role) || !user?.id || !['revision', 'approved'].includes(status)) return { ok: false, warning: 'Thao tác duyệt không hợp lệ.' };
  try { const now = new Date().toISOString(); const { data, error } = await supabase.from(TABLE).update({ status, reviewer_comment: str(comment), reviewed_at: now, updated_at: now }).eq('id', reportId).eq('department_head_id', user.id).select('*').single(); if (error) throw error; return { ok: true, report: normalizeReportRow(data) }; }
  catch (error) { return { ok: false, warning: error?.message || 'Không thể cập nhật trạng thái báo cáo.' }; }
}

export const makeRow = (kind, overrides = {}) => ({ id: uid(kind), ...overrides });
export function aggregateMonthlyReports(reports = []) {
  const values = arr(reports); const payloads = values.map((row) => row.payload || {}); const progress = payloads.flatMap((p) => arr(p.teachingProgress)).filter((r) => r.status !== 'not_started'); const activities = payloads.flatMap((p) => arr(p.professionalActivities));
  const onTrack = progress.filter((r) => ['on_track', 'ahead'].includes(r.status)).length;
  return { reports: values.length, submitted: values.filter((r) => r.status === 'submitted').length, revision: values.filter((r) => r.status === 'revision').length, approved: values.filter((r) => r.status === 'approved').length, teachingClasses: progress.length, onTrackClasses: onTrack, onTrackPercent: progress.length ? Math.round(onTrack / progress.length * 100) : 0, assessments: payloads.reduce((n, p) => n + arr(p.assessments).length, 0), professionalActivities: activities.length, observations: activities.filter((r) => ['Dự giờ', 'Được dự giờ'].includes(r.type)).length, demonstrations: activities.filter((r) => ['Thao giảng', 'Tiết dạy minh họa'].includes(r.type)).length, seminars: activities.filter((r) => ['Sinh hoạt chuyên đề', 'Báo cáo chuyên đề', 'Hội thảo'].includes(r.type)).length, resources: payloads.reduce((n, p) => n + arr(p.learningResources).reduce((s, r) => s + Math.max(1, Number(r.quantity || 1)), 0), 0), development: payloads.reduce((n, p) => n + arr(p.professionalDevelopment).length, 0), otherTasks: payloads.reduce((n, p) => n + arr(p.otherTasks).length, 0), recommendations: payloads.filter((p) => p.recommendation?.has && p.recommendation?.content).length };
}

const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const unique = (values) => [...new Set(values.map(str).filter(Boolean))];
export function buildDepartmentMonthlyReportHtml({ department, members = [], reports = [], month }) {
  const stats = aggregateMonthlyReports(reports); const payloads = reports.map((r) => r.payload || {}); const core = members.filter((m) => String(m.employmentType || 'core') !== 'visiting').length; const visiting = members.length - core;
  const plans = unique(payloads.flatMap((p) => arr(p.nextPlans).map((r) => r.task || r.goal))); const difficulties = unique(payloads.filter((p) => p.difficulties?.has).map((p) => p.difficulties?.description)); const recommendations = payloads.map((p) => p.recommendation).filter((r) => r?.has && r?.content && !r?.private).map((r) => r.content);
  const count = `${reports.length}/${members.length || reports.length} giáo viên đã có báo cáo`;
  const situation = [`${count}; ${stats.onTrackPercent}% lớp được báo cáo đúng hoặc nhanh tiến độ.`, `Trong tháng ghi nhận ${stats.assessments} hoạt động kiểm tra – đánh giá, ${stats.professionalActivities} hoạt động chuyên môn, ${stats.resources} sản phẩm/lượt học liệu và ${stats.development} hoạt động bồi dưỡng.`, stats.otherTasks ? `Giáo viên báo cáo ${stats.otherTasks} nhiệm vụ hỗ trợ học sinh, chủ nhiệm hoặc công việc khác.` : '', difficulties.length ? `Khó khăn nổi bật: ${difficulties.join('; ')}.` : 'Không có khó khăn nổi bật được tổng hợp từ các báo cáo đã gửi.'].filter(Boolean);
  const planItems = plans.length ? plans : ['Tiếp tục thực hiện chương trình, kiểm tra – đánh giá và các nhiệm vụ chuyên môn theo kế hoạch của nhà trường.']; const recItems = recommendations.length ? recommendations : ['Không có.'];
  return `<!doctype html><html><head><meta charset="utf-8"><title>Báo cáo chuyên môn ${escapeHtml(reportMonthLabel(month))}</title><style>body{font-family:"Times New Roman",serif;font-size:14pt;line-height:1.5;max-width:900px;margin:40px auto;color:#111}h1,h2{text-align:center}h1{font-size:18pt}h2{font-size:16pt}.meta{text-align:center;margin-bottom:28px}h3{font-size:15pt;margin-top:22px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #333;padding:7px}ul{margin-top:6px}</style></head><body><div class="meta"><b>TRƯỜNG TRUNG TIỂU HỌC PÉTRUS KÝ</b></div><h1>BÁO CÁO</h1><h2>CÔNG TÁC THỰC HIỆN NHIỆM VỤ CHUYÊN MÔN ${escapeHtml(reportMonthLabel(month).toUpperCase())}</h2><div class="meta">TỔ CHUYÊN MÔN: ${escapeHtml((department?.name || 'Tổ chuyên môn').replace(/^Tổ\s+/i, '').toUpperCase())}</div><h3>I. Công tác tổ chức</h3><p><b>1. Nhân sự:</b> ${members.length} giáo viên; cơ hữu ${core}; thỉnh giảng ${visiting}.</p><p><b>2. Tình hình báo cáo:</b> ${escapeHtml(count)}; ${stats.approved} báo cáo đã duyệt, ${stats.submitted} báo cáo chờ duyệt, ${stats.revision} báo cáo cần chỉnh sửa.</p><p><b>3. Số liệu chuyên môn:</b></p><table><tbody><tr><th>Nội dung</th><th>Số lượng</th></tr><tr><td>Dự giờ</td><td>${stats.observations}</td></tr><tr><td>Thao giảng / tiết dạy minh họa</td><td>${stats.demonstrations}</td></tr><tr><td>Sinh hoạt / báo cáo chuyên đề / hội thảo</td><td>${stats.seminars}</td></tr><tr><td>Kiểm tra – đánh giá</td><td>${stats.assessments}</td></tr><tr><td>Học liệu / sản phẩm chuyên môn</td><td>${stats.resources}</td></tr><tr><td>Bồi dưỡng chuyên môn</td><td>${stats.development}</td></tr></tbody></table><h3>II. Tình hình thực hiện chuyên môn trong tháng</h3><ul>${situation.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul><h3>III. Kế hoạch thực hiện trong thời gian tới</h3><ul>${planItems.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul><h3>IV. Một số ý kiến, kiến nghị (nếu có)</h3><ul>${recItems.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul><p style="text-align:right;margin-top:36px"><b>TỔ TRƯỞNG CHUYÊN MÔN</b></p></body></html>`;
}
