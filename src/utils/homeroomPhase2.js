import { isSupabaseConfigured, supabase } from './supabase.js';
import { calculateStudentAnalytics, normalizeHomeroomWorkspace } from './homeroomStore.js';

const PORTAL_TABLE = 'bes_homeroom_portals';
const FEEDBACK_TABLE = 'bes_homeroom_feedback_inbox';
const RECEIPT_TABLE = 'bes_homeroom_portal_receipts';
const RESPONSE_TABLE = 'bes_homeroom_portal_responses';
const LOCAL_PORTAL_PREFIX = 'bes-homeroom-portal-v2';
const LOCAL_FEEDBACK_PREFIX = 'bes-homeroom-feedback-v2';
const LOCAL_RECEIPT_PREFIX = 'bes-homeroom-receipt-v2';
const LOCAL_RESPONSE_PREFIX = 'bes-homeroom-response-v3';

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeCode(value) {
  return safeText(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

function uid(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}


async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value || ''));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function attemptKey(code, role, studentCode) {
  return `bes-homeroom-portal-attempt-v3:${normalizeCode(code)}:${role}:${safeText(studentCode)}`;
}

function readAttempt(code, role, studentCode) {
  try { return JSON.parse(localStorage.getItem(attemptKey(code, role, studentCode)) || '{}'); } catch { return {}; }
}

function writeAttempt(code, role, studentCode, value) {
  try { localStorage.setItem(attemptKey(code, role, studentCode), JSON.stringify(value)); } catch { /* ignore */ }
}

