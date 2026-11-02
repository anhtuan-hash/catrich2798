import { useSyncExternalStore } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const TABLE = 'bes_navigation_theme_settings';
const KEY = 'bes-dashboard-scrapbook-v1';
const EMPTY = Object.freeze({ enabled: false, verified: false, updatedAt: '' });
// Browser storage is a refresh signal, never authority to enable a global theme.
let state = EMPTY;
let pending = null;
let stop = null;
let generation = 0;
const listeners = new Set();

function accept(row) {
  if (typeof row?.dashboard_scrapbook_enabled !== 'boolean') return false;
  const updatedAt = String(row.updated_at || '');
  if (state.updatedAt && (!Number.isFinite(Date.parse(updatedAt)) || Date.parse(updatedAt) < Date.parse(state.updatedAt))) return false;
  const next = { enabled: row.dashboard_scrapbook_enabled, verified: true, updatedAt };
  if (next.enabled === state.enabled && next.verified === state.verified && next.updatedAt === state.updatedAt) return true;
  state = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage is optional */ }
  listeners.forEach(listener => listener());
  return true;
}

export function getDashboardScrapbookTheme() { return state; }

export async function loadDashboardScrapbookTheme() {
  const client = getRuntimeClient();
  if (!client) return { ok: false, error: 'Chưa kết nối máy chủ.' };
  if (pending) return pending;
  const revision = generation;
  pending = (async () => {
    try {
      const { data, error } = await client.from(TABLE)
        .select('dashboard_scrapbook_enabled,updated_at').eq('id', true).maybeSingle();
      if (error) throw error;
      if (typeof data?.dashboard_scrapbook_enabled !== 'boolean') throw new Error('Chưa có cấu hình Dashboard Scrapbook trên máy chủ.');
      if (revision === generation) accept(data);
      return { ok: true, settings: state };
    } catch (error) {
      return { ok: false, error: error?.message || 'Không tải được giao diện Dashboard.' };
    } finally { pending = null; }
  })();
  return pending;
}

export async function saveDashboardScrapbookTheme(enabled) {
  const client = getRuntimeClient();
  if (!client || typeof enabled !== 'boolean') return { ok: false, error: 'Không thể lưu cấu hình.' };
  try {
    const { data, error } = await client.rpc('bes_set_dashboard_scrapbook_enabled', { p_enabled: enabled });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.dashboard_scrapbook_enabled !== enabled) throw new Error('Máy chủ chưa xác nhận thay đổi.');
    generation++;
    if (!accept(row)) throw new Error('Cấu hình đã thay đổi ở phiên khác. Vui lòng tải lại.');
    return { ok: true, settings: state };
  } catch (error) {
    return { ok: false, error: error?.message || 'Không lưu được giao diện Dashboard.' };
  }
}

function subscribe(listener) {
  listeners.add(listener);
  if (!stop && typeof window !== 'undefined') {
    const refresh = () => { if (!document.hidden) void loadDashboardScrapbookTheme(); };
    const storage = event => { if (event.key === KEY || event.key === null) refresh(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', refresh);
    const unsubscribe = subscribeTable({
      key: 'dashboard-scrapbook-v1', table: TABLE,
      onChange: payload => {
        if (typeof payload?.new?.dashboard_scrapbook_enabled === 'boolean') {
          const previous = state;
          accept(payload.new);
          if (state !== previous) generation++;
        } else refresh();
      },
    });
    const timer = window.setInterval(refresh, 30000);
    stop = () => {
      unsubscribe?.(); window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', refresh);
    };
    refresh();
  }
  return () => { listeners.delete(listener); if (!listeners.size) { stop?.(); stop = null; } };
}

export function useDashboardScrapbookTheme() {
  return useSyncExternalStore(subscribe, getDashboardScrapbookTheme, () => EMPTY);
}
