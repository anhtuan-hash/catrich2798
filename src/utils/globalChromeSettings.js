import { useEffect, useState } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

// Shared, public-to-authenticated presentation flags. No account-specific overrides.
const TABLE = 'brian_global_display_settings';
const STORAGE_KEY = 'bes-global-chrome-settings-v1';
const EVENT_NAME = 'bes-global-chrome-settings-updated';
const DEFAULTS = Object.freeze({ showActionDock: true, showNewswire: true, updatedAt: '' });

function readCache() {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved.showActionDock !== 'boolean' || typeof saved.showNewswire !== 'boolean') {
      return { ...DEFAULTS };
    }
    return { showActionDock: saved.showActionDock, showNewswire: saved.showNewswire, updatedAt: String(saved.updatedAt || '') };
  } catch {
    return { ...DEFAULTS };
  }
}

let current = readCache();
let pendingLoad = null;

export function getGlobalChromeSettings() {
  return { ...current };
}

function publish(next, { force = false } = {}) {
  if (!next) return current;
  const updatedAt = String(next.updatedAt || '');
  // A slow fetch must never overwrite a more recent administrator change.
  if (!force && updatedAt && current.updatedAt && Date.parse(updatedAt) < Date.parse(current.updatedAt)) return current;
  const normalized = {
    showActionDock: next.showActionDock !== false,
    showNewswire: next.showNewswire !== false,
    updatedAt: updatedAt || current.updatedAt,
  };
  if (Object.keys(normalized).every((key) => current[key] === normalized[key])) return current;
  current = normalized;
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* cache optional */ }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: getGlobalChromeSettings() }));
  }
  return current;
}

function fromRow(row) {
  return {
    showActionDock: row?.show_action_dock !== false,
    showNewswire: row?.show_newswire !== false,
    updatedAt: String(row?.updated_at || ''),
  };
}

export async function loadGlobalChromeSettings() {
  const client = getRuntimeClient();
  if (!client) return { ok: false, message: 'Supabase is not configured.', settings: getGlobalChromeSettings() };
  if (pendingLoad) return pendingLoad;
  pendingLoad = (async () => {
    try {
      const { data, error } = await client
        .from(TABLE).select('show_action_dock,show_newswire,updated_at').eq('id', true).maybeSingle();
      if (error) return { ok: false, message: error.message, settings: getGlobalChromeSettings() };
      if (!data) return { ok: false, message: 'Global display settings are missing.', settings: getGlobalChromeSettings() };
      return { ok: true, settings: publish(fromRow(data)) };
    } catch (error) {
      return { ok: false, message: error?.message || 'Could not load display settings.', settings: getGlobalChromeSettings() };
    } finally {
      pendingLoad = null;
    }
  })();
  return pendingLoad;
}

export async function saveGlobalChromeSetting(key, visible) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, message: 'Chưa kết nối Supabase. Không thể cập nhật toàn hệ thống.' };
  if (!['showActionDock', 'showNewswire'].includes(key) || typeof visible !== 'boolean') {
    return { ok: false, message: 'Giá trị cài đặt không hợp lệ.' };
  }
  // The SECURITY DEFINER RPC authorizes Admin/TTCM on the server and modifies
  // only these two columns. TTCM cannot alter the admin-only subtitle setting.
  const args = key === 'showActionDock'
    ? { p_show_action_dock: visible }
    : { p_show_newswire: visible };
  try {
    const { data, error } = await client.rpc('bes_set_global_chrome_visibility', args);
    if (error) return { ok: false, message: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: false, message: 'Máy chủ không xác nhận thay đổi.' };
    return { ok: true, settings: publish(fromRow(row), { force: true }) };
  } catch (error) {
    return { ok: false, message: error?.message || 'Không thể lưu cấu hình.' };
  }
}

export function useGlobalChromeSettings(user) {
  const [settings, setSettings] = useState(getGlobalChromeSettings);
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return undefined;
    let alive = true;
    const handleUpdate = (event) => {
      if (alive) setSettings({ ...(event?.detail || getGlobalChromeSettings()) });
    };
    const reload = () => { if (alive) loadGlobalChromeSettings().catch(() => {}); };
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      current = readCache();
      handleUpdate({ detail: current });
      reload();
    };
    const onFocus = () => reload();
    const onVisibility = () => { if (!document.hidden) reload(); };
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    handleUpdate();
    reload();
    const unsubscribe = subscribeTable({
      key: 'global-chrome-visibility',
      table: TABLE,
      onChange: (payload) => {
        const row = payload?.new;
        if (row && typeof row.show_action_dock === 'boolean' && typeof row.show_newswire === 'boolean') {
          publish(fromRow(row));
        } else {
          reload();
        }
      },
    });
    // Reconcile missed Realtime events, without polling on every render.
    const interval = window.setInterval(() => { if (!document.hidden) reload(); }, 60000);
    return () => {
      alive = false;
      unsubscribe?.();
      window.clearInterval(interval);
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id]);
  return settings;
}
