import { isSupabaseConfigured, supabase } from './supabase.js';
import { isDepartmentLeaderRole } from './roles.js';
import { reportMonthDate } from './monthlyReports.js';

const SETTINGS_TABLE = 'department_monthly_report_settings';
const REPORTS_TABLE = 'department_monthly_reports';

const str = (value) => String(value ?? '').trim();

export async function loadMonthlyReportDeadline({ departmentHeadId, departmentId, month }) {
  if (!isSupabaseConfigured || !departmentHeadId || !departmentId || !month) {
    return { deadline: null, cloudReady: false, warning: '' };
  }
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('deadline_at')
      .eq('department_head_id', departmentHeadId)
      .eq('department_id', departmentId)
      .eq('report_month', reportMonthDate(month))
      .maybeSingle();
    if (error) throw error;
    return { deadline: data?.deadline_at || null, cloudReady: true, warning: '' };
  } catch (error) {
    return { deadline: null, cloudReady: false, warning: error?.message || 'Chưa tải được thời hạn báo cáo.' };
  }
}

export async function saveMonthlyReportDeadline(user, departmentId, month, deadlineAt) {
  if (!isDepartmentLeaderRole(user?.role) || !isSupabaseConfigured || !user?.id || !departmentId || !month) {
    return { ok: false, warning: 'Không thể lưu thời hạn báo cáo.' };
  }
  try {
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({
        department_head_id: user.id,
        department_id: departmentId,
        report_month: reportMonthDate(month),
        deadline_at: deadlineAt || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'department_head_id,department_id,report_month' })
      .select('deadline_at')
      .single();
    if (error) throw error;
    return { ok: true, deadline: data?.deadline_at || null, warning: '' };
  } catch (error) {
    return { ok: false, warning: error?.message || 'Không thể lưu thời hạn báo cáo.' };
  }
}

export async function clearMonthlyReportDeadline(user, departmentId, month) {
  if (!isDepartmentLeaderRole(user?.role) || !isSupabaseConfigured || !user?.id || !departmentId || !month) {
    return { ok: false, warning: 'Không thể xóa thời hạn báo cáo.' };
  }
  try {
    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .delete()
      .eq('department_head_id', user.id)
      .eq('department_id', departmentId)
      .eq('report_month', reportMonthDate(month));
    if (error) throw error;
    return { ok: true, deadline: null, warning: '' };
  } catch (error) {
    return { ok: false, warning: error?.message || 'Không thể xóa thời hạn báo cáo.' };
  }
}

export async function deleteDepartmentMonthlyReport(user, reportId) {
  if (!isDepartmentLeaderRole(user?.role) || !isSupabaseConfigured || !user?.id || !str(reportId)) {
    return { ok: false, warning: 'Không thể xóa báo cáo.' };
  }
  try {
    const { error } = await supabase
      .from(REPORTS_TABLE)
      .delete()
      .eq('id', reportId)
      .eq('department_head_id', user.id);
    if (error) throw error;
    return { ok: true, warning: '' };
  } catch (error) {
    return { ok: false, warning: error?.message || 'Không thể xóa báo cáo.' };
  }
}

export function toLocalDateTimeInput(isoValue) {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeInputToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function deadlineState(deadline, now = Date.now()) {
  if (!deadline) return { active: false, expired: false, totalMs: null, label: 'Chưa đặt thời hạn' };
  const target = new Date(deadline).getTime();
  if (!Number.isFinite(target)) return { active: false, expired: false, totalMs: null, label: 'Chưa đặt thời hạn' };
  const diff = target - now;
  if (diff <= 0) return { active: true, expired: true, totalMs: 0, label: 'Đã hết hạn' };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const label = days > 0
    ? `${days} ngày ${hours} giờ ${minutes} phút`
    : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return { active: true, expired: false, totalMs: diff, label };
}
