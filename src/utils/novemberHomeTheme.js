import { useSyncExternalStore } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const KEY = 'bes-november-home-v1';
const TABLE = 'bes_navigation_theme_settings';
const EMPTY = Object.freeze({ enabled: false, avatarUrl: '', verified: false, updatedAt: '' });
let state = EMPTY;
try {
  const cached = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (typeof cached?.enabled === 'boolean') state = { ...EMPTY, ...cached, verified: false };
} catch { /* storage is optional */ }
const listeners = new Set();
let pending = null;
let stop = null;
let generation = 0;

function accept(row) {
  if (typeof row?.november_home_enabled !== 'boolean') return;
  if (Date.parse(row.updated_at) < Date.parse(state.updatedAt)) return;
  const next = { enabled: row.november_home_enabled, avatarUrl: row.november_avatar_url || '', verified: true, updatedAt: row.updated_at || '' };
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage is optional */ }
  listeners.forEach(listener => listener());
}
export function getNovemberHomeTheme() { return state; }
export async function loadNovemberHomeTheme() {
  const client = getRuntimeClient();
  if (!client) return { ok: false, error: 'Chưa kết nối máy chủ.' };
  if (pending) return pending;
  const revision = generation;
  pending = (async () => {
    try {
      const { data, error } = await client.from(TABLE).select('november_home_enabled,november_avatar_url,updated_at').eq('id', true).maybeSingle();
      if (error) throw error;
      if (typeof data?.november_home_enabled !== 'boolean') throw new Error('Chưa có cấu hình chủ đề tháng 11.');
      if (revision === generation) accept(data);
      return { ok: true, settings: state };
    } catch (error) { return { ok: false, error: error.message || 'Không tải được chủ đề.' }; }
    finally { pending = null; }
  })();
  return pending;
}
export async function saveNovemberHomeTheme(enabled) {
  const client = getRuntimeClient();
  if (!client || typeof enabled !== 'boolean') return { ok: false, error: 'Không thể lưu cấu hình.' };
  try {
    const { data, error } = await client.rpc('bes_set_november_home_enabled', { p_enabled: enabled });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.november_home_enabled !== enabled) throw new Error('Máy chủ chưa xác nhận thay đổi.');
    generation++;
    accept(row);
    window.dispatchEvent(new CustomEvent('bes-november-home-confirmed', { detail: { updatedAt: row.updated_at } }));
    window.dispatchEvent(new Event('focus'));
    return { ok: true };
  } catch (error) { return { ok: false, error: error.message || 'Không lưu được chủ đề.' }; }
}
export async function saveNovemberAvatar(url) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, error: 'Chưa kết nối máy chủ.' };
  try {
    const { data, error } = await client.rpc('bes_set_november_avatar', { p_url: url });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.november_avatar_url !== url) throw new Error('Máy chủ chưa xác nhận ảnh.');
    generation++;
    accept(row);
    return { ok: true };
  } catch (error) { return { ok: false, error: error.message || 'Không lưu được ảnh.' }; }
}
function subscribe(listener) {
  listeners.add(listener);
  if (!stop && typeof window !== 'undefined') {
    const refresh = () => { if (!document.hidden) void loadNovemberHomeTheme(); };
    const storage = event => { if (event.key === KEY) refresh(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', refresh);
    const unsubscribe = subscribeTable({ key: 'november-home-v1', table: TABLE, onChange: payload => {
      if (typeof payload?.new?.november_home_enabled === 'boolean') { generation++; accept(payload.new); }
      else refresh();
    } });
    const timer = window.setInterval(refresh, 30000);
    stop = () => {
      unsubscribe?.(); window.clearInterval(timer);
      window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh);
      window.removeEventListener('storage', storage); document.removeEventListener('visibilitychange', refresh);
    };
    refresh();
  }
  return () => { listeners.delete(listener); if (!listeners.size) { stop?.(); stop = null; } };
}
export function useNovemberHomeTheme() { return useSyncExternalStore(subscribe, getNovemberHomeTheme, () => EMPTY); }
