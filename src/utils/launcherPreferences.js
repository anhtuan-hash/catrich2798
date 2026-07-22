import { isSupabaseConfigured, supabase } from './supabase.js';

export const LAUNCHER_CONFIG_KEY = 'bes-launcher-config-v4';
export const LAUNCHER_UPDATED_EVENT = 'bes-launcher-config-updated';
export const LAUNCHER_CLOUD_ROW_ID = 'default';

export const DEFAULT_LAUNCHER_GROUPS = [
  { id: 'plan', label: 'Planning', labelVi: 'Soạn bài', accent: '#E86D1F' },
  { id: 'create', label: 'Creation', labelVi: 'Tạo học liệu', accent: '#F05A7E' },
  { id: 'assess', label: 'Assessment', labelVi: 'Kiểm tra', accent: '#123C69' },
  { id: 'manage', label: 'Workspace', labelVi: 'Quản lý', accent: '#3B4CCA' },
];

const DEFAULT_PINNED = [
  'resource-library-hub',
  'lesson-plan-ai',
  'textlab-activities',
  'exam-studio',
  'reading-studio',
];

const RETIRED_LAUNCHER_IDS = new Set([
  'tool:worksheet-factory',
  'worksheet-factory',
  'tool:smart-id',
  'smart-id',
  'tool:speaking-studio',
  'speaking-studio',
  'tool:english-lesson-integration',
  'english-lesson-integration',
  'tool:grammar-builder',
  'grammar-builder',
  'tool:writing-studio',
  'writing-studio',
  'tool:pronunciation-coach',
  'pronunciation-coach',
  'route:ai-workspace',
  'route:classroom-delivery',
  'route:learning-intelligence',
]);

const DEFAULT_NAV = [
  'route:home',
  'route:apps',
  'route:news',
  'route:games',
  'route:homeroom',
  'route:library',
  'route:resource-library',
];

let realtimeSubscriptionSequence = 0;

function nextLauncherRealtimeTopic() {
  realtimeSubscriptionSequence += 1;
  return `bes-launcher-settings-v1167-${Date.now().toString(36)}-${realtimeSubscriptionSequence}`;
}

function safeStorageGet(key) {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage?.getItem(key) ?? null; } catch { return null; }
}

function safeStorageSet(key, value) {
  if (typeof window === 'undefined') return false;
  try { window.localStorage?.setItem(key, value); return true; } catch { return false; }
}

function decodeConfig(value) {
  let current = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (typeof current !== 'string') break;
    try { current = JSON.parse(current); } catch { return null; }
  }
  if (current && typeof current === 'object' && !Array.isArray(current) && current.config && typeof current.config === 'object') {
    current = current.config;
  }
  return current && typeof current === 'object' && !Array.isArray(current) ? current : null;
}

export function launcherItemId(item) {
  if (!item || item.hideFromLauncher) return '';
  return String(item.slug || item.route || '').trim();
}

export function launcherNavId(item) {
  if (!item || item.hideFromLauncher) return '';
  if (item.route) return `route:${String(item.route).trim()}`;
  return item.slug ? `tool:${String(item.slug).trim()}` : '';
}

export function createDefaultLauncherConfig(itemIds = []) {
  const safeItemIds = Array.isArray(itemIds) ? itemIds : [];
  return {
    schemaVersion: 5,
    version: 5,
    order: [...new Set(safeItemIds.map((id) => String(id || '').trim()).filter(Boolean))],
    pinned: DEFAULT_PINNED.filter((id) => safeItemIds.length === 0 || safeItemIds.includes(id)),
    hidden: [],
    nav: [...DEFAULT_NAV],
    groups: DEFAULT_LAUNCHER_GROUPS.map((group) => ({ ...group })),
    assignments: {},
    launcherStyle: 'radial',
    updatedAt: Date.now(),
  };
}

