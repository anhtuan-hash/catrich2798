import { isSupabaseConfigured, supabase } from './supabase.js';

export const QUICK_ACCESS_MAX_ITEMS = 10;
export const QUICK_ACCESS_EVENT = 'bes-quick-access-updated';
const QUICK_ACCESS_KEY = 'bes-quick-access-v1';
export const QUICK_ACCESS_MODES = ['auto', 'pin', 'focus'];
export const QUICK_ACCESS_RECENT_MAX = 3;
export const QUICK_ACCESS_WORKSPACES = ['all', 'teaching', 'homeroom', 'department'];
export const QUICK_ACCESS_SIZES = ['s', 'm', 'l'];
export const QUICK_ACCESS_MOTIONS = ['reduced', 'normal', 'fluid'];
export const QUICK_ACCESS_DENSITIES = ['compact', 'comfortable'];
export const QUICK_ACCESS_SIDES = ['left', 'right'];
export const QUICK_ACCESS_THEMES = ['glass', 'paper', 'color', 'minimal'];
export const QUICK_ACCESS_WORKFLOW_MAX = 4;
export const QUICK_ACCESS_WORKFLOW_STEPS_MAX = 5;

export const DEFAULT_QUICK_ACCESS_IDS = [
  'route:dashboard',
  'route:apps',
  'route:homeroom',
  'tool:gradebook-studio',
  'action:reports',
  'action:ttcm',
  'action:attendance',
  'action:schedule',
  'route:assessment-core',
  'route:resource-library',
];

function userKey(user) {
  return String(user?.id || user?.authId || user?.email || 'guest').trim().toLowerCase();
}

function storageKey(user) {
  return `${QUICK_ACCESS_KEY}:${userKey(user)}`;
}

function safeGet(key) {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage?.getItem(key) || ''; } catch { return ''; }
}

function safeSet(key, value) {
  if (typeof window === 'undefined') return;
  try { window.localStorage?.setItem(key, value); } catch { /* local cache is best effort */ }
}

function cleanIds(ids, allowedIds = [], maxItems = QUICK_ACCESS_MAX_ITEMS) {
  const allowed = new Set((Array.isArray(allowedIds) ? allowedIds : []).map(String));
  const seen = new Set();
  return (Array.isArray(ids) ? ids : [])
    .map((id) => String(id || '').trim())
    .filter((id) => {
      if (!id || seen.has(id)) return false;
      if (allowed.size && !allowed.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, maxItems);
}

function cleanWorkflowId(value, index = 0) {
  const raw = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return raw.slice(0, 48) || `workflow-${index + 1}`;
}

function cleanWorkflows(value, allowedIds = []) {
  const input = Array.isArray(value) ? value : [];
  const seen = new Set();
  const output = [];
  input.slice(0, QUICK_ACCESS_WORKFLOW_MAX * 2).forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    let id = cleanWorkflowId(entry.id, index);
    if (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    const itemIds = cleanIds(entry.itemIds, allowedIds, QUICK_ACCESS_WORKFLOW_STEPS_MAX);
    if (!itemIds.length) return;
    const name = String(entry.name || '').trim().slice(0, 42) || `Workflow ${output.length + 1}`;
    output.push({ id, name, itemIds });
  });
  return output.slice(0, QUICK_ACCESS_WORKFLOW_MAX);
}

export function createDefaultQuickAccessConfig(allowedIds = []) {
  const allowed = new Set((Array.isArray(allowedIds) ? allowedIds : []).map(String));
  const preferred = DEFAULT_QUICK_ACCESS_IDS.filter((id) => !allowed.size || allowed.has(id));
  const fallback = (Array.isArray(allowedIds) ? allowedIds : []).filter((id) => !preferred.includes(id));
  return {
    version: 9,
    items: [...preferred, ...fallback].slice(0, QUICK_ACCESS_MAX_ITEMS),
    recent: [],
    workspace: 'all',
    mode: 'auto',
    size: 'm',
    motion: 'fluid',
    density: 'comfortable',
    side: 'left',
    theme: 'glass',
    hoverDelay: 220,
    labels: true,
    workflows: [],
    timeAware: true,
    spatialMemory: true,
    contextMemory: true,
    pinned: false,
    updatedAt: 0,
  };
}

export function normalizeQuickAccessConfig(raw, allowedIds = []) {
  const defaults = createDefaultQuickAccessConfig(allowedIds);
  let source = raw;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch { source = null; }
  }
  if (source && typeof source === 'object' && !Array.isArray(source) && source.config) source = source.config;
  source = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const hasExplicitItems = Array.isArray(source.items) || typeof source.items === 'string';
  const items = cleanIds(source.items, allowedIds, QUICK_ACCESS_MAX_ITEMS);
  const recent = cleanIds(source.recent, allowedIds, QUICK_ACCESS_RECENT_MAX);
  const legacyPinned = Boolean(source.pinned);
  const requestedMode = String(source.mode || '').trim().toLowerCase();
  const mode = QUICK_ACCESS_MODES.includes(requestedMode) ? requestedMode : (legacyPinned ? 'pin' : 'auto');
  const requestedWorkspace = String(source.workspace || '').trim().toLowerCase();
  const workspace = QUICK_ACCESS_WORKSPACES.includes(requestedWorkspace) ? requestedWorkspace : 'all';
  const requestedSize = String(source.size || '').trim().toLowerCase();
  const size = QUICK_ACCESS_SIZES.includes(requestedSize) ? requestedSize : 'm';
  const requestedMotion = String(source.motion || '').trim().toLowerCase();
  const motion = QUICK_ACCESS_MOTIONS.includes(requestedMotion) ? requestedMotion : 'fluid';
  const requestedDensity = String(source.density || '').trim().toLowerCase();
  const density = QUICK_ACCESS_DENSITIES.includes(requestedDensity) ? requestedDensity : 'comfortable';
  const requestedSide = String(source.side || '').trim().toLowerCase();
  const side = QUICK_ACCESS_SIDES.includes(requestedSide) ? requestedSide : 'left';
  const requestedTheme = String(source.theme || '').trim().toLowerCase();
  const theme = QUICK_ACCESS_THEMES.includes(requestedTheme) ? requestedTheme : 'glass';
  const hoverDelay = Math.max(80, Math.min(700, Number(source.hoverDelay) || 220));
  const labels = source.labels !== false;
  const workflows = cleanWorkflows(source.workflows, allowedIds);
  const timeAware = source.timeAware !== false;
  const spatialMemory = source.spatialMemory !== false;
  const contextMemory = source.contextMemory !== false;
  return {
    version: 9,
    items: (hasExplicitItems ? items : defaults.items).slice(0, QUICK_ACCESS_MAX_ITEMS),
    recent,
    workspace,
    mode,
    size,
    motion,
    density,
    side,
    theme,
    hoverDelay,
    labels,
    workflows,
    timeAware,
    spatialMemory,
    contextMemory,
    pinned: mode === 'pin',
    updatedAt: Number(source.updatedAt) || 0,
  };
}

