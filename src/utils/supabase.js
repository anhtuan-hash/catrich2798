import { createClient } from '@supabase/supabase-js';
import { RUNTIME_CORE_VERSION } from '../config/version.js';

const runtimeEnv = import.meta.env || {};
export const supabaseUrl = String(runtimeEnv.VITE_SUPABASE_URL || '').trim();
export const supabaseAnonKey = String(runtimeEnv.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const nativeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;
const readCache = new Map();
const inFlightReads = new Map();
const MAX_CACHE_ENTRIES = 80;

const HEAVY_READ_TTL = [
  ['/rest/v1/work_hub_items', 5 * 60 * 1000],
  ['/rest/v1/bes_homeroom_workspaces', 10 * 60 * 1000],
  ['/rest/v1/resource_items', 15 * 60 * 1000],
  ['/rest/v1/library_items', 30 * 60 * 1000],
];

function getHeavyReadTtl(url) {
  return HEAVY_READ_TTL.find(([path]) => url.includes(path))?.[1] || 0;
}

function cacheKeyFor(request) {
  const authorization = request.headers.get('authorization') || '';
  const acceptProfile = request.headers.get('accept-profile') || '';
  const range = request.headers.get('range') || '';
  return `${request.url}|${authorization}|${acceptProfile}|${range}`;
}

function clearReadCache() {
  readCache.clear();
  inFlightReads.clear();
}

function trimReadCache() {
  if (readCache.size <= MAX_CACHE_ENTRIES) return;
  const oldest = [...readCache.entries()]
    .sort((a, b) => a[1].storedAt - b[1].storedAt)
    .slice(0, readCache.size - MAX_CACHE_ENTRIES);
  oldest.forEach(([key]) => readCache.delete(key));
}

async function egressAwareFetch(input, init) {
  if (!nativeFetch) throw new Error('Fetch API is unavailable.');
  const request = new Request(input, init);
  const method = String(request.method || 'GET').toUpperCase();
  const isRestRequest = request.url.includes('/rest/v1/');

  // Any database mutation may change data already held in the short-lived read cache.
  if (isRestRequest && method !== 'GET' && method !== 'HEAD') {
    clearReadCache();
    return nativeFetch(request);
  }

  const ttl = method === 'GET' && isRestRequest ? getHeavyReadTtl(request.url) : 0;
  if (!ttl) return nativeFetch(request);

  const key = cacheKeyFor(request);
  const cached = readCache.get(key);
  if (cached && Date.now() - cached.storedAt < ttl) {
    return cached.response.clone();
  }
  if (cached) readCache.delete(key);

  if (!inFlightReads.has(key)) {
    const pending = nativeFetch(request)
      .then((response) => {
        if (response.ok) {
          readCache.set(key, { storedAt: Date.now(), response: response.clone() });
          trimReadCache();
        }
        return response.clone();
      })
      .finally(() => inFlightReads.delete(key));
    inFlightReads.set(key, pending);
  }

  const response = await inFlightReads.get(key);
  return response.clone();
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      global: {
        fetch: egressAwareFetch,
        headers: { 'x-bes-runtime': RUNTIME_CORE_VERSION },
      },
    })
  : null;

export function getSupabaseStatus() {
  return {
    configured: isSupabaseConfigured,
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    projectRef: supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/i)?.[1] || '',
  };
}

export function getSupabasePublicConfig() {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    configured: isSupabaseConfigured,
  };
}

if (typeof window !== 'undefined') {
  // Native modules use this singleton. The global is read-only compatibility for
  // diagnostics and legacy utilities; no API-key capture or REST bridge is needed.
  Object.defineProperty(window, 'BESSupabase', {
    configurable: true,
    enumerable: false,
    get: () => supabase,
  });
}