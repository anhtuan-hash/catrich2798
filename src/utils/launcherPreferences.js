import { isSupabaseConfigured, supabase } from './supabase.js';

export const LAUNCHER_CONFIG_KEY = 'bes-launcher-config-v3';
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
  'worksheet-factory',
  'textlab-activities',
  'exam-studio',
  'reading-studio',
];

const DEFAULT_NAV = [
  'route:home',
  'route:apps',
  'route:news',
  'route:games',
  'route:department',
  'route:homeroom',
  'route:library',
  'route:resource-library',
];

export function launcherItemId(item) {
  if (!item) return '';
  return String(item.slug || item.route || '').trim();
}

export function launcherNavId(item) {
  if (!item) return '';
  if (item.route) return `route:${item.route}`;
  return item.slug ? `tool:${item.slug}` : '';
}

export function createDefaultLauncherConfig(itemIds = []) {
  return {
    version: 3,
    order: [...new Set(itemIds.filter(Boolean))],
    pinned: DEFAULT_PINNED.filter((id) => itemIds.length === 0 || itemIds.includes(id)),
    hidden: [],
    nav: [...DEFAULT_NAV],
    groups: DEFAULT_LAUNCHER_GROUPS.map((group) => ({ ...group })),
    assignments: {},
    updatedAt: Date.now(),
  };
}

function cleanIdList(value, allowed = null) {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  return list.map((item) => String(item || '').trim()).filter((item) => {
    if (!item || seen.has(item)) return false;
    if (allowed && !allowed.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function cleanGroups(groups) {
  const source = Array.isArray(groups) && groups.length ? groups : DEFAULT_LAUNCHER_GROUPS;
  const seen = new Set();
  return source.map((group, index) => {
    const rawId = String(group?.id || `group-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const id = rawId && !seen.has(rawId) ? rawId : `group-${index + 1}-${Date.now().toString(36)}`;
    seen.add(id);
    return {
      id,
      label: String(group?.label || group?.labelVi || `Group ${index + 1}`).trim().slice(0, 40),
      labelVi: String(group?.labelVi || group?.label || `Nhóm ${index + 1}`).trim().slice(0, 40),
      accent: /^#[0-9a-f]{6}$/i.test(String(group?.accent || '')) ? group.accent : DEFAULT_LAUNCHER_GROUPS[index % DEFAULT_LAUNCHER_GROUPS.length].accent,
    };
  }).slice(0, 16);
}

export function normalizeLauncherConfig(raw, itemIds = []) {
  const defaults = createDefaultLauncherConfig(itemIds);
  const allowed = new Set(itemIds);
  const source = raw && typeof raw === 'object' ? raw : {};
  const groups = cleanGroups(source.groups);
  const groupIds = new Set(groups.map((group) => group.id));
  const order = cleanIdList(source.order, itemIds.length ? allowed : null);
  itemIds.forEach((id) => { if (!order.includes(id)) order.push(id); });
  const assignments = {};
  Object.entries(source.assignments || {}).forEach(([itemId, groupId]) => {
    if ((!itemIds.length || allowed.has(itemId)) && groupIds.has(String(groupId))) assignments[itemId] = String(groupId);
  });

  return {
    version: 3,
    order,
    pinned: cleanIdList(source.pinned ?? defaults.pinned, itemIds.length ? allowed : null).slice(0, 12),
    hidden: cleanIdList(source.hidden, itemIds.length ? allowed : null),
    nav: cleanIdList(source.nav ?? defaults.nav).slice(0, 12),
    groups,
    assignments,
    updatedAt: Number(source.updatedAt) || Date.now(),
  };
}

function persistLocal(config) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LAUNCHER_CONFIG_KEY, JSON.stringify(config)); } catch { /* local cache is optional */ }
}

function emitLauncherUpdate(config) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LAUNCHER_UPDATED_EVENT, { detail: config }));
}

export function loadLauncherConfig(itemIds = []) {
  if (typeof window === 'undefined') return createDefaultLauncherConfig(itemIds);
  try {
    const saved = JSON.parse(window.localStorage.getItem(LAUNCHER_CONFIG_KEY) || 'null');
    return normalizeLauncherConfig(saved, itemIds);
  } catch {
    return createDefaultLauncherConfig(itemIds);
  }
}

export function saveLauncherConfig(config, itemIds = []) {
  const normalized = normalizeLauncherConfig({ ...config, updatedAt: Date.now() }, itemIds);
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
    if (!data?.config) return { config: local, source: 'local-empty-cloud', cloud: false, error: null };
    const normalized = normalizeLauncherConfig(data.config, itemIds);
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
  const localHandler = (event) => {
    const raw = event?.detail || loadLauncherConfig(itemIds);
    callback?.(normalizeLauncherConfig(raw, itemIds));
  };
  const storageHandler = (event) => {
    if (event?.key && event.key !== LAUNCHER_CONFIG_KEY) return;
    callback?.(loadLauncherConfig(itemIds));
  };
  window.addEventListener(LAUNCHER_UPDATED_EVENT, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (isSupabaseConfigured && supabase) {
    channel = supabase
      .channel('bes-launcher-settings-v10831')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bes_launcher_settings', filter: `id=eq.${LAUNCHER_CLOUD_ROW_ID}`,
      }, (payload) => {
        const raw = payload?.new?.config;
        if (!raw) return;
        const normalized = normalizeLauncherConfig(raw, itemIds);
        persistLocal(normalized);
        emitLauncherUpdate(normalized);
      })
      .subscribe();
  }

  return () => {
    window.removeEventListener(LAUNCHER_UPDATED_EVENT, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) supabase.removeChannel(channel);
  };
}
