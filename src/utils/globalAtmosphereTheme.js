import { isAdminRole } from './roles.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

// The Vietnam configuration is deliberately stored in its original table.
// This separate record only controls which atmosphere is active and Halloween options.
const TABLE = 'global_atmosphere_theme';
const WORKSPACE = 'english-hub';
const CACHE_KEY = 'bes-global-atmosphere-theme-v1';
const EVENT = 'bes-global-atmosphere-theme-updated';

export const DEFAULT_HALLOWEEN_SETTINGS = Object.freeze({
  enabled: true,
  showBuiltIns: true,
  opacity: 0.18,
  speed: 1,
  density: 10,
});
export const DEFAULT_NOVEMBER_SETTINGS = Object.freeze({
  enabled: true,
  showBuiltIns: true,
  opacity: 0.15,
  speed: 1,
  density: 10,
});
export const DEFAULT_GLOBAL_ATMOSPHERE = Object.freeze({
  activeTheme: 'vietnam',
  halloween: DEFAULT_HALLOWEEN_SETTINGS,
  november: DEFAULT_NOVEMBER_SETTINGS,
  status: 'idle',
  setupRequired: false,
  error: '',
});

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

export function normalizeGlobalAtmosphere(value = {}) {
  const halloween = { ...DEFAULT_HALLOWEEN_SETTINGS, ...(value.halloween || {}) };
  const november = { ...DEFAULT_NOVEMBER_SETTINGS, ...(value.november || {}) };
  return {
    activeTheme: ['vietnam', 'halloween', 'november'].includes(value.activeTheme ?? value.active_theme)
      ? (value.activeTheme ?? value.active_theme) : 'vietnam',
    halloween: {
      enabled: halloween.enabled !== false,
      showBuiltIns: halloween.showBuiltIns !== false && halloween.show_built_ins !== false,
      opacity: clamp(halloween.opacity, 0.03, 0.28, DEFAULT_HALLOWEEN_SETTINGS.opacity),
      speed: clamp(halloween.speed, 0.4, 2.5, DEFAULT_HALLOWEEN_SETTINGS.speed),
      density: Math.round(clamp(halloween.density, 3, 18, DEFAULT_HALLOWEEN_SETTINGS.density)),
    },
    november: {
      enabled: november.enabled !== false,
      showBuiltIns: november.showBuiltIns !== false && november.show_built_ins !== false,
      opacity: clamp(november.opacity, 0.03, 0.28, DEFAULT_NOVEMBER_SETTINGS.opacity),
      speed: clamp(november.speed, 0.4, 2.5, DEFAULT_NOVEMBER_SETTINGS.speed),
      density: Math.round(clamp(november.density, 3, 18, DEFAULT_NOVEMBER_SETTINGS.density)),
    },
    status: String(value.status || 'idle'),
    setupRequired: Boolean(value.setupRequired),
    error: String(value.error || ''),
  };
}

export function readGlobalAtmosphereLocal() {
  if (typeof window === 'undefined') return normalizeGlobalAtmosphere(DEFAULT_GLOBAL_ATMOSPHERE);
  try {
    return normalizeGlobalAtmosphere(JSON.parse(window.localStorage.getItem(CACHE_KEY) || '{}'));
  } catch {
    return normalizeGlobalAtmosphere(DEFAULT_GLOBAL_ATMOSPHERE);
  }
}

function publish(snapshot) {
  const next = normalizeGlobalAtmosphere(snapshot);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* optional cache */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }
  return next;
}

function fromRow(row) {
  if (!row) return normalizeGlobalAtmosphere({ ...DEFAULT_GLOBAL_ATMOSPHERE, status: 'synced' });
  return normalizeGlobalAtmosphere({
    activeTheme: row.active_theme,
    halloween: {
      enabled: row.halloween_enabled,
      showBuiltIns: row.halloween_show_built_ins,
      opacity: row.halloween_opacity,
      speed: row.halloween_speed,
      density: row.halloween_density,
    },
    november: {
      enabled: row.november_enabled,
      showBuiltIns: row.november_show_built_ins,
      opacity: row.november_opacity,
      speed: row.november_speed,
      density: row.november_density,
    },
    status: 'synced',
  });
}

