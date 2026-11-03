import { useSyncExternalStore } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const TABLE = 'bes_navigation_theme_settings';
const EMPTY = Object.freeze({ enabled: false, verified: false, updatedAt: '' });
const idle = () => () => {};
const getEmpty = () => EMPTY;

// One server-confirmed store per workspace. Storage events only request a fresh read.
export function createScrapbookTheme(slug, label) {
  const column = slug + '_scrapbook_enabled';
  const channel = slug + '-scrapbook-v1';
  const key = 'bes-' + channel;
  const listeners = new Set();
  let state = EMPTY;
  let pending = null;
  let stop = null;
  let generation = 0;

  function accept(row) {
    if (typeof row?.[column] !== 'boolean') return false;
    const updatedAt = String(row.updated_at || '');
    if (state.updatedAt && (!Number.isFinite(Date.parse(updatedAt)) || Date.parse(updatedAt) < Date.parse(state.updatedAt))) return false;
    if (state.verified && row[column] === state.enabled && updatedAt === state.updatedAt) return true;
    state = { enabled: row[column], verified: true, updatedAt };
    try { window.localStorage.setItem(key, JSON.stringify(state)); } catch { /* optional */ }
    listeners.forEach(listener => listener());
    return true;
  }

  async function load() {
    const client = getRuntimeClient();
    if (!client) return { ok: false, error: 'Chưa kết nối máy chủ.' };
    if (pending) return pending;
    const revision = generation;
    pending = (async () => {
      try {
        const { data, error } = await client.from(TABLE).select(column + ',updated_at').eq('id', true).maybeSingle();
        if (error) throw error;
        if (typeof data?.[column] !== 'boolean') throw new Error('Chưa có cấu hình ' + label + ' Scrapbook trên máy chủ.');
        if (revision === generation) accept(data);
        return { ok: true, settings: state };
      } catch (error) {
        return { ok: false, error: error?.message || 'Không tải được giao diện ' + label + '.' };
      }
    })().finally(() => { pending = null; });
    return pending;
  }

  async function save(enabled) {
    const client = getRuntimeClient();
    if (!client || typeof enabled !== 'boolean') return { ok: false, error: 'Không thể lưu cấu hình.' };
    try {
      const { data, error } = await client.rpc('bes_set_' + column, { p_enabled: enabled });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.[column] !== enabled) throw new Error('Máy chủ chưa xác nhận thay đổi.');
      if (!accept(row)) throw new Error('Cấu hình đã thay đổi ở phiên khác. Vui lòng tải lại.');
      generation++;
      return { ok: true, settings: state };
    } catch (error) {
      return { ok: false, error: error?.message || 'Không lưu được giao diện ' + label + '.' };
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    if (!stop && typeof window !== 'undefined') {
      const refresh = () => { if (!document.hidden) void load(); };
      const storage = event => { if (event.key === key || event.key === null) refresh(); };
      window.addEventListener('focus', refresh);
      window.addEventListener('online', refresh);
      window.addEventListener('storage', storage);
      document.addEventListener('visibilitychange', refresh);
      const unsubscribe = subscribeTable({
        key: channel, table: TABLE,
        onChange: payload => {
          const previous = state;
          if (typeof payload?.new?.[column] !== 'boolean') refresh();
          else if (accept(payload.new) && state !== previous) generation++;
        },
      });
      const timer = window.setInterval(refresh, 30000);
      stop = () => {
        unsubscribe?.();
        window.clearInterval(timer);
        window.removeEventListener('focus', refresh);
        window.removeEventListener('online', refresh);
        window.removeEventListener('storage', storage);
        document.removeEventListener('visibilitychange', refresh);
      };
      refresh();
    }
    return () => {
      listeners.delete(listener);
      if (!listeners.size) { stop?.(); stop = null; }
    };
  }

  const get = () => state;
  function useTheme(active = true) {
    return useSyncExternalStore(active ? subscribe : idle, active ? get : getEmpty, getEmpty);
  }
  return { get, load, save, useTheme };
}