export function generatePortalCode(prefix = 'BR') {
  const body = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${body}`.slice(0, 10);
}

function attendanceSummary(workspace, studentId) {
  const rows = Object.values(workspace.attendance || {}).map((dateRows) => dateRows?.[studentId]).filter(Boolean);
  return {
    totalMarked: rows.length,
    present: rows.filter((item) => item.status === 'present').length,
    late: rows.filter((item) => item.status === 'late').length,
    excused: rows.filter((item) => item.status === 'excused').length,
    unexcused: rows.filter((item) => item.status === 'unexcused').length,
    early: rows.filter((item) => item.status === 'early').length,
  };
}

function visibleNotices(workspace, studentId, role, referenceTime = Date.now()) {
  return (workspace.announcements || []).filter((notice) => {
    const status = safeText(notice.status, notice.scheduledAt ? 'scheduled' : 'published').toLowerCase();
    if (['draft', 'cancelled', 'canceled', 'đã hủy'].includes(status)) return false;
    const scheduledAt = notice.scheduledAt ? Date.parse(notice.scheduledAt) : 0;
    if (scheduledAt && Number.isFinite(scheduledAt) && scheduledAt > referenceTime) return false;
    if (notice.audience === 'all') return true;
    if (role === 'parent' && notice.audience === 'parents') return true;
    if (role === 'student' && notice.audience === 'students') return true;
    if (notice.audience === 'selected') return (notice.targetStudentIds || []).includes(studentId);
    return false;
  });
}

function makeStudentView(workspace, student, role) {
  const config = workspace.portalConfig || {};
  const analytics = calculateStudentAnalytics(workspace, student.id);
  return {
    classProfile: {
      className: workspace.classProfile?.className || '',
      schoolYear: workspace.classProfile?.schoolYear || '',
      grade: workspace.classProfile?.grade || '',
      adviserName: workspace.classProfile?.adviserName || '',
      room: workspace.classProfile?.room || '',
    },
    student: {
      id: student.id,
      code: student.code,
      fullName: student.fullName,
      birthDate: student.birthDate,
      gender: student.gender,
      teamId: student.teamId || '',
      supportLevel: role === 'parent' ? student.supportLevel : undefined,
      parentName: role === 'parent' ? student.parentName : undefined,
    },
    attendance: config.exposeAttendance ? attendanceSummary(workspace, student.id) : null,
    learningRecords: config.exposeLearning ? (workspace.learningRecords || []).filter((item) => item.studentId === student.id).slice(0, 50) : [],
    subjectFeedback: config.exposeFeedback ? (workspace.subjectFeedback || []).filter((item) => item.studentId === student.id).slice(0, 30) : [],
    analytics: config.exposeLearning ? analytics : null,
    schedule: config.exposeSchedule ? (workspace.schedule || []).filter((item) => !item.date || item.date >= new Date().toISOString().slice(0, 10)).slice(0, 30) : [],
    announcements: visibleNotices(workspace, student.id, role),
    teams: workspace.teams || [],
    leaderboard: buildLeaderboard(workspace),
  };
}

export function buildLeaderboard(workspace) {
  const normalized = normalizeHomeroomWorkspace(workspace);
  const scores = Object.fromEntries((normalized.teams || []).map((team) => [team.id, 0]));
  (normalized.competitionEvents || []).forEach((event) => {
    scores[event.teamId] = (scores[event.teamId] || 0) + Number(event.points || 0);
  });
  return (normalized.teams || []).map((team) => ({
    ...team,
    score: scores[team.id] || 0,
    members: normalized.students.filter((student) => student.teamId === team.id && student.active !== false).length,
  })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export async function buildPortalPayload(workspace) {
  const normalized = normalizeHomeroomWorkspace(workspace);
  const pinHashes = {};
  const parentViews = {};
  const studentViews = {};
  for (const student of normalized.students.filter((item) => item.active !== false)) {
    const code = safeText(student.code, student.id);
    pinHashes[code] = await sha256Hex(safeText(student.portalPin));
    parentViews[code] = makeStudentView(normalized, student, 'parent');
    studentViews[code] = makeStudentView(normalized, student, 'student');
  }
  return {
    schemaVersion: 3,
    meta: {
      className: normalized.classProfile.className,
      schoolYear: normalized.classProfile.schoolYear,
      adviserName: normalized.classProfile.adviserName,
      publishedAt: new Date().toISOString(),
      sessionMinutes: Number(normalized.portalConfig?.sessionMinutes || 30),
      maxFailedAttempts: Number(normalized.portalConfig?.maxFailedAttempts || 5),
      lockMinutes: Number(normalized.portalConfig?.lockMinutes || 15),
    },
    pinHashes,
    parentViews,
    studentViews,
    subjectView: {
      classProfile: normalized.classProfile,
      students: normalized.students.filter((student) => student.active !== false).map((student) => ({
        id: student.id,
        code: student.code,
        fullName: student.fullName,
      })),
      periods: [...new Set((normalized.learningRecords || []).map((item) => item.period).filter(Boolean))],
    },
  };
}

function localPortalKey(code) {
  return `${LOCAL_PORTAL_PREFIX}:${normalizeCode(code)}`;
}

function saveLocalPortal(record) {
  [record.parentCode, record.studentCode, record.subjectCode].filter(Boolean).forEach((code) => {
    try { localStorage.setItem(localPortalKey(code), JSON.stringify(record)); } catch { /* ignore */ }
  });
}

export async function publishHomeroomPortal(workspace, user) {
  const normalized = normalizeHomeroomWorkspace(workspace, user);
  const config = normalized.portalConfig || {};
  const record = {
    id: uid('portal'),
    ownerId: user?.id || '',
    ownerEmail: user?.email || '',
    workspaceId: normalized.id,
    parentCode: normalizeCode(config.parentCode),
    studentCode: normalizeCode(config.studentCode),
    subjectCode: normalizeCode(config.subjectCode),
    payload: await buildPortalPayload(normalized),
    updatedAt: new Date().toISOString(),
  };
  saveLocalPortal(record);
  if (!isSupabaseConfigured || !supabase || !user?.id) return { ok: true, offline: true, record };
  const { data, error } = await supabase.from(PORTAL_TABLE).upsert({
    owner_id: user.id,
    owner_email: user.email || '',
    workspace_id: normalized.id,
    parent_code: record.parentCode,
    student_code: record.studentCode,
    subject_code: record.subjectCode,
    payload: record.payload,
    updated_at: record.updatedAt,
  }, { onConflict: 'owner_id,workspace_id' }).select('*').maybeSingle();
  if (error) return { ok: false, offline: true, message: error.message, record };
  return { ok: true, record: data, source: 'cloud' };
}

async function resolveLocalPortal(code, role, studentCode, pin) {
  try {
    const raw = localStorage.getItem(localPortalKey(code));
    if (!raw) return null;
    const record = JSON.parse(raw);
    const payload = record.payload || {};
    if (role === 'subject' && normalizeCode(code) === normalizeCode(record.subjectCode)) {
      return { ok: true, role, ownerId: record.ownerId, workspaceId: record.workspaceId, view: payload.subjectView, sessionExpiresAt: new Date(Date.now() + Number(payload.meta?.sessionMinutes || 30) * 60000).toISOString() };
    }
    const ref = safeText(studentCode);
    const attempt = readAttempt(code, role, ref);
    if (Number(attempt.lockedUntil || 0) > Date.now()) {
      return { ok: false, locked: true, message: `Cổng đang khóa tạm thời. Thử lại sau ${Math.ceil((attempt.lockedUntil - Date.now()) / 60000)} phút.` };
    }
    const actualHash = await sha256Hex(safeText(pin));
    const expectedHash = payload.pinHashes?.[ref] || '';
    if (!expectedHash || actualHash !== expectedHash) {
      const max = Number(payload.meta?.maxFailedAttempts || 5);
      const count = Number(attempt.count || 0) + 1;
      const lockedUntil = count >= max ? Date.now() + Number(payload.meta?.lockMinutes || 15) * 60000 : 0;
      writeAttempt(code, role, ref, { count: lockedUntil ? 0 : count, lockedUntil, updatedAt: Date.now() });
      return { ok: false, locked: Boolean(lockedUntil), message: lockedUntil ? 'Nhập sai quá số lần cho phép. Cổng đã khóa tạm thời.' : `Mã học sinh hoặc PIN không đúng. Còn ${Math.max(0, max - count)} lần thử.` };
    }
    writeAttempt(code, role, ref, { count: 0, lockedUntil: 0, updatedAt: Date.now() });
    const expectedCode = role === 'parent' ? record.parentCode : record.studentCode;
    if (normalizeCode(code) !== normalizeCode(expectedCode)) return { ok: false, message: 'Mã truy cập không đúng.' };
    return { ok: true, role, ownerId: record.ownerId, workspaceId: record.workspaceId, studentRef: ref, view: role === 'parent' ? payload.parentViews?.[ref] : payload.studentViews?.[ref], sessionExpiresAt: new Date(Date.now() + Number(payload.meta?.sessionMinutes || 30) * 60000).toISOString() };
  } catch {
    return null;
  }
}

export async function accessHomeroomPortal({ code, role, studentCode = '', pin = '' }) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return { ok: false, message: 'Vui lòng nhập mã truy cập.' };
  if (!isSupabaseConfigured || !supabase) return (await resolveLocalPortal(normalizedCode, role, studentCode, pin)) || { ok: false, message: 'Không tìm thấy cổng trên thiết bị này.' };
  const { data, error } = await supabase.rpc('get_homeroom_portal', {
    p_code: normalizedCode,
    p_role: role,
    p_student_code: safeText(studentCode),
    p_pin: safeText(pin),
  });
  if (error) {
    const local = await resolveLocalPortal(normalizedCode, role, studentCode, pin);
    return local || { ok: false, message: error.message };
  }
  return data || { ok: false, message: 'Không tìm thấy dữ liệu.' };
}

export async function acknowledgePortalNotice({ code, role, studentCode, pin, noticeId, readerName = '' }) {
  const localItem = { id: uid('receipt'), code: normalizeCode(code), role, studentCode, noticeId, readerName, readAt: new Date().toISOString() };
  try {
    const key = `${LOCAL_RECEIPT_PREFIX}:${normalizeCode(code)}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([localItem, ...list.filter((item) => !(item.noticeId === noticeId && item.studentCode === studentCode && item.role === role))]));
  } catch { /* ignore */ }
  if (!isSupabaseConfigured || !supabase) return { ok: true, offline: true };
  const { data, error } = await supabase.rpc('acknowledge_homeroom_notice', {
    p_code: normalizeCode(code),
    p_role: role,
    p_student_code: safeText(studentCode),
    p_pin: safeText(pin),
    p_notice_id: safeText(noticeId),
    p_reader_name: safeText(readerName),
  });
  return error ? { ok: false, message: error.message } : (data || { ok: true });
}

