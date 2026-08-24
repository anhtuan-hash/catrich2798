import { isSupabaseConfigured, supabase } from './supabase.js';
import { isDepartmentLeaderRole } from './roles.js';
import { PROFESSIONAL_STAT_DEFINITIONS, currentReportMonth, schoolYearForMonth } from './monthlyReports.js';

const TABLE = 'department_monthly_reports';
const arr = (value) => Array.isArray(value) ? value : [];
const num = (value) => Math.max(0, Number(value || 0) || 0);
const str = (value) => String(value ?? '').trim();

function emptyStats() {
  return Object.fromEntries(PROFESSIONAL_STAT_DEFINITIONS.map(({ key }) => [key, 0]));
}

function normalizeStats(value = {}) {
  const stats = emptyStats();
  for (const { key } of PROFESSIONAL_STAT_DEFINITIONS) stats[key] = num(value?.[key]);
  return stats;
}

export function normalizeSchoolYear(value) {
  const match = String(value || '').match(/(20\d{2})\D+(20\d{2})/);
  if (match) return `${match[1]}–${match[2]}`;
  return schoolYearForMonth(currentReportMonth());
}

export function schoolYearMonthKeys(value) {
  const normalized = normalizeSchoolYear(value);
  const startYear = Number(normalized.slice(0, 4));
  const months = [];
  for (let month = 8; month <= 12; month += 1) months.push(`${startYear}-${String(month).padStart(2, '0')}`);
  for (let month = 1; month <= 7; month += 1) months.push(`${startYear + 1}-${String(month).padStart(2, '0')}`);
  return months;
}

export function schoolYearOptions(count = 4) {
  const current = normalizeSchoolYear(schoolYearForMonth(currentReportMonth()));
  const startYear = Number(current.slice(0, 4));
  return Array.from({ length: count }, (_, index) => {
    const year = startYear - index;
    return `${year}–${year + 1}`;
  });
}

export async function listDepartmentReportHistory(user, departmentId, schoolYear) {
  if (!isDepartmentLeaderRole(user?.role) || !isSupabaseConfigured || !user?.id) {
    return { reports: [], cloudReady: false, warning: 'Chỉ TTCM có thể xem thống kê báo cáo của tổ.' };
  }
  const months = schoolYearMonthKeys(schoolYear);
  const first = `${months[0]}-01`;
  const last = `${months[months.length - 1]}-01`;
  try {
    let query = supabase
      .from(TABLE)
      .select('id,department_head_id,department_id,teacher_id,report_month,school_year,status,payload,submitted_at,reviewed_at,updated_at')
      .eq('department_head_id', user.id)
      .gte('report_month', first)
      .lte('report_month', last)
      .order('report_month', { ascending: true })
      .order('updated_at', { ascending: false });
    if (departmentId) query = query.eq('department_id', departmentId);
    const { data, error } = await query;
    if (error) throw error;
    const reports = arr(data).map((row) => ({
      id: str(row.id),
      teacherId: str(row.teacher_id),
      departmentId: str(row.department_id),
      reportMonth: str(row.report_month).slice(0, 7),
      schoolYear: str(row.school_year),
      status: str(row.status) || 'submitted',
      professionalStats: normalizeStats(row.payload?.professionalStats),
      hasRecommendation: Boolean(str(row.payload?.recommendationNarrative)),
      submittedAt: row.submitted_at || null,
      reviewedAt: row.reviewed_at || null,
      updatedAt: row.updated_at || null,
    }));
    return { reports, cloudReady: true, warning: '' };
  } catch (error) {
    return { reports: [], cloudReady: false, warning: error?.message || 'Không tải được lịch sử báo cáo theo tháng.' };
  }
}

export function summarizeDepartmentReportHistory(reports = [], members = [], schoolYear) {
  const memberIds = new Set(arr(members).map((member) => String(member.teacherAccountId || member.account?.id || '')).filter(Boolean));
  const totalTeachers = memberIds.size || arr(members).length;
  const months = schoolYearMonthKeys(schoolYear).map((month) => {
    const rows = arr(reports).filter((report) => report.reportMonth === month);
    const reporters = new Set(rows.map((report) => report.teacherId).filter(Boolean));
    const stats = emptyStats();
    for (const report of rows) {
      for (const { key } of PROFESSIONAL_STAT_DEFINITIONS) stats[key] += num(report.professionalStats?.[key]);
    }
    const received = reporters.size;
    const approved = rows.filter((report) => report.status === 'approved').length;
    const revision = rows.filter((report) => report.status === 'revision').length;
    const submitted = rows.filter((report) => report.status === 'submitted').length;
    const missing = Math.max(0, totalTeachers - received);
    const recommendations = rows.filter((report) => report.hasRecommendation).length;
    return {
      month,
      reports: rows,
      received,
      approved,
      revision,
      submitted,
      missing,
      recommendations,
      completionRate: totalTeachers ? Math.round((received / totalTeachers) * 100) : 0,
      approvalRate: received ? Math.round((approved / received) * 100) : 0,
      stats,
    };
  });

  const activeMonths = months.filter((month) => month.received > 0);
  const totals = emptyStats();
  for (const month of months) {
    for (const { key } of PROFESSIONAL_STAT_DEFINITIONS) totals[key] += num(month.stats?.[key]);
  }
  const totalReceived = months.reduce((sum, month) => sum + month.received, 0);
  const totalApproved = months.reduce((sum, month) => sum + month.approved, 0);
  const totalRevision = months.reduce((sum, month) => sum + month.revision, 0);
  const totalRecommendations = months.reduce((sum, month) => sum + month.recommendations, 0);
  const averageCompletion = activeMonths.length
    ? Math.round(activeMonths.reduce((sum, month) => sum + month.completionRate, 0) / activeMonths.length)
    : 0;

  return {
    totalTeachers,
    months,
    totals,
    totalReceived,
    totalApproved,
    totalRevision,
    totalRecommendations,
    averageCompletion,
    activeMonths: activeMonths.length,
  };
}
