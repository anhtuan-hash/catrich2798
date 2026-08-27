import { isSupabaseConfigured, supabase } from './supabase.js';
import { makeGradebookRosterIdentity, mergeSharedRosterIntoWorkspace } from './gradebookRosterStore.js';

const HISTORY_TABLE = 'bes_class_roster_history';

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function isMissingHistory(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01'
    || code === 'PGRST205'
    || code === 'PGRST202'
    || code === '42883'
    || (message.includes('bes_class_roster_history') && (
      message.includes('does not exist')
      || message.includes('schema cache')
      || message.includes('could not find')
    ))
    || (message.includes('bes_restore_class_roster') && message.includes('could not find'));
}

function normalizeHistoryRow(row = {}) {
  const students = Array.isArray(row.students) ? row.students : [];
  return {
    id: Number(row.id) || 0,
    rosterKey: text(row.roster_key),
    action: text(row.action, 'update'),
    className: text(row.class_name),
    schoolYear: text(row.school_year),
    grade: text(row.grade),
    students,
    studentCount: students.filter((student) => student?.active !== false).length,
    changedBy: text(row.changed_by),
    changedByLabel: text(row.changed_by_label, text(row.changed_by, 'Không xác định')),
    changedAt: row.changed_at || '',
    sourceUpdatedAt: row.source_updated_at || '',
  };
}

export async function listSharedRosterHistory(user, workspace, { limit = 30 } = {}) {
  if (!workspace) return { ok: true, items: [], source: 'no-workspace' };
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, items: [], source: 'no-cloud' };
  }

  const identity = makeGradebookRosterIdentity(user, workspace);
  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .select('id,roster_key,class_name,school_year,grade,action,students,source_updated_at,changed_by,changed_by_label,changed_at')
    .eq('roster_key', identity.rosterKey)
    .order('changed_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(Math.max(1, Math.min(100, Number(limit) || 30)));

  if (error) {
    const missing = isMissingHistory(error);
    return {
      ok: false,
      items: [],
      source: missing ? 'history-pending' : 'history-error',
      message: error.message || 'Không thể tải lịch sử danh sách lớp.',
      missingTable: missing,
      optional: true,
    };
  }

  return {
    ok: true,
    items: (data || []).map(normalizeHistoryRow),
    source: 'history-cloud',
  };
}

export async function restoreSharedRosterHistory(user, workspace, historyId) {
  if (!workspace || !historyId) {
    return { ok: false, message: 'Thiếu lớp hoặc phiên bản cần khôi phục.' };
  }
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: false, offline: true, message: 'Khôi phục lịch sử cần kết nối cloud.' };
  }

  const identity = makeGradebookRosterIdentity(user, workspace);
  const { data, error } = await supabase.rpc('bes_restore_class_roster', {
    p_roster_key: identity.rosterKey,
    p_history_id: Number(historyId),
  });

  if (error) {
    const missing = isMissingHistory(error);
    return {
      ok: false,
      source: missing ? 'history-pending' : 'history-error',
      message: error.message || 'Không thể khôi phục danh sách lớp.',
      missingTable: missing,
      optional: true,
    };
  }

  const students = Array.isArray(data?.students) ? data.students : [];
  return {
    ok: true,
    source: 'history-restored',
    restoredFromHistoryId: Number(data?.restored_from_history_id || historyId),
    updatedAt: data?.updated_at || '',
    updatedBy: data?.updated_by || '',
    workspace: mergeSharedRosterIntoWorkspace(workspace, students),
    students,
  };
}