export async function submitSubjectFeedback({ code, studentCode, subject, teacherName, teacherEmail, period, level, comment, action }) {
  const item = {
    id: uid('feedback'),
    code: normalizeCode(code),
    student_ref: safeText(studentCode),
    subject: safeText(subject),
    teacher_name: safeText(teacherName),
    teacher_email: safeText(teacherEmail),
    period: safeText(period),
    level: safeText(level, 'Bình thường'),
    comment: safeText(comment),
    suggested_action: safeText(action),
    created_at: new Date().toISOString(),
    status: 'pending',
  };
  try {
    const key = `${LOCAL_FEEDBACK_PREFIX}:${normalizeCode(code)}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([item, ...list]));
  } catch { /* ignore */ }
  if (!isSupabaseConfigured || !supabase) return { ok: true, offline: true, item };
  const { data, error } = await supabase.rpc('submit_homeroom_subject_feedback', {
    p_code: normalizeCode(code),
    p_student_code: safeText(studentCode),
    p_subject: safeText(subject),
    p_teacher_name: safeText(teacherName),
    p_teacher_email: safeText(teacherEmail),
    p_period: safeText(period),
    p_level: safeText(level, 'Bình thường'),
    p_comment: safeText(comment),
    p_action: safeText(action),
  });
  return error ? { ok: false, message: error.message } : (data || { ok: true });
}

export async function loadFeedbackInbox(user, workspaceId = 'default', subjectCode = '') {
  const local = [];
  try {
    const code = normalizeCode(subjectCode);
    if (code) local.push(...JSON.parse(localStorage.getItem(`${LOCAL_FEEDBACK_PREFIX}:${code}`) || '[]'));
  } catch { /* ignore */ }
  if (!isSupabaseConfigured || !supabase || !user?.id) return { ok: true, offline: true, items: local };
  const { data, error } = await supabase.from(FEEDBACK_TABLE).select('*').eq('owner_id', user.id).eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  if (error) return { ok: false, offline: true, message: error.message, items: local };
  return { ok: true, items: data || [] };
}

export async function markFeedbackReviewed(id, user) {
  if (!isSupabaseConfigured || !supabase || !user?.id || !id) return { ok: true, offline: true };
  const { error } = await supabase.from(FEEDBACK_TABLE).update({ status: 'reviewed', reviewed_at: new Date().toISOString() }).eq('id', id).eq('owner_id', user.id);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function loadPortalReceipts(user, workspaceId = 'default', codes = []) {
  const local = [];
  try {
    codes.filter(Boolean).forEach((code) => local.push(...JSON.parse(localStorage.getItem(`${LOCAL_RECEIPT_PREFIX}:${normalizeCode(code)}`) || '[]')));
  } catch { /* ignore */ }
  if (!isSupabaseConfigured || !supabase || !user?.id) return { ok: true, offline: true, items: local };
  const { data, error } = await supabase.from(RECEIPT_TABLE).select('*').eq('owner_id', user.id).eq('workspace_id', workspaceId).order('read_at', { ascending: false });
  if (error) return { ok: false, offline: true, message: error.message, items: local };
  return { ok: true, items: data || [] };
}


export async function submitPortalResponse({ code, role, studentCode, pin, noticeId = '', message = '', readerName = '' }) {
  const item = { id: uid('response'), code: normalizeCode(code), role: safeText(role), studentCode: safeText(studentCode), noticeId: safeText(noticeId), message: safeText(message), readerName: safeText(readerName), createdAt: new Date().toISOString(), status: 'new' };
  if (!item.message) return { ok: false, message: 'Vui lòng nhập nội dung phản hồi.' };
  try {
    const key = `${LOCAL_RESPONSE_PREFIX}:${normalizeCode(code)}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([item, ...list].slice(0, 300)));
  } catch { /* ignore */ }
  if (!isSupabaseConfigured || !supabase) return { ok: true, offline: true, item };
  const { data, error } = await supabase.rpc('submit_homeroom_portal_response', {
    p_code: normalizeCode(code), p_role: safeText(role), p_student_code: safeText(studentCode),
    p_pin: safeText(pin), p_notice_id: safeText(noticeId), p_message: item.message, p_reader_name: item.readerName,
  });
  return error ? { ok: false, message: error.message } : (data || { ok: true });
}

export async function loadPortalResponses(user, workspaceId = 'default', codes = []) {
  const local = [];
  try { codes.filter(Boolean).forEach((code) => local.push(...JSON.parse(localStorage.getItem(`${LOCAL_RESPONSE_PREFIX}:${normalizeCode(code)}`) || '[]'))); } catch { /* ignore */ }
  if (!isSupabaseConfigured || !supabase || !user?.id) return { ok: true, offline: true, items: local };
  const { data, error } = await supabase.from(RESPONSE_TABLE).select('*').eq('owner_id', user.id).eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  if (error) return { ok: false, offline: true, message: error.message, items: local };
  return { ok: true, items: data || [] };
}

export async function loadSchoolHomeroomStats(user) {
  if (!isSupabaseConfigured || !supabase || user?.role !== 'admin') return { ok: false, offline: true, message: 'Chỉ Admin có quyền xem thống kê toàn trường.', workspaces: [] };
  const { data, error } = await supabase.from('bes_homeroom_workspaces').select('owner_id,owner_email,class_name,school_year,payload,updated_at').order('class_name');
  if (error) return { ok: false, message: error.message, workspaces: [] };
  return { ok: true, workspaces: data || [] };
}
