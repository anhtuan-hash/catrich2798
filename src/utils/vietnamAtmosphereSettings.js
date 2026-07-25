export * from './vietnamAtmosphereSettingsBase.js';

import { isSupabaseConfigured, supabase } from './supabase.js';
import * as base from './vietnamAtmosphereSettingsBase.js';

const TABLE = 'vietnam_atmosphere_settings';
const WORKSPACE_KEY = 'english-hub';
const EVENT_NAME = 'bes-vietnam-atmosphere-settings-updated';
const CACHE_KEY = 'bes-vietnam-atmosphere-settings-v2';
const CLOUD_CACHE_TTL = 6 * 60 * 60 * 1000;
let cachedSnapshot = null;
let cachedAt = 0;
let loadPromise = null;
let subscriptionSerial = 0;

function remember(snapshot) {
  cachedSnapshot = base.normalizeVietnamAtmosphereSettings(snapshot);
  cachedAt = Date.now();
  return cachedSnapshot;
}

function readFreshCache() {
  if (!cachedSnapshot || Date.now() - cachedAt >= CLOUD_CACHE_TTL) return null;
  return cachedSnapshot;
}

function writeLocal(snapshot) {
  const normalized = remember(snapshot);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(normalized)); } catch { /* optional cache */ }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
  }
  return normalized;
}

function snapshotFromRealtimeRow(row = {}) {
  return base.normalizeVietnamAtmosphereSettings({
    enabled: row.enabled,
    showBuiltIns: row.show_built_ins,
    opacity: row.opacity,
    speed: row.speed,
    density: row.density,
    images: row.images,
    updatedAt: row.updated_at || row.created_at,
    updatedBy: row.updated_by_email || row.updated_by || '',
    source: 'supabase-realtime',
    status: 'synced',
    error: '',
    setupRequired: false,
  });
}

export async function loadVietnamAtmosphereSettings({ force = false } = {}) {
  const cached = force ? null : readFreshCache();
  if (cached) return cached;
  if (!force && loadPromise) return loadPromise;

  let task;
  task = base.loadVietnamAtmosphereSettings()
    .then(remember)
    .finally(() => {
      if (loadPromise === task) loadPromise = null;
    });
  loadPromise = task;
  return task;
}

function realtimeTopic() {
  subscriptionSerial += 1;
  return `bes-vietnam-atmosphere-optimized-${Date.now().toString(36)}-${subscriptionSerial.toString(36)}`;
}

export function subscribeVietnamAtmosphereSettings(listener) {
  if (typeof window === 'undefined') return () => {};
  const safeListener = typeof listener === 'function' ? listener : () => {};

  const localHandler = (event) => {
    const snapshot = remember(event?.detail || base.readVietnamAtmosphereLocal());
    safeListener(snapshot);
  };
  const storageHandler = (event) => {
    if (event.key !== CACHE_KEY) return;
    const snapshot = remember(base.readVietnamAtmosphereLocal());
    safeListener(snapshot);
  };
  window.addEventListener(EVENT_NAME, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel(realtimeTopic())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: TABLE,
          filter: `workspace_key=eq.${WORKSPACE_KEY}`,
        }, (payload) => {
          const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
          if (row?.workspace_key === WORKSPACE_KEY) {
            const snapshot = writeLocal(snapshotFromRealtimeRow(row));
            safeListener(snapshot);
            return;
          }
          if (payload?.eventType === 'DELETE') {
            const snapshot = writeLocal({
              ...base.DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS,
              source: 'supabase-empty',
              status: 'synced',
            });
            safeListener(snapshot);
            return;
          }
          cachedSnapshot = null;
          cachedAt = 0;
          loadVietnamAtmosphereSettings({ force: true }).then(safeListener).catch(() => null);
        })
        .subscribe();
    } catch (error) {
      console.warn('[Vietnam atmosphere] optimized realtime subscription failed', error);
    }
  }

  loadVietnamAtmosphereSettings().then(safeListener).catch(() => null);

  return () => {
    window.removeEventListener(EVENT_NAME, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) supabase.removeChannel(channel).catch(() => null);
  };
}