async function readRow() {
  const { data, error } = await supabase.from(TABLE).select('*').eq('workspace_key', WORKSPACE).maybeSingle();
  if (error) throw error;
  return data || null;
}

function describeError(error) {
  const code = String(error?.code || '');
  if (code === '42P01' || code === 'PGRST205' || /schema cache|does not exist/i.test(String(error?.message || ''))) {
    return 'Chưa cài đặt cấu hình chủ đề. Cần áp dụng supabase/global_atmosphere_theme.sql.';
  }
  if (code === '42501' || /row.level security|permission denied/i.test(String(error?.message || ''))) {
    return 'Chỉ quản trị viên được duyệt mới có quyền áp dụng chủ đề.';
  }
  return String(error?.message || 'Không thể đồng bộ cấu hình chủ đề.');
}

export async function loadGlobalAtmosphereTheme() {
  const local = readGlobalAtmosphereLocal();
  if (!isSupabaseConfigured || !supabase) {
    return publish({ ...local, status: 'local', error: 'Chưa kết nối Supabase.' });
  }
  try {
    return publish(fromRow(await readRow()));
  } catch (error) {
    console.warn('[Global atmosphere] Could not read theme settings', error);
    const message = describeError(error);
    return publish({ ...local, status: 'error', error: message, setupRequired: message.includes('supabase/global_atmosphere_theme.sql') });
  }
}

export async function saveGlobalAtmosphereTheme(user, patch) {
  if (!isAdminRole(user?.role)) throw new Error('Chỉ Admin được thay đổi chủ đề toàn hệ thống.');
  if (!isSupabaseConfigured || !supabase) throw new Error('Cần kết nối Supabase để áp dụng toàn hệ thống.');
  const existing = await readRow().catch((error) => { throw new Error(describeError(error)); });
  const current = fromRow(existing);
  const next = normalizeGlobalAtmosphere({
    ...current,
    ...patch,
    halloween: { ...current.halloween, ...(patch?.halloween || {}) },
    november: { ...current.november, ...(patch?.november || {}) },
  });
  const payload = {
    workspace_key: WORKSPACE,
    active_theme: next.activeTheme,
    halloween_enabled: next.halloween.enabled,
    halloween_show_built_ins: next.halloween.showBuiltIns,
    halloween_opacity: next.halloween.opacity,
    halloween_speed: next.halloween.speed,
    halloween_density: next.halloween.density,
    november_enabled: next.november.enabled,
    november_show_built_ins: next.november.showBuiltIns,
    november_opacity: next.november.opacity,
    november_speed: next.november.speed,
    november_density: next.november.density,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'workspace_key' }).select('*').single();
  if (error) throw new Error(describeError(error));
  return publish(fromRow(data));
}

let channelSerial = 0;
export function subscribeGlobalAtmosphereTheme(listener) {
  if (typeof window === 'undefined') return () => {};
  let active = true;
  const safeListener = (data) => { if (active && typeof listener === 'function') listener(data); };
  const onEvent = (event) => safeListener(normalizeGlobalAtmosphere(event.detail || readGlobalAtmosphereLocal()));
  const onStorage = (event) => { if (event.key === CACHE_KEY) safeListener(readGlobalAtmosphereLocal()); };
  window.addEventListener(EVENT, onEvent);
  window.addEventListener('storage', onStorage);
  let channel = null;
  if (isSupabaseConfigured && supabase) {
    channel = supabase.channel(`global-atmosphere-theme-${++channelSerial}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: TABLE, filter: `workspace_key=eq.${WORKSPACE}`,
      }, () => { loadGlobalAtmosphereTheme().catch(() => null); })
      .subscribe();
  }
  return () => {
    active = false;
    window.removeEventListener(EVENT, onEvent);
    window.removeEventListener('storage', onStorage);
    if (channel) supabase.removeChannel(channel);
  };
}
