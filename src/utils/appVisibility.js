import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { isAdminRole, normalizeSystemRole, SYSTEM_ROLES } from './roles.js';

const STORAGE_KEY = 'bes-app-visibility-v1132';
const EVENT_NAME = 'bes-app-visibility-change';
const DEFAULT_HIDDEN_ROLES = [SYSTEM_ROLES.DEPARTMENT_HEAD, SYSTEM_ROLES.TEACHER, SYSTEM_ROLES.STUDENT];

function cleanRoles(value) {
  const input = Array.isArray(value) ? value : DEFAULT_HIDDEN_ROLES;
  return [...new Set(input.map((role) => normalizeSystemRole(role, '')).filter(Boolean))];
}

function normalizeRecord(record = {}) {
  return {
    appId: String(record.app_id || record.appId || '').trim(),
    appKind: String(record.app_kind || record.appKind || 'tool').trim(),
    slug: String(record.slug || '').trim(),
    route: String(record.route || '').trim(),
    title: String(record.title || '').trim(),
    titleVi: String(record.title_vi || record.titleVi || '').trim(),
    isHidden: Boolean(record.is_hidden ?? record.isHidden),
    hiddenRoles: cleanRoles(record.hidden_roles || record.hiddenRoles),
    reason: String(record.reason || '').trim(),
    updatedBy: String(record.updated_by || record.updatedBy || '').trim(),
    updatedAt: String(record.updated_at || record.updatedAt || new Date().toISOString()),
  };
}

function normalizeSnapshot(value = {}) {
  const records = {};
  const source = value.records && typeof value.records === 'object' ? value.records : {};
  Object.values(source).forEach((record) => {
    const clean = normalizeRecord(record);
    if (clean.appId) records[clean.appId] = clean;
  });
  return {
    records,
    updatedAt: String(value.updatedAt || new Date().toISOString()),
    source: String(value.source || 'local'),
    error: String(value.error || ''),
  };
}

export function readAppVisibilityLocal() {
  if (typeof window === 'undefined') return normalizeSnapshot();
  try {
    return normalizeSnapshot(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return normalizeSnapshot();
  }
}

function writeAppVisibilityLocal(snapshot) {
  const clean = normalizeSnapshot(snapshot);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch { /* optional */ }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: clean }));
  }
  return clean;
}

