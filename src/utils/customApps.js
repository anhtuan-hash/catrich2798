import { isSupabaseConfigured, supabase } from './supabase.js';
import { canPublishDepartment } from './permissions.js';

export const CUSTOM_APPS_EVENT = 'bes-custom-apps-updated';
const CUSTOM_APPS_TABLE = 'custom_app_links';
const LOCAL_KEY = 'bes-custom-app-links-v1';

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
  return ['private', 'pending', 'approved', 'rejected'].includes(value) ? value : 'private';
}

export function ensureCustomAppUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  return `https://${raw}`;
}

function normalizeApp(item = {}) {
  const id = String(item.id || `custom-app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  return {
    id,
    label: String(item.label || item.title || '').trim(),
    description: String(item.description || item.desc || '').trim(),
    url: ensureCustomAppUrl(item.url || item.home || ''),
    icon: String(item.icon || '↗').trim().slice(0, 4) || '↗',
    accent: String(item.accent || item.color || '#7C5CE7').trim() || '#7C5CE7',
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

function readLocalAll() {
  if (typeof localStorage === 'undefined') return [];
  const value = safeJson(localStorage.getItem(LOCAL_KEY) || '[]', []);
  return Array.isArray(value) ? value.map(normalizeApp).filter((item) => item.label && item.url) : [];
}

function writeLocalAll(items) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items.map(normalizeApp).slice(0, 300)));
  emitUpdate();
}

function isOwner(item, user) {
  if (!user) return item.ownerId === 'guest';
  const userId = String(user.id || user.authId || '');
  const email = String(user.email || '').toLowerCase();
  return (userId && String(item.ownerId || '') === userId)
    || (email && String(item.ownerEmail || '').toLowerCase() === email);
}

function visibleToUser(item, user) {
  if (item.status === 'approved') return true;
  if (canPublishDepartment(user)) return true;
  return isOwner(item, user);
}

function ownerPayload(user) {
  return {
    owner_id: user?.id || user?.authId || null,
    owner_email: String(user?.email || '').trim().toLowerCase() || null,
    owner_name: String(user?.name || user?.email || 'Guest').trim(),
  };
}

function toDbPayload(user, draft, status) {
  const now = new Date().toISOString();
  return {
    label: String(draft.label || '').trim(),
    description: String(draft.description || '').trim() || null,
    url: ensureCustomAppUrl(draft.url),
    icon: String(draft.icon || '↗').trim().slice(0, 4) || '↗',
    accent: String(draft.accent || '#7C5CE7').trim() || '#7C5CE7',
    status: normalizeStatus(status),
    ...ownerPayload(user),
    updated_at: now,
  };
}

export async function listCustomApps(user) {
  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_APPS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) return data.map(normalizeApp).filter((item) => item.label && item.url);
    console.warn('Custom apps cloud read failed; using local fallback:', error?.message || error);
  }
  return readLocalAll().filter((item) => visibleToUser(item, user));
}

export async function createCustomApp(user, draft, status = 'private') {
  const payload = toDbPayload(user, draft, status);
  if (!payload.label || !payload.url) return { ok: false, message: 'Missing app name or URL.' };

  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_APPS_TABLE)
      .insert(payload)
      .select('*')
      .single();
    if (!error && data) {
      emitUpdate();
      return { ok: true, app: normalizeApp(data), cloud: true };
    }
    return { ok: false, message: error?.message || 'Could not save the custom app.' };
  }

  const item = normalizeApp({
    ...payload,
    id: `custom-app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    owner_id: user?.id || user?.authId || 'guest',
    created_at: new Date().toISOString(),
  });
  const all = readLocalAll();
  writeLocalAll([item, ...all.filter((existing) => existing.id !== item.id)]);
  return { ok: true, app: item, cloud: false };
}

export async function updateCustomAppStatus(user, id, status, reviewNote = '') {
  if (!canPublishDepartment(user)) return { ok: false, message: 'Only TTCM/Admin can review custom apps.' };
  const nextStatus = normalizeStatus(status);
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
      .select('*')
      .single();
    if (!error && data) {
      emitUpdate();
      return { ok: true, app: normalizeApp(data), cloud: true };
    }
    return { ok: false, message: error?.message || 'Could not update approval status.' };
  }

  const all = readLocalAll();
  const index = all.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, message: 'Custom app not found.' };
  all[index] = normalizeApp({
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

export async function requestCustomAppApproval(user, id) {
  const now = new Date().toISOString();
  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_APPS_TABLE)
      .update({ status: 'pending', updated_at: now })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('*')
      .single();
    if (!error && data) {
      emitUpdate();
      return { ok: true, app: normalizeApp(data), cloud: true };
    }
    return { ok: false, message: error?.message || 'Could not submit the app for review.' };
  }

  const all = readLocalAll();
  const index = all.findIndex((item) => item.id === id && isOwner(item, user));
  if (index < 0) return { ok: false, message: 'Custom app not found.' };
  all[index] = normalizeApp({ ...all[index], status: 'pending', updatedAt: now });
  writeLocalAll(all);
  return { ok: true, app: all[index], cloud: false };
}

export async function deleteCustomApp(user, id) {
  if (isSupabaseConfigured && supabase && user?.id) {
    let query = supabase.from(CUSTOM_APPS_TABLE).delete().eq('id', id);
    if (!canPublishDepartment(user)) query = query.eq('owner_id', user.id).neq('status', 'approved');
    const { error } = await query;
    if (!error) {
      emitUpdate();
      return { ok: true, cloud: true };
    }
    return { ok: false, message: error?.message || 'Could not delete the custom app.' };
  }

  const all = readLocalAll();
  const target = all.find((item) => item.id === id);
  if (!target) return { ok: false, message: 'Custom app not found.' };
  if (!canPublishDepartment(user) && (!isOwner(target, user) || target.status === 'approved')) {
    return { ok: false, message: 'You cannot delete this app.' };
  }
  writeLocalAll(all.filter((item) => item.id !== id));
  return { ok: true, cloud: false };
}

export function canEditCustomApp(user, app) {
  if (!app) return false;
  if (canPublishDepartment(user)) return true;
  return isOwner(app, user) && app.status !== 'approved';
}

export function isCustomAppOwner(user, app) {
  return isOwner(app, user);
}

export function subscribeCustomApps(callback) {
  if (!isSupabaseConfigured || !supabase || typeof callback !== 'function') return () => {};
  const channel = supabase
    .channel(`custom-app-links-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: CUSTOM_APPS_TABLE }, () => callback())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
