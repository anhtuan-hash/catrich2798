import { isSupabaseConfigured, supabase, getSupabaseStatus } from '../../utils/supabase.js';
import { resolveSystemRole } from '../../utils/roles.js';
import { RUNTIME_CORE_VERSION } from '../../config/version.js';
import { initializeAuthSession, subscribeToAuthChanges } from '../../utils/auth.js';

const listeners = new Set();
const channels = new Map();
const assignedRoleCache = new Map();
const assignedRolePromises = new Map();
const ASSIGNED_ROLE_CACHE_MAX_AGE = 30 * 60 * 1000;

const state = {
  version: RUNTIME_CORE_VERSION,
  phase: isSupabaseConfigured ? 'idle' : 'offline',
  configured: isSupabaseConfigured,
  ready: !isSupabaseConfigured,
  session: null,
  user: null,
  role: 'guest',
  profile: null,
  lastError: '',
  lastReadyAt: '',
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
};

let bootPromise = null;
let runtimeAuthUnsubscribe = null;

function snapshot() {
  return {
    ...state,
    session: state.session ? { expires_at: state.session.expires_at, user: state.session.user } : null,
  };
}

function emit() {
  const next = snapshot();
  listeners.forEach((listener) => {
    try { listener(next); } catch (error) { console.warn('[RuntimeCore] listener failed', error); }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bes-runtime-core-updated', { detail: next }));
  }
}

function inferRole(user, profile, assignedRole = '') {
  return resolveSystemRole({
    assignedRole,
    profileRole: profile?.role,
    metadataRole: user?.app_metadata?.role || user?.user_metadata?.role,
    hasUser: Boolean(user),
  });
}

async function loadAssignedRole(user, { force = false } = {}) {
  if (!supabase || !user?.id) return '';
  const key = String(user.id);
  const cached = assignedRoleCache.get(key);
  if (!force && cached && Date.now() - cached.storedAt < ASSIGNED_ROLE_CACHE_MAX_AGE) return cached.role;
  if (!force && assignedRolePromises.has(key)) return assignedRolePromises.get(key);

  const task = (async () => {
    try {
      const { data, error } = await supabase
        .from('system_roles')
        .select('role,active,scope')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const role = !error && data?.role ? data.role : '';
      assignedRoleCache.set(key, { role, storedAt: Date.now() });
      return role;
    } catch {
      assignedRoleCache.set(key, { role: '', storedAt: Date.now() });
      return '';
    }
  })();
  assignedRolePromises.set(key, task);
  try { return await task; }
  finally { assignedRolePromises.delete(key); }
}

async function applyAuthState(authUser, session = null) {
  state.session = session || null;
  state.user = session?.user || (authUser ? { id: authUser.id, email: authUser.email, user_metadata: { role: authUser.role } } : null);
  state.profile = authUser || null;
  state.systemRole = authUser ? await loadAssignedRole(authUser) : '';
  state.role = inferRole(state.user, state.profile, state.systemRole);
  state.ready = true;
  state.phase = authUser ? 'ready' : 'anonymous';
  state.lastError = '';
  state.lastReadyAt = new Date().toISOString();
  emit();
  return snapshot();
}

async function readLocalSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

export async function bootRuntimeCore({ force = false } = {}) {
  if (state.ready && !force) return snapshot();
  if (bootPromise && !force) return bootPromise;

  bootPromise = (async () => {
    if (!isSupabaseConfigured || !supabase) {
      state.ready = true;
      state.phase = 'offline';
      state.role = 'guest';
      emit();
      return snapshot();
    }

    state.phase = 'booting';
    state.ready = false;
    state.lastError = '';
    emit();

    try {
      const [session, authUser] = await Promise.all([
        readLocalSession(),
        initializeAuthSession(),
      ]);
      await applyAuthState(authUser, session);

      if (!runtimeAuthUnsubscribe) {
        runtimeAuthUnsubscribe = subscribeToAuthChanges((nextUser) => {
          queueMicrotask(async () => {
            try { await applyAuthState(nextUser, await readLocalSession()); }
            catch (error) { console.warn('[RuntimeCore] shared auth update failed', error); }
          });
        });
      }
      return snapshot();
    } catch (error) {
      state.phase = 'error';
      state.ready = false;
      state.lastError = error?.message || String(error);
      emit();
      throw error;
    } finally {
      bootPromise = null;
    }
  })();

  return bootPromise;
}

export function getRuntimeState() {
  return snapshot();
}

export function subscribeRuntime(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

export function getRuntimeClient() {
  return supabase;
}

export async function ensureRuntimeReady() {
  if (!state.ready) await bootRuntimeCore();
  return snapshot();
}

export async function runtimeQuery(table, configure) {
  await ensureRuntimeReady();
  if (!supabase) throw new Error('Supabase is not configured.');
  const builder = supabase.from(table);
  return typeof configure === 'function' ? configure(builder) : builder;
}

export async function runtimeRpc(name, args = {}) {
  await ensureRuntimeReady();
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.rpc(name, args);
}

export function subscribeTable({ key, table, event = '*', schema = 'public', filter = '', onChange }) {
  if (!supabase || !key || !table) return () => {};
  const existing = channels.get(key);
  if (existing) {
    try { supabase.removeChannel(existing); } catch { /* ignore */ }
    channels.delete(key);
  }
  let channel = supabase.channel(`bes-runtime-${key}`)
    .on('postgres_changes', { event, schema, table, ...(filter ? { filter } : {}) }, (payload) => {
      try { onChange?.(payload); } catch (error) { console.warn('[RuntimeCore] realtime callback failed', error); }
    })
    .subscribe();
  channels.set(key, channel);
  return () => {
    const current = channels.get(key);
    if (current) {
      try { supabase.removeChannel(current); } catch { /* ignore */ }
      channels.delete(key);
    }
  };
}

export async function diagnoseRuntime() {
  const status = getSupabaseStatus();
  const report = {
    runtimeVersion: state.version,
    phase: state.phase,
    configured: state.configured,
    ready: state.ready,
    online: state.online,
    hasUrl: status.hasUrl,
    hasAnonKey: status.hasAnonKey,
    hasSession: Boolean(state.session),
    userId: state.user?.id || '',
    email: state.user?.email || '',
    role: state.role,
    profileRole: state.profile?.role || '',
    assignedRole: state.systemRole || '',
    realtimeChannels: channels.size,
    lastError: state.lastError,
    checkedAt: new Date().toISOString(),
  };
  if (supabase && state.session) {
    try {
      const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
      report.profileProbe = error ? `error: ${error.message}` : 'ok';
    } catch (error) {
      report.profileProbe = `error: ${error?.message || error}`;
    }
  }
  return report;
}

if (typeof window !== 'undefined') {
  const updateOnline = () => {
    state.online = navigator.onLine;
    emit();
    if (state.online && !state.ready) bootRuntimeCore({ force: true }).catch(() => {});
  };
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  window.BESRuntimeCore = {
    version: state.version,
    boot: bootRuntimeCore,
    state: getRuntimeState,
    diagnose: diagnoseRuntime,
    client: () => supabase,
    rpc: runtimeRpc,
  };
}
