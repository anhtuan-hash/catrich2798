import { isSupabaseConfigured, supabase } from './supabase.js';
import { canPublishDepartment } from './permissions.js';

export const CUSTOM_GAMES_EVENT = 'bes-custom-games-updated';
const CUSTOM_GAMES_TABLE = 'custom_game_platforms';
const LOCAL_KEY = 'bes-custom-game-platforms-v2';

function emitUpdate() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CUSTOM_GAMES_EVENT));
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

function normalizeGame(item = {}) {
  return {
    id: String(item.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    label: String(item.label || '').trim(),
    icon: String(item.icon || '🎮').trim().slice(0, 4) || '🎮',
    home: String(item.home || '').trim(),
    color: String(item.color || 'violet').trim() || 'violet',
    embedMode: item.embed_mode || item.embedMode || 'iframe',
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
  const value = safeJson(localStorage.getItem(LOCAL_KEY) || localStorage.getItem('bes-custom-game-platforms-v1') || '[]', []);
  return Array.isArray(value) ? value.map(normalizeGame).filter((item) => item.label && item.home) : [];
}

function writeLocalAll(items) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items.map(normalizeGame).slice(0, 200)));
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
    icon: String(draft.icon || '🎮').trim().slice(0, 4) || '🎮',
    home: String(draft.home || '').trim(),
    color: String(draft.color || 'violet').trim() || 'violet',
    embed_mode: draft.embedMode === 'newtab' ? 'newtab' : 'iframe',
    status: normalizeStatus(status),
    ...ownerPayload(user),
    updated_at: now,
  };
}

export async function listCustomGames(user) {
  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_GAMES_TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) return data.map(normalizeGame).filter((item) => item.label && item.home);
    console.warn('Custom games cloud read failed; using local fallback:', error?.message || error);
  }
  return readLocalAll().filter((item) => visibleToUser(item, user));
}

export async function createCustomGame(user, draft, status = 'private') {
  const normalizedStatus = normalizeStatus(status);
  const payload = toDbPayload(user, draft, normalizedStatus);
  if (!payload.label || !payload.home) return { ok: false, message: 'Missing game name or URL.' };

  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_GAMES_TABLE)
      .insert(payload)
      .select('*')
      .single();
    if (!error && data) {
      emitUpdate();
      return { ok: true, game: normalizeGame(data), cloud: true };
    }
    return { ok: false, message: error?.message || 'Could not save the custom game.' };
  }

  const item = normalizeGame({
    ...payload,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    owner_id: user?.id || user?.authId || 'guest',
    created_at: new Date().toISOString(),
  });
  const all = readLocalAll();
  writeLocalAll([item, ...all.filter((existing) => existing.id !== item.id)]);
  return { ok: true, game: item, cloud: false };
}

export async function updateCustomGameStatus(user, id, status, reviewNote = '') {
  if (!canPublishDepartment(user)) return { ok: false, message: 'Only TTCM/Admin can review custom games.' };
  const nextStatus = normalizeStatus(status);
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_GAMES_TABLE)
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
      return { ok: true, game: normalizeGame(data), cloud: true };
    }
    return { ok: false, message: error?.message || 'Could not update approval status.' };
  }

  const all = readLocalAll();
  const index = all.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, message: 'Custom game not found.' };
  all[index] = normalizeGame({
    ...all[index],
    status: nextStatus,
    reviewNote,
    reviewedBy: user?.id || user?.email || 'leader',
    reviewedAt: now,
    updatedAt: now,
  });
  writeLocalAll(all);
  return { ok: true, game: all[index], cloud: false };
}

export async function requestCustomGameApproval(user, id) {
  const now = new Date().toISOString();
  if (isSupabaseConfigured && supabase && user?.id) {
    const { data, error } = await supabase
      .from(CUSTOM_GAMES_TABLE)
      .update({ status: 'pending', updated_at: now })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('*')
      .single();
    if (!error && data) {
      emitUpdate();
      return { ok: true, game: normalizeGame(data), cloud: true };
    }
    return { ok: false, message: error?.message || 'Could not submit the game for review.' };
  }

  const all = readLocalAll();
  const index = all.findIndex((item) => item.id === id && isOwner(item, user));
  if (index < 0) return { ok: false, message: 'Custom game not found.' };
  all[index] = normalizeGame({ ...all[index], status: 'pending', updatedAt: now });
  writeLocalAll(all);
  return { ok: true, game: all[index], cloud: false };
}

export async function deleteCustomGame(user, id) {
  if (isSupabaseConfigured && supabase && user?.id) {
    let query = supabase.from(CUSTOM_GAMES_TABLE).delete().eq('id', id);
    if (!canPublishDepartment(user)) query = query.eq('owner_id', user.id).neq('status', 'approved');
    const { error } = await query;
    if (!error) {
      emitUpdate();
      return { ok: true, cloud: true };
    }
    return { ok: false, message: error?.message || 'Could not delete the custom game.' };
  }

  const all = readLocalAll();
  const target = all.find((item) => item.id === id);
  if (!target) return { ok: false, message: 'Custom game not found.' };
  if (!canPublishDepartment(user) && (!isOwner(target, user) || target.status === 'approved')) {
    return { ok: false, message: 'You cannot delete this game.' };
  }
  writeLocalAll(all.filter((item) => item.id !== id));
  return { ok: true, cloud: false };
}

export function canEditCustomGame(user, game) {
  if (!game) return false;
  if (canPublishDepartment(user)) return true;
  return isOwner(game, user) && game.status !== 'approved';
}

export function isCustomGameOwner(user, game) {
  return isOwner(game, user);
}
