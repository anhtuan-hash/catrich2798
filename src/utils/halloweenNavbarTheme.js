import { useEffect, useState } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const TABLE = 'bes_navigation_theme_settings';
const CACHE_KEY = 'bes-halloween-navbar-v1';
const EVENT = 'bes-halloween-navbar-theme-updated';
const BASE = Object.freeze({ enabled: false, updatedAt: '', verified: false });
let current = readCached();
let loading = null;
let subscriberIndex = 0;

function readCached() {
  if (typeof window === 'undefined') return { ...BASE };
  try {
    const data = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
    return data && typeof data.enabled === 'boolean'
      ? { enabled:data.enabled, updatedAt:String(data.updatedAt || ''), verified:false }
      : { ...BASE };
  } catch { return { ...BASE }; }
}
export function getHalloweenNavbarTheme() { return { ...current }; }

function update(next, force = false) {
  if (!next || typeof next.enabled !== 'boolean') return getHalloweenNavbarTheme();
  const incoming = Date.parse(next.updatedAt || '') || 0;
  const existing = Date.parse(current.updatedAt || '') || 0;
  if (!force && incoming && existing && incoming < existing) return getHalloweenNavbarTheme();
  const normalized = {
    enabled:next.enabled,
    updatedAt:String(next.updatedAt || current.updatedAt || ''),
    verified:true,
  };
  if (Object.keys(normalized).every((key) => normalized[key] === current[key])) return getHalloweenNavbarTheme();
  current = normalized;
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(current)); } catch { /* storage optional */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail:getHalloweenNavbarTheme() }));
  }
  return getHalloweenNavbarTheme();
}

export async function loadHalloweenNavbarTheme() {
  const client = getRuntimeClient();
  if (!client) return { ok:false, message:'Chưa kết nối Supabase.', settings:getHalloweenNavbarTheme() };
  if (loading) return loading;
  loading = (async () => {
    try {
      const { data, error } = await client.from(TABLE)
        .select('halloween_enabled,updated_at').eq('id',true).maybeSingle();
      if (error) return { ok:false, message:error.message, settings:getHalloweenNavbarTheme() };
      if (!data || typeof data.halloween_enabled !== 'boolean')
        return { ok:false, message:'Không tìm thấy cấu hình giao diện.', settings:getHalloweenNavbarTheme() };
      return { ok:true, settings:update({
        enabled:data.halloween_enabled, updatedAt:data.updated_at,
      }) };
    } catch (error) {
      return { ok:false, message:error?.message || 'Không thể đọc giao diện.', settings:getHalloweenNavbarTheme() };
    } finally { loading = null; }
  })();
  return loading;
}

export async function saveHalloweenNavbarTheme(enabled) {
  if (typeof enabled !== 'boolean') return { ok:false, message:'Giá trị không hợp lệ.' };
  const client = getRuntimeClient();
  if (!client) return { ok:false, message:'Chưa kết nối Supabase.' };
  try {
    const { data, error } = await client.rpc('bes_set_halloween_navbar_enabled', { p_enabled:enabled });
    if (error) return { ok:false, message:error.message };
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row.halloween_enabled !== 'boolean')
      return { ok:false, message:'Máy chủ chưa xác nhận thay đổi.' };
    return { ok:true, settings:update({
      enabled:row.halloween_enabled, updatedAt:row.updated_at,
    },true) };
  } catch (error) {
    return { ok:false, message:error?.message || 'Không thể lưu giao diện.' };
  }
}

// This hook intentionally does not depend on authentication. Guests also see
// the same Admin-controlled navbar design as logged-in accounts.
export function useHalloweenNavbarTheme() {
  const [settings, setSettings] = useState(getHalloweenNavbarTheme);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let active = true;
    const sync = (event) => {
      if (active) setSettings({ ...(event?.detail || getHalloweenNavbarTheme()) });
    };
    const refresh = () => { if (active) void loadHalloweenNavbarTheme(); };
    const onStorage = (event) => {
      if (event.key !== CACHE_KEY) return;
      const cached = readCached();
      if (!current.updatedAt || !cached.updatedAt ||
        Date.parse(cached.updatedAt) >= Date.parse(current.updatedAt)) {
        current = cached;
        sync({ detail:cached });
      }
      refresh();
    };
    const onVisibility = () => { if (!document.hidden) refresh(); };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    const key = 'halloween-navbar-theme-' + (++subscriberIndex);
    const unsubscribe = subscribeTable({
      key, table:TABLE,
      onChange: (payload) => {
        const row = payload?.new;
        if (row && typeof row.halloween_enabled === 'boolean')
          update({ enabled:row.halloween_enabled,updatedAt:row.updated_at });
        else refresh();
      },
    });
    const poll = window.setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    sync();
    refresh();
    return () => {
      active = false; unsubscribe?.(); window.clearInterval(poll);
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return settings;
}