function cleanIdList(value, allowed = null) {
  let list = value;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { list = list.split(','); }
  }
  list = Array.isArray(list) ? list : [];
  list = list.filter((item) => !RETIRED_LAUNCHER_IDS.has(String(item || '').trim()));
  const seen = new Set();
  return list.map((item) => String(item || '').trim()).filter((item) => {
    if (!item || seen.has(item)) return false;
    if (allowed && !allowed.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function cleanGroups(groups) {
  let source = groups;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch { source = null; }
  }
  source = Array.isArray(source) && source.length ? source : DEFAULT_LAUNCHER_GROUPS;
  const seen = new Set();
  return source.slice(0, 16).map((group, index) => {
    const safeGroup = group && typeof group === 'object' ? group : {};
    const rawId = String(safeGroup.id || `group-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    let id = rawId || `group-${index + 1}`;
    if (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    const fallback = DEFAULT_LAUNCHER_GROUPS[index % DEFAULT_LAUNCHER_GROUPS.length];
    return {
      id,
      label: String(safeGroup.label || safeGroup.labelVi || `Group ${index + 1}`).trim().slice(0, 40),
      labelVi: String(safeGroup.labelVi || safeGroup.label || `Nhóm ${index + 1}`).trim().slice(0, 40),
      accent: /^#[0-9a-f]{6}$/i.test(String(safeGroup.accent || '')) ? String(safeGroup.accent) : fallback.accent,
    };
  });
}

export function normalizeLauncherConfig(raw, itemIds = []) {
  const safeItemIds = Array.isArray(itemIds) ? itemIds.map((id) => String(id || '').trim()).filter(Boolean) : [];
  const defaults = createDefaultLauncherConfig(safeItemIds);
  const allowed = new Set(safeItemIds);
  const source = decodeConfig(raw) || {};
  const groups = cleanGroups(source.groups);
  const groupIds = new Set(groups.map((group) => group.id));
  const order = cleanIdList(source.order, safeItemIds.length ? allowed : null);
  safeItemIds.forEach((id) => { if (!order.includes(id)) order.push(id); });

  const assignments = {};
  const rawAssignments = source.assignments && typeof source.assignments === 'object' && !Array.isArray(source.assignments)
    ? source.assignments
    : {};
  Object.entries(rawAssignments).forEach(([itemId, groupId]) => {
    const cleanItemId = String(itemId || '').trim();
    const cleanGroupId = String(groupId || '').trim();
    if ((!safeItemIds.length || allowed.has(cleanItemId)) && groupIds.has(cleanGroupId)) assignments[cleanItemId] = cleanGroupId;
  });

  const launcherStyle = ['radial', 'water'].includes(String(source.launcherStyle || '').trim())
    ? String(source.launcherStyle).trim()
    : defaults.launcherStyle;

  return {
    schemaVersion: 5,
    version: 5,
    order,
    pinned: cleanIdList(source.pinned ?? defaults.pinned, safeItemIds.length ? allowed : null).slice(0, 12),
    hidden: cleanIdList(source.hidden, safeItemIds.length ? allowed : null),
    nav: cleanIdList(source.nav ?? defaults.nav).slice(0, 12),
    groups,
    assignments,
    launcherStyle,
    updatedAt: Number(source.updatedAt) || Date.now(),
  };
}

function persistLocal(config) {
  return safeStorageSet(LAUNCHER_CONFIG_KEY, JSON.stringify(config));
}

function emitLauncherUpdate(config) {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent(LAUNCHER_UPDATED_EVENT, { detail: config })); } catch { /* optional */ }
}

export function loadLauncherConfig(itemIds = []) {
  const saved = safeStorageGet(LAUNCHER_CONFIG_KEY);
  if (!saved) return createDefaultLauncherConfig(itemIds);
  try { return normalizeLauncherConfig(JSON.parse(saved), itemIds); }
  catch {
    const clean = createDefaultLauncherConfig(itemIds);
    persistLocal(clean);
    return clean;
  }
}

export function saveLauncherConfig(config, itemIds = []) {
  const normalized = normalizeLauncherConfig({ ...(decodeConfig(config) || {}), updatedAt: Date.now() }, itemIds);
  persistLocal(normalized);
  emitLauncherUpdate(normalized);
  return normalized;
}

export function resetLauncherConfig(itemIds = []) {
  return saveLauncherConfig(createDefaultLauncherConfig(itemIds), itemIds);
}

export async function loadLauncherConfigFromCloud(itemIds = []) {
  const local = loadLauncherConfig(itemIds);
  if (!isSupabaseConfigured || !supabase) return { config: local, source: 'local', cloud: false, error: null };
  try {
    const { data, error } = await supabase
      .from('bes_launcher_settings')
      .select('config, updated_at')
      .eq('id', LAUNCHER_CLOUD_ROW_ID)
      .maybeSingle();
    if (error) throw error;
    const decoded = decodeConfig(data?.config);
    if (!decoded) return { config: local, source: 'local-empty-cloud', cloud: false, error: null };
    const normalized = normalizeLauncherConfig(decoded, itemIds);
    persistLocal(normalized);
    emitLauncherUpdate(normalized);
    return { config: normalized, source: 'cloud', cloud: true, error: null };
  } catch (error) {
    return { config: local, source: 'local-fallback', cloud: false, error };
  }
}

export async function saveLauncherConfigToCloud(config, itemIds = []) {
  const normalized = saveLauncherConfig(config, itemIds);
  if (!isSupabaseConfigured || !supabase) return { config: normalized, source: 'local', cloud: false, error: null };
  try {
    const { error } = await supabase
      .from('bes_launcher_settings')
      .upsert({ id: LAUNCHER_CLOUD_ROW_ID, config: normalized }, { onConflict: 'id' });
    if (error) throw error;
    return { config: normalized, source: 'cloud', cloud: true, error: null };
  } catch (error) {
    return { config: normalized, source: 'local-fallback', cloud: false, error };
  }
}

export async function resetLauncherConfigToCloud(itemIds = []) {
  return saveLauncherConfigToCloud(createDefaultLauncherConfig(itemIds), itemIds);
}

export function subscribeLauncherConfig(callback, itemIds = []) {
  if (typeof window === 'undefined') return () => {};
  let active = true;
  const safeCallback = (raw) => {
    if (!active) return;
    try { callback?.(normalizeLauncherConfig(raw, itemIds)); } catch (error) { console.error('[Launcher] subscriber failed', error); }
  };
  const localHandler = (event) => safeCallback(event?.detail || loadLauncherConfig(itemIds));
  const storageHandler = (event) => {
    if (event?.key && event.key !== LAUNCHER_CONFIG_KEY) return;
    safeCallback(loadLauncherConfig(itemIds));
  };
  window.addEventListener(LAUNCHER_UPDATED_EVENT, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel(nextLauncherRealtimeTopic())
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'bes_launcher_settings', filter: `id=eq.${LAUNCHER_CLOUD_ROW_ID}`,
        }, (payload) => {
          const decoded = decodeConfig(payload?.new?.config);
          if (!decoded) return;
          const normalized = normalizeLauncherConfig(decoded, itemIds);
          persistLocal(normalized);
          safeCallback(normalized);
        })
        .subscribe();
    } catch (error) {
      console.warn('[Launcher] realtime subscription unavailable', error);
      channel = null;
    }
  }

  return () => {
    active = false;
    window.removeEventListener(LAUNCHER_UPDATED_EVENT, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) {
      const staleChannel = channel;
      channel = null;
      Promise.resolve(supabase.removeChannel(staleChannel)).catch(() => {});
    }
  };
}
