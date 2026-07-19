import { canPublishDepartment } from './permissions.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

export const CUSTOM_APPS_EVENT = 'bes-custom-app-links-updated';
export const CUSTOM_APPS_TABLE = 'custom_game_platforms';
const LOCAL_KEY = 'bes-custom-app-links-v1';
const APP_COLOR_PREFIX = 'app-link:';

function emitUpdate() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CUSTOM_APPS_EVENT));
}

function safeJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeStatus(value) {
  return ['pending', 'approved', 'rejected'].includes(value) ? value : 'pending';
}

export function isCustomAppRecord(item = {}) {
  return String(item.color || item.accent || '').startsWith(APP_COLOR_PREFIX);
}

function normalizeAccent(value) {
  const raw = String(value || '').replace(APP_COLOR_PREFIX, '').trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : '#3478d4';
}

export function normalizeCustomApp(item = {}) {
  return {
    id: String(item.id || `custom-app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name: String(item.label || item.name || '').trim(),
    url: String(item.home || item.url || '').trim(),
    accent: normalizeAccent(item.color || item.accent),
    status: normalizeStatus(item.status),
    ownerId: item.owner_id || item.ownerId || '',
    ownerEmail: item.owner_email || item.ownerEmail || '',
    ownerName: item.owner_name || item.ownerName || '',
    reviewNote: item.review_note || item.reviewNote || '',
    reviewedBy: item.reviewed_by || item.reviewedBy || '',
    reviewedAt: item.reviewed_at || item.reviewedAt || '',
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
    updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
  };
}

export function normalizeCustomAppUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    parsed.hash = parsed.hash || '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function readLocalAll() {
  if (typeof localStorage === 'undefined') return [];
  const value = safeJson(localStorage.getItem(LOCAL_KEY) || '[]', []);
  return Array.isArray(value)
    ? value.map(normalizeCustomApp).filter((item) => item.name && item.url)
    : [];
}

function writeLocalAll(items) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items.map(normalizeCustomApp).slice(0, 200)));
  emitUpdate();
}

function userIdentity(user) {
  return {
    id: String(user?.id || user?.authId || ''),
    email: String(user?.email || '').trim().toLowerCase(),
  };
}

export function isCustomAppOwner(user, app) {
  if (!app) return false;
  const identity = userIdentity(user);
  return Boolean(
    (identity.id && String(app.ownerId || '') === identity.id)
    || (identity.email && String(app.ownerEmail || '').trim().toLowerCase() === identity.email)
  );
}

function visibleToUser(item, user) {
  if (item.status === 'approved') return true;
  if (canPublishDepartment(user)) return true;
  return isCustomAppOwner(user, item);
}

function ownerPayload(user) {
  return {
    owner_id: user?.id || user?.authId || null,
    owner_email: String(user?.email || '').trim().toLowerCase() || null,
    owner_name: String(user?.name || user?.fullName || user?.email || 'Teacher').trim(),
  };
}

function toDbPayload(user, draft, status) {
  const url = normalizeCustomAppUrl(draft.url || draft.home);
  return {
    label: String(draft.name || draft.label || '').trim().slice(0, 80),
    icon: '🔗',
    home: url,
    color: `${APP_COLOR_PREFIX}${normalizeAccent(draft.accent)}`,
    embed_mode: 'iframe',
    status: normalizeStatus(status),
    ...ownerPayload(user),
    updated_at: new Date().toISOString(),
  };
}

export async function listCustomApps(user) {
  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_APPS_TABLE)
      .select('*')
      .like('color', `${APP_COLOR_PREFIX}%`)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data.map(normalizeCustomApp).filter((item) => item.name && item.url);
    }
    console.warn('[Custom apps] Cloud read failed; using local fallback:', error?.message || error);
  }
  return readLocalAll().filter((item) => visibleToUser(item, user));
}

export async function createCustomApp(user, draft) {
  const leader = canPublishDepartment(user);
  const status = leader ? 'approved' : 'pending';
  const payload = toDbPayload(user, draft, status);
  if (!payload.label || !payload.home) return { ok: false, message: 'Tên hoặc đường dẫn ứng dụng chưa hợp lệ.' };

  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_APPS_TABLE)
      .insert(payload)
      .select('*')
      .single();

    if (!error && data) {
      emitUpdate();
      return { ok: true, app: normalizeCustomApp(data), cloud: true };
    }
    return { ok: false, message: error?.message || 'Không thể lưu ứng dụng.' };
  }

  const item = normalizeCustomApp({
    ...payload,
    id: `custom-app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  });
  const all = readLocalAll();
  writeLocalAll([item, ...all]);
  return { ok: true, app: item, cloud: false };
}

