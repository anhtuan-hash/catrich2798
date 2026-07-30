export * from './homeroomPhase2Base.js';

import { isSupabaseConfigured, supabase } from './supabase.js';
import { normalizeHomeroomWorkspace } from './homeroomStore.js';
import * as base from './homeroomPhase2Base.js';

const PORTAL_TABLE = 'bes_homeroom_portals';
const FEEDBACK_TABLE = 'bes_homeroom_feedback_inbox';
const RECEIPT_TABLE = 'bes_homeroom_portal_receipts';
const RESPONSE_TABLE = 'bes_homeroom_portal_responses';
const LOCAL_PORTAL_PREFIX = 'bes-homeroom-portal-v2';
const LOCAL_FEEDBACK_PREFIX = 'bes-homeroom-feedback-v2';
const LOCAL_RECEIPT_PREFIX = 'bes-homeroom-receipt-v2';
const LOCAL_RESPONSE_PREFIX = 'bes-homeroom-response-v3';

const PORTAL_RESULT_COLUMNS = 'id,owner_id,owner_email,workspace_id,parent_code,student_code,subject_code,updated_at';
const FEEDBACK_COLUMNS = 'id,portal_id,owner_id,workspace_id,student_ref,subject,teacher_name,teacher_email,period,level,comment,suggested_action,status,created_at,reviewed_at';
const RECEIPT_COLUMNS = 'id,portal_id,owner_id,workspace_id,notice_id,student_ref,reader_role,reader_name,read_at';
const RESPONSE_COLUMNS = 'id,portal_id,owner_id,workspace_id,notice_id,student_ref,reader_role,reader_name,message,status,created_at,reviewed_at';
const COMMUNICATION_CACHE_TTL = 60 * 1000;
const SCHOOL_STATS_CACHE_TTL = 30 * 60 * 1000;
const readCache = new Map();
const readPromises = new Map();

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeCode(value) {
  return safeText(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

function missingRpc(error, name) {
  const code = safeText(error?.code).toUpperCase();
  const message = safeText(error?.message || error).toLowerCase();
  return code === 'PGRST202'
    || code === '42883'
    || (message.includes(String(name || '').toLowerCase())
      && (message.includes('does not exist') || message.includes('schema cache') || message.includes('could not find')));
}

function uid(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function userKey(user) {
  return String(user?.id || user?.email || 'guest').trim().toLowerCase();
}

function cacheKey(kind, user, workspaceId = 'default') {
  return `${kind}:${userKey(user)}:${String(workspaceId || 'default')}`;
}

function readCached(key, ttl) {
  const cached = readCache.get(key);
  if (!cached || Date.now() - cached.storedAt >= ttl) return null;
  return cached.value;
}

function storeCached(key, value) {
  if (value?.ok) readCache.set(key, { value, storedAt: Date.now() });
  return value;
}

function invalidatePrefix(prefix) {
  [...readCache.keys()].forEach((key) => {
    if (key.startsWith(prefix)) readCache.delete(key);
  });
  [...readPromises.keys()].forEach((key) => {
    if (key.startsWith(prefix)) readPromises.delete(key);
  });
}

async function cachedRead(key, ttl, force, loader) {
  const cached = force ? null : readCached(key, ttl);
  if (cached) return cached;
  if (!force && readPromises.has(key)) return readPromises.get(key);

  let task;
  task = Promise.resolve()
    .then(loader)
    .then((value) => storeCached(key, value))
    .finally(() => {
      if (readPromises.get(key) === task) readPromises.delete(key);
    });
  readPromises.set(key, task);
  return task;
}

function localPortalKey(code) {
  return `${LOCAL_PORTAL_PREFIX}:${normalizeCode(code)}`;
}

function saveLocalPortal(record) {
  [record.parentCode, record.studentCode, record.subjectCode].filter(Boolean).forEach((code) => {
    try { localStorage.setItem(localPortalKey(code), JSON.stringify(record)); } catch { /* optional local cache */ }
  });
}

function localFeedback(subjectCode) {
  const items = [];
  try {
    const code = normalizeCode(subjectCode);
    if (code) items.push(...JSON.parse(localStorage.getItem(`${LOCAL_FEEDBACK_PREFIX}:${code}`) || '[]'));
  } catch { /* optional local fallback */ }
  return items;
}

function localReceipts(codes = []) {
  const items = [];
  try {
    codes.filter(Boolean).forEach((code) => {
      items.push(...JSON.parse(localStorage.getItem(`${LOCAL_RECEIPT_PREFIX}:${normalizeCode(code)}`) || '[]'));
    });
  } catch { /* optional local fallback */ }
  return items;
}

function localResponses(codes = []) {
  const items = [];
  try {
    codes.filter(Boolean).forEach((code) => {
      items.push(...JSON.parse(localStorage.getItem(`${LOCAL_RESPONSE_PREFIX}:${normalizeCode(code)}`) || '[]'));
    });
  } catch { /* optional local fallback */ }
  return items;
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
    payload: await base.buildPortalPayload(normalized),
    updatedAt: new Date().toISOString(),
  };
  saveLocalPortal(record);
  if (!isSupabaseConfigured || !supabase || !user?.id) return { ok: true, offline: true, record };

  const { data, error } = await supabase
    .from(PORTAL_TABLE)
    .upsert({
      owner_id: user.id,
      owner_email: user.email || '',
      workspace_id: normalized.id,
      parent_code: record.parentCode,
      student_code: record.studentCode,
      subject_code: record.subjectCode,
      payload: record.payload,
      updated_at: record.updatedAt,
    }, { onConflict: 'owner_id,workspace_id' })
    .select(PORTAL_RESULT_COLUMNS)
    .maybeSingle();
  if (error) return { ok: false, offline: true, message: error.message, record };
  return { ok: true, record: data, source: 'cloud' };
}

export async function loadFeedbackInbox(user, workspaceId = 'default', subjectCode = '', { force = false } = {}) {
  const local = localFeedback(subjectCode);
  if (!isSupabaseConfigured || !supabase || !user?.id) return { ok: true, offline: true, items: local };

  const key = cacheKey('feedback', user, workspaceId);
  return cachedRead(key, COMMUNICATION_CACHE_TTL, force, async () => {
    const { data, error } = await supabase
      .from(FEEDBACK_TABLE)
      .select(FEEDBACK_COLUMNS)
      .eq('owner_id', user.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) return { ok: false, offline: true, message: error.message, items: local };
    return { ok: true, items: data || [] };
  });
}

export async function markFeedbackReviewed(id, user) {
  if (!isSupabaseConfigured || !supabase || !user?.id || !id) return { ok: true, offline: true };
  const { error } = await supabase
    .from(FEEDBACK_TABLE)
    .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', user.id);
  if (!error) invalidatePrefix(`feedback:${userKey(user)}:`);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function loadPortalReceipts(user, workspaceId = 'default', codes = [], { force = false } = {}) {
  const local = localReceipts(codes);
  if (!isSupabaseConfigured || !supabase || !user?.id) return { ok: true, offline: true, items: local };

  const key = cacheKey('receipts', user, workspaceId);
  return cachedRead(key, COMMUNICATION_CACHE_TTL, force, async () => {
    const { data, error } = await supabase
      .from(RECEIPT_TABLE)
      .select(RECEIPT_COLUMNS)
      .eq('owner_id', user.id)
      .eq('workspace_id', workspaceId)
      .order('read_at', { ascending: false })
      .limit(500);
    if (error) return { ok: false, offline: true, message: error.message, items: local };
    return { ok: true, items: data || [] };
  });
}

export async function loadPortalResponses(user, workspaceId = 'default', codes = [], { force = false } = {}) {
  const local = localResponses(codes);
  if (!isSupabaseConfigured || !supabase || !user?.id) return { ok: true, offline: true, items: local };

  const key = cacheKey('responses', user, workspaceId);
  return cachedRead(key, COMMUNICATION_CACHE_TTL, force, async () => {
    const { data, error } = await supabase
      .from(RESPONSE_TABLE)
      .select(RESPONSE_COLUMNS)
      .eq('owner_id', user.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return { ok: false, offline: true, message: error.message, items: local };
    return { ok: true, items: data || [] };
  });
}

export async function loadSchoolHomeroomStats(user, { force = false } = {}) {
  if (!isSupabaseConfigured || !supabase || user?.role !== 'admin') {
    return { ok: false, offline: true, message: 'Chỉ Admin có quyền xem thống kê toàn trường.', workspaces: [] };
  }

  const key = cacheKey('school-stats', user, 'all');
  return cachedRead(key, SCHOOL_STATS_CACHE_TTL, force, async () => {
    const rpcName = 'bes_homeroom_school_stats_v2';
    const compact = await supabase.rpc(rpcName);
    if (!compact.error) {
      return { ok: true, workspaces: compact.data || [], source: 'compact-rpc' };
    }
    if (!missingRpc(compact.error, rpcName)) {
      return { ok: false, message: compact.error.message, workspaces: [] };
    }

    // Temporary compatibility path before the compact RPC migration is applied.
    const { data, error } = await supabase
      .from('bes_homeroom_workspaces')
      .select('owner_id,owner_email,workspace_id,class_name,school_year,payload,updated_at')
      .order('class_name')
      .limit(200);
    if (error) return { ok: false, message: error.message, workspaces: [] };
    return { ok: true, workspaces: data || [], source: 'legacy-payload-fallback' };
  });
}
