import { isSupabaseConfigured, supabase } from './supabase.js';

const ready = () => Boolean(isSupabaseConfigured && supabase);
const fail = (error, message = 'Không thể đồng bộ dữ liệu Assessment 4.0.') =>
  ({ ok: false, message: error?.message || message });
const cleanedIds = values => Array.from(new Set((values || []).filter(value => /^[\da-f-]{36}$/i.test(String(value))))).slice(0, 200);
const defaultState = { favorites: [], recentIds: [], collections: [], runner: {} };

export function normalizeWorkspaceState(row) {
  if (!row) return { ...defaultState };
  return {
    favorites: cleanedIds(row.favorites),
    recentIds: cleanedIds(row.recent_ids).slice(0, 30),
    collections: Array.isArray(row.collections) ? row.collections : [],
    runner: row.runner && typeof row.runner === 'object' && !Array.isArray(row.runner) ? row.runner : {},
  };
}
export async function loadAssessmentWorkspace(userId) {
  if (!ready() || !userId) return fail(null, 'Bạn cần đăng nhập để đồng bộ.');
  const { data, error } = await supabase.from('lesson_check_workspace_state')
    .select('favorites,recent_ids,collections,runner').eq('user_id', userId).maybeSingle();
  return error ? fail(error) : { ok: true, state: normalizeWorkspaceState(data) };
}
export async function storeAssessmentWorkspace(userId, state) {
  if (!ready() || !userId) return fail(null, 'Bạn cần đăng nhập.');
  const normalized = normalizeWorkspaceState({
    collections: state.collections, runner: state.runner,
  });
  const { error } = await supabase.from('lesson_check_workspace_state').upsert({
    // Never overwrite favorites (atomic favorite RPC) or recent_ids
    // (atomic recent activity RPC) with a stale Workspace autosave.
    user_id: userId,
    collections: normalized.collections, runner: normalized.runner, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  return error ? fail(error) : { ok: true };
}

export async function setAssessmentFavorite(activityId, favorite) {
  if (!ready()) return fail(null, 'Cần đăng nhập để lưu trò chơi yêu thích.');
  const { data, error } = await supabase.rpc('lesson_check_set_favorite', {
    p_activity: activityId,
    p_favorite: Boolean(favorite),
  });
  return error ? fail(error, 'Không thể lưu thay đổi yêu thích.') :
    { ok: true, favorites: Array.isArray(data) ? data : [] };
}

export async function listActivityJournal({ leader = false, userId, limit = 250 } = {}) {
  if (!ready()) return fail(null);
  let query = supabase.from('lesson_check_activity_journal').select('*')
    .order('created_at', { ascending: false }).limit(Math.min(500, limit));
  if (!leader && userId) query = query.eq('teacher_id', userId);
  const { data, error } = await query;
  return error ? fail(error) : { ok: true, items: data || [] };
}
export async function logActivityUse(userId, activity, { className = '', eventType = 'opened', duration = null, notes = '' } = {}) {
  if (!ready() || !userId || !activity?.id) return fail(null);
  const { error } = await supabase.from('lesson_check_activity_journal').insert({
    teacher_id: userId, activity_id: activity.id, activity_title: activity.title,
    class_name: String(className).trim().slice(0, 120), event_type: eventType,
    duration_minutes: Number.isFinite(Number(duration)) ? Math.max(0, Math.min(240, Number(duration))) : null,
    notes: String(notes).slice(0, 1000),
  });
  return error ? fail(error) : { ok: true };
}

export async function listInterventions({ leader = false, userId } = {}) {
  if (!ready()) return fail(null);
  let query = supabase.from('lesson_check_interventions').select('*')
    .order('created_at', { ascending: false }).limit(500);
  if (!leader && userId) query = query.eq('teacher_id', userId);
  const { data, error } = await query;
  return error ? fail(error) : { ok: true, items: data || [] };
}
export async function saveIntervention(userId, item) {
  if (!ready() || !userId) return fail(null);
  const row = {
    teacher_id: userId,
    class_name: String(item.className || '').slice(0, 120),
    student_ref: String(item.studentRef || '').trim().slice(0, 150),
    student_name: String(item.studentName || '').trim().slice(0, 150),
    focus_area: String(item.focusArea || '').slice(0, 80),
    action_plan: String(item.actionPlan || '').slice(0, 2000),
    baseline_grade: item.baselineGrade === '' ? null : item.baselineGrade,
    followup_grade: item.followupGrade === '' ? null : item.followupGrade,
    due_on: item.dueOn || null, status: item.status || 'planned',
    updated_at: new Date().toISOString(),
  };
  if (!row.student_ref || !row.student_name || !row.action_plan) return fail(null, 'Nhập đầy đủ mã, tên học sinh và biện pháp.');
  if (item.id) row.id = item.id;
  const { data, error } = await supabase.from('lesson_check_interventions')
    .upsert(row, { onConflict: 'id' }).select().single();
  return error ? fail(error) : { ok: true, item: data };
}

export async function listGrantAudit() {
  if (!ready()) return fail(null);
  const { data, error } = await supabase.from('lesson_check_grant_audit')
    .select('*').order('recorded_at', { ascending: false }).limit(250);
  return error ? fail(error) : { ok: true, items: data || [] };
}
export async function bulkGrantActivities(activities, teacherIds, allow, expiresAt = null) {
  if (!ready()) return fail(null);
  const { data, error } = await supabase.rpc('lesson_check_bulk_teacher_access', {
    p_activities: cleanedIds(activities).slice(0, 50),
    p_teachers: cleanedIds(teacherIds).slice(0, 100),
    p_allowed: Boolean(allow), p_expires_at: allow && expiresAt ? expiresAt : null,
  });
  return error ? fail(error) : { ok: true, count: Number(data || 0) };
}

export async function listActivityVersions(activityId) {
  if (!ready()) return fail(null);
  const { data, error } = await supabase.from('lesson_check_activity_versions')
    .select('id,activity_id,metadata,created_at,edited_by')
    .eq('activity_id', activityId).order('id', { ascending: false }).limit(30);
  return error ? fail(error) : { ok: true, items: data || [] };
}
export async function readActivityVersion(versionId) {
  if (!ready()) return fail(null);
  const { data, error } = await supabase.from('lesson_check_activity_versions')
    .select('*').eq('id', versionId).single();
  return error ? fail(error) : { ok: true, item: data };
}

export async function loadSessionRecovery(userId) {
  if (!ready() || !userId) return fail(null);
  const { data, error } = await supabase.from('lesson_check_session_recovery')
    .select('snapshot,updated_at').eq('teacher_id', userId).maybeSingle();
  return error ? fail(error) : { ok: true, snapshot: data?.snapshot || null, updatedAt: data?.updated_at || '' };
}
export async function saveSessionRecovery(userId, snapshot) {
  if (!ready() || !userId) return fail(null);
  const { error } = await supabase.from('lesson_check_session_recovery').upsert({
    teacher_id: userId, snapshot: snapshot || {}, updated_at: new Date().toISOString(),
  }, { onConflict: 'teacher_id' });
  return error ? fail(error) : { ok: true };
}
export async function clearSessionRecovery(userId) {
  if (!ready() || !userId) return fail(null);
  const { error } = await supabase.from('lesson_check_session_recovery').delete().eq('teacher_id', userId);
  return error ? fail(error) : { ok: true };
}

export function assessActivityQuality(items) {
  const titles = new Map();
  for (const activity of items || []) {
    const name = String(activity.title || '').trim().toLocaleLowerCase('vi');
    if (name) titles.set(name, (titles.get(name) || 0) + 1);
  }
  return (items || []).map(activity => {
    const flags = [];
    if (!activity.thumbnailUrl) flags.push('Thiếu thumbnail');
    if (!activity.focusArea || activity.focusArea === 'unclassified') flags.push('Chưa phân loại');
    if (!activity.sourceHost) flags.push('Chưa xác định nguồn');
    if ((titles.get(String(activity.title || '').trim().toLocaleLowerCase('vi')) || 0) > 1) flags.push('Trùng tiêu đề');
    return { ...activity, flags };
  }).filter(activity => activity.flags.length);
}