export async function updateCustomApp(user, id, draft) {
  const all = await listCustomApps(user);
  const existing = all.find((item) => item.id === id);
  if (!existing) return { ok: false, message: 'Không tìm thấy ứng dụng.' };
  const leader = canPublishDepartment(user);
  if (!leader && !isCustomAppOwner(user, existing)) return { ok: false, message: 'Bạn không có quyền sửa ứng dụng này.' };
  if (!leader && existing.status === 'approved') return { ok: false, message: 'Ứng dụng đã duyệt chỉ TTCM mới có thể sửa.' };

  const status = leader ? existing.status : 'pending';
  const payload = toDbPayload(user, draft, status);
  if (!payload.label || !payload.home) return { ok: false, message: 'Tên hoặc đường dẫn ứng dụng chưa hợp lệ.' };
  delete payload.owner_id;
  delete payload.owner_email;
  delete payload.owner_name;

  if (isSupabaseConfigured && supabase && user?.id) {
    let query = supabase.from(CUSTOM_APPS_TABLE).update(payload).eq('id', id);
    if (!leader) query = query.eq('owner_id', user.id).neq('status', 'approved');
    const { data, error } = await query.select('*').single();
    if (!error && data) {
      emitUpdate();
      return { ok: true, app: normalizeCustomApp(data), cloud: true };
    }
    return { ok: false, message: error?.message || 'Không thể cập nhật ứng dụng.' };
  }

  const local = readLocalAll();
  const index = local.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, message: 'Không tìm thấy ứng dụng.' };
  local[index] = normalizeCustomApp({ ...local[index], ...payload, updatedAt: new Date().toISOString() });
  writeLocalAll(local);
  return { ok: true, app: local[index], cloud: false };
}

export async function reviewCustomApp(user, id, status, reviewNote = '') {
  if (!canPublishDepartment(user)) return { ok: false, message: 'Chỉ TTCM hoặc Admin được duyệt ứng dụng.' };
  const nextStatus = ['approved', 'rejected'].includes(status) ? status : 'pending';
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_APPS_TABLE)
      .update({
        status: nextStatus,
        review_note: String(reviewNote || '').trim() || null,
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .like('color', `${APP_COLOR_PREFIX}%`)
      .select('*')
      .single();

    if (!error && data) {
      emitUpdate();
      return { ok: true, app: normalizeCustomApp(data), cloud: true };
    }
    return { ok: false, message: error?.message || 'Không thể cập nhật trạng thái duyệt.' };
  }

  const all = readLocalAll();
  const index = all.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, message: 'Không tìm thấy ứng dụng.' };
  all[index] = normalizeCustomApp({
    ...all[index],
    status: nextStatus,
    reviewNote,
    reviewedBy: user?.id || user?.email || 'leader',
    reviewedAt: now,
    updatedAt: now,
  });
  writeLocalAll(all);
  return { ok: true, app: all[index], cloud: false };
}

export async function deleteCustomApp(user, id) {
  const all = await listCustomApps(user);
  const target = all.find((item) => item.id === id);
  if (!target) return { ok: false, message: 'Không tìm thấy ứng dụng.' };
  const leader = canPublishDepartment(user);
  if (!leader && (!isCustomAppOwner(user, target) || target.status === 'approved')) {
    return { ok: false, message: 'Bạn không có quyền xoá ứng dụng này.' };
  }

  if (isSupabaseConfigured && supabase && user?.id) {
    let query = supabase.from(CUSTOM_APPS_TABLE).delete().eq('id', id).like('color', `${APP_COLOR_PREFIX}%`);
    if (!leader) query = query.eq('owner_id', user.id).neq('status', 'approved');
    const { error } = await query;
    if (!error) {
      emitUpdate();
      return { ok: true, cloud: true };
    }
    return { ok: false, message: error?.message || 'Không thể xoá ứng dụng.' };
  }

  writeLocalAll(readLocalAll().filter((item) => item.id !== id));
  return { ok: true, cloud: false };
}

export function subscribeCustomApps(user, callback) {
  if (typeof window === 'undefined') return () => {};
  let active = true;
  const refresh = async () => {
    const items = await listCustomApps(user);
    if (active) callback?.(items);
  };
  const localHandler = () => refresh();
  const storageHandler = (event) => {
    if (!event?.key || event.key === LOCAL_KEY) refresh();
  };

  window.addEventListener(CUSTOM_APPS_EVENT, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (isSupabaseConfigured && supabase && user?.id) {
    channel = supabase
      .channel(`bes-custom-app-links-${String(user.id).slice(0, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: CUSTOM_APPS_TABLE }, () => refresh())
      .subscribe();
  }

  refresh();
  return () => {
    active = false;
    window.removeEventListener(CUSTOM_APPS_EVENT, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel) supabase.removeChannel(channel);
  };
}