export function subscribeAppVisibility(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => listener(normalizeSnapshot(event?.detail || readAppVisibilityLocal()));
  const storageHandler = (event) => { if (event.key === STORAGE_KEY) listener(readAppVisibilityLocal()); };
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export function isAppHiddenForUser(snapshot, user, appId) {
  if (!user || !appId || isAdminRole(user.role)) return false;
  const record = normalizeSnapshot(snapshot).records[appId];
  if (!record?.isHidden) return false;
  const role = normalizeSystemRole(user.role, SYSTEM_ROLES.TEACHER);
  return cleanRoles(record.hiddenRoles).includes(role);
}

export function getHiddenAppIds(snapshot) {
  return Object.values(normalizeSnapshot(snapshot).records)
    .filter((record) => record.isHidden)
    .map((record) => record.appId);
}

export async function loadAppVisibility(user) {
  const local = readAppVisibilityLocal();
  if (!user || !isSupabaseConfigured || !supabase) return { ...local, source: 'local' };
  try {
    const { data, error } = await supabase
      .from('app_visibility_settings')
      .select('app_id,app_kind,slug,route,title,title_vi,is_hidden,hidden_roles,reason,updated_by,updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const records = {};
    (data || []).forEach((row) => {
      const clean = normalizeRecord(row);
      if (clean.appId && !records[clean.appId]) records[clean.appId] = clean;
    });
    return writeAppVisibilityLocal({ records, source: 'cloud', updatedAt: new Date().toISOString(), error: '' });
  } catch (error) {
    console.warn('[AppVisibility] cloud load failed; using local cache', error);
    return writeAppVisibilityLocal({ ...local, source: 'local-fallback', error: String(error?.message || error) });
  }
}

function assertAdmin(user) {
  if (!user || !isAdminRole(user.role)) throw new Error('Chỉ tài khoản Admin được thay đổi trạng thái hiển thị ứng dụng.');
}

export async function setAppHidden(user, item, hidden, reason = '') {
  assertAdmin(user);
  const appId = String(item?.id || item?.appId || '').trim();
  if (!appId) throw new Error('Thiếu mã ứng dụng.');
  const record = normalizeRecord({
    appId,
    appKind: item?.routeOnly ? 'route' : item?.source || (appId.startsWith('route:') ? 'route' : 'tool'),
    slug: item?.slug,
    route: item?.route,
    title: item?.title,
    titleVi: item?.titleVi,
    isHidden: Boolean(hidden),
    hiddenRoles: DEFAULT_HIDDEN_ROLES,
    reason,
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  });

  const current = readAppVisibilityLocal();
  const next = writeAppVisibilityLocal({
    ...current,
    records: { ...current.records, [appId]: record },
    source: isSupabaseConfigured ? 'pending-cloud' : 'local',
    updatedAt: new Date().toISOString(),
  });

  if (!isSupabaseConfigured || !supabase) return { snapshot: next, cloud: false };
  const payload = {
    app_id: record.appId,
    app_kind: record.appKind,
    slug: record.slug || null,
    route: record.route || null,
    title: record.title || null,
    title_vi: record.titleVi || null,
    is_hidden: record.isHidden,
    hidden_roles: record.hiddenRoles,
    reason: record.reason || null,
    updated_by: user.id || null,
    updated_at: record.updatedAt,
  };
  const { error } = await supabase.from('app_visibility_settings').upsert(payload, { onConflict: 'app_id' });
  if (error) { writeAppVisibilityLocal(current); throw error; }
  return { snapshot: await loadAppVisibility(user), cloud: true };
}

export async function restoreAllHiddenApps(user) {
  assertAdmin(user);
  const current = readAppVisibilityLocal();
  const records = { ...current.records };
  Object.keys(records).forEach((id) => { records[id] = { ...records[id], isHidden: false, updatedAt: new Date().toISOString(), updatedBy: user.id || '' }; });
  writeAppVisibilityLocal({ ...current, records, updatedAt: new Date().toISOString(), source: 'pending-cloud' });
  if (!isSupabaseConfigured || !supabase) return { cloud: false };
  const { error } = await supabase
    .from('app_visibility_settings')
    .update({ is_hidden: false, updated_by: user.id || null, updated_at: new Date().toISOString() })
    .eq('is_hidden', true);
  if (error) { writeAppVisibilityLocal(current); throw error; }
  await loadAppVisibility(user);
  return { cloud: true };
}

export function useAppVisibility(user) {
  const [snapshot, setSnapshot] = useState(() => readAppVisibilityLocal());
  const [ready, setReady] = useState(() => !user || !isSupabaseConfigured || isAdminRole(user?.role));
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (user && isSupabaseConfigured && !isAdminRole(user.role)) setReady(false);
    const next = await loadAppVisibility(user);
    setSnapshot(next);
    setReady(true);
    setLoading(false);
    return next;
  }, [user?.id, user?.email, user?.role]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAppVisibility((next) => { if (active) setSnapshot(next); });
    refresh().catch((error) => {
      console.warn('[AppVisibility] refresh failed', error);
      if (active) { setReady(true); setLoading(false); }
    });
    let channel = null;
    if (user && isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`bes-app-visibility-${String(user.id || 'session')}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_visibility_settings' }, () => {
          refresh().catch((error) => console.warn('[AppVisibility] realtime refresh failed', error));
        })
        .subscribe();
    }
    return () => {
      active = false;
      unsubscribe();
      if (channel && supabase) supabase.removeChannel(channel).catch(() => {});
    };
  }, [refresh, user?.id]);

  const hiddenIds = useMemo(() => getHiddenAppIds(snapshot), [snapshot]);
  return { snapshot, hiddenIds, ready, loading, refresh };
}
