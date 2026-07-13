import { isSupabaseConfigured, supabase, getSupabaseStatus } from '../../utils/supabase.js';
import { resolveSystemRole } from '../../utils/roles.js';
import { RUNTIME_CORE_VERSION } from '../../config/version.js';

const listeners = new Set();
const channels = new Map();

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
let authSubscription = null;

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

async function loadAssignedRole(user) {
  if (!supabase || !user?.id) return '';
  try {
    const { data, error } = await supabase
      .from('system_roles')
      .select('role,active,scope')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data?.role) return data.role;
  } catch { /* V10.98 database compatibility */ }
  return '';
}

async function loadProfile(user) {
  if (!supabase || !user?.id) return null;
  const attempts = [
    () => supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    () => supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    () => supabase.from('profiles').select('*').eq('profile_id', user.id).maybeSingle(),
  ];
  for (const attempt of attempts) {
    try {
      const { data, error } = await attempt();
      if (!error && data) return data;
      if (error && !/column .* does not exist/i.test(error.message || '')) break;
    } catch { /* try compatible profile schema */ }
  }
  return null;
}

async function applySession(session) {
  state.session = session || null;
  state.user = session?.user || null;
  state.profile = session?.user ? await loadProfile(session.user) : null;
  state.systemRole = session?.user ? await loadAssignedRole(session.user) : '';
  state.role = inferRole(state.user, state.profile, state.systemRole);
  state.ready = true;
  state.phase = session?.user ? 'ready' : 'anonymous';
  state.lastError = '';
  state.lastReadyAt = new Date().toISOString();
  emit();
  return snapshot();
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
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await applySession(data?.session || null);

      if (!authSubscription) {
        const subscription = supabase.auth.onAuthStateChange((_event, session) => {
          queueMicrotask(() => applySession(session));
        });
        authSubscription = subscription?.data?.subscription || null;
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
      const { error } = await supabase.from('profiles').select('*', { head: true, count: 'exact' }).limit(1);
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