function emit(config) {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent(QUICK_ACCESS_EVENT, { detail: config })); } catch { /* optional */ }
}

export function loadQuickAccessConfig(user, allowedIds = []) {
  const raw = safeGet(storageKey(user));
  if (!raw) return createDefaultQuickAccessConfig(allowedIds);
  try { return normalizeQuickAccessConfig(JSON.parse(raw), allowedIds); }
  catch { return createDefaultQuickAccessConfig(allowedIds); }
}

export function saveQuickAccessConfig(user, config, allowedIds = []) {
  const normalized = normalizeQuickAccessConfig({ ...config, updatedAt: Date.now() }, allowedIds);
  safeSet(storageKey(user), JSON.stringify(normalized));
  emit(normalized);
  return normalized;
}

function cloudUserId(user) {
  const id = String(user?.id || user?.authId || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : '';
}

export async function loadQuickAccessConfigFromCloud(user, allowedIds = []) {
  const local = loadQuickAccessConfig(user, allowedIds);
  const userId = cloudUserId(user);
  if (!userId || !isSupabaseConfigured || !supabase) return { config: local, cloud: false, source: 'local' };

  try {
    const { data, error } = await supabase
      .from('bes_quick_access_settings')
      .select('config, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.config) return { config: local, cloud: false, source: 'local-empty-cloud' };

    const cloud = normalizeQuickAccessConfig(data.config, allowedIds);
    const chosen = Number(cloud.updatedAt || 0) >= Number(local.updatedAt || 0) ? cloud : local;
    safeSet(storageKey(user), JSON.stringify(chosen));
    emit(chosen);
    return { config: chosen, cloud: chosen === cloud, source: chosen === cloud ? 'cloud' : 'local-newer' };
  } catch (error) {
    return { config: local, cloud: false, source: 'local-fallback', error };
  }
}

export async function saveQuickAccessConfigToCloud(user, config, allowedIds = []) {
  const normalized = saveQuickAccessConfig(user, config, allowedIds);
  const userId = cloudUserId(user);
  if (!userId || !isSupabaseConfigured || !supabase) return { config: normalized, cloud: false, source: 'local' };

  try {
    const { error } = await supabase
      .from('bes_quick_access_settings')
      .upsert({
        user_id: userId,
        config: normalized,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (error) throw error;
    return { config: normalized, cloud: true, source: 'cloud' };
  } catch (error) {
    return { config: normalized, cloud: false, source: 'local-fallback', error };
  }
}

export function subscribeQuickAccessConfig(user, allowedIds, callback) {
  if (typeof window === 'undefined') return () => {};
  const onLocal = (event) => callback?.(normalizeQuickAccessConfig(event?.detail, allowedIds));
  const onStorage = (event) => {
    if (event?.key !== storageKey(user)) return;
    callback?.(loadQuickAccessConfig(user, allowedIds));
  };
  window.addEventListener(QUICK_ACCESS_EVENT, onLocal);
  window.addEventListener('storage', onStorage);

  const userId = cloudUserId(user);
  let channel = null;
  if (userId && isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel(`bes-quick-access-${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bes_quick_access_settings',
          filter: `user_id=eq.${userId}`,
        }, (payload) => {
          const next = normalizeQuickAccessConfig(payload?.new?.config, allowedIds);
          safeSet(storageKey(user), JSON.stringify(next));
          callback?.(next);
        })
        .subscribe();
    } catch {
      channel = null;
    }
  }

  return () => {
    window.removeEventListener(QUICK_ACCESS_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
    if (channel && supabase) {
      try { supabase.removeChannel(channel); } catch { /* cleanup is best effort */ }
    }
  };
}
