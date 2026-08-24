import { isSupabaseConfigured, supabase } from './supabase.js';

const RPC = 'bes_my_brian_assignments';
const CACHE_PREFIX = 'bes-my-brian-assignments-v1';

const arr = (value) => Array.isArray(value) ? value : [];
const str = (value) => String(value ?? '').trim();
const uniq = (values) => [...new Set(values.map(str).filter(Boolean))];

function cacheKey(user) {
  return `${CACHE_PREFIX}:${str(user?.id || user?.email || 'anonymous')}`;
}

function normalizeRow(row = {}) {
  const member = row.member && typeof row.member === 'object' ? row.member : {};
  return {
    departmentHeadId: str(row.department_head_id || row.departmentHeadId),
    departmentId: str(row.department_id || row.departmentId),
    departmentName: str(row.department_name || row.departmentName) || 'Tổ chuyên môn',
    departmentShortName: str(row.department_short_name || row.departmentShortName) || 'Tổ',
    teacherId: str(row.teacher_account_id || row.teacherId),
    member,
    teachingGrades: uniq(arr(member.teachingGrades)),
    teachingClasses: uniq(arr(member.teachingClasses)),
    homeroomClass: str(member.homeroomClass),
    weeklyPeriods: Math.max(0, Number(member.weeklyPeriods || 0) || 0),
    assignedTasks: arr(row.assignments || member.assignedTasks),
    documentRequirements: arr(row.document_requirements || member.documentRequirements),
    absences: arr(row.absences),
    evaluations: arr(row.evaluations),
    syncedAt: str(row.synced_at || member.syncedAt),
  };
}

export function readCachedTeacherAssignments(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(cacheKey(user));
    return raw ? arr(JSON.parse(raw)).map(normalizeRow) : [];
  } catch {
    return [];
  }
}

function writeCache(user, rows) {
  const normalized = arr(rows).map(normalizeRow);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(cacheKey(user), JSON.stringify(normalized)); } catch { /* no-op */ }
  }
  return normalized;
}

export async function loadMyTeacherAssignments(user, { preferCache = false } = {}) {
  const cached = readCachedTeacherAssignments(user);
  if (preferCache && cached.length) return { assignments: cached, source: 'cache', cloudReady: isSupabaseConfigured };
  if (!user?.id || !isSupabaseConfigured) {
    return { assignments: cached, source: 'cache', cloudReady: false, warning: !user?.id ? 'Bạn cần đăng nhập để nhận phân công.' : 'Supabase chưa sẵn sàng.' };
  }

  try {
    const { data, error } = await supabase.rpc(RPC);
    if (error) throw error;
    const assignments = writeCache(user, data || []);
    return { assignments, source: 'cloud', cloudReady: true, warning: '' };
  } catch (error) {
    return {
      assignments: cached,
      source: cached.length ? 'cache' : 'cloud',
      cloudReady: false,
      warning: error?.message || 'Chưa thể đồng bộ phân công từ Brian Team.',
    };
  }
}

export function summarizeTeacherAssignments(rows = []) {
  const values = arr(rows).map(normalizeRow);
  return {
    teachingGrades: uniq(values.flatMap((row) => row.teachingGrades)),
    teachingClasses: uniq(values.flatMap((row) => row.teachingClasses)),
    homeroomClasses: uniq(values.map((row) => row.homeroomClass)),
    weeklyPeriods: values.reduce((total, row) => total + row.weeklyPeriods, 0),
    assignedTasks: values.flatMap((row) => row.assignedTasks),
    documentRequirements: values.flatMap((row) => row.documentRequirements),
    departments: values.map((row) => ({ id: row.departmentId, name: row.departmentName, headId: row.departmentHeadId })),
    syncedAt: values.map((row) => row.syncedAt).filter(Boolean).sort().at(-1) || '',
  };
}
