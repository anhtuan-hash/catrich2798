import { createClient } from '@supabase/supabase-js';
import { RUNTIME_CORE_VERSION } from '../config/version.js';

const runtimeEnv = import.meta.env || {};
export const supabaseUrl = String(runtimeEnv.VITE_SUPABASE_URL || '').trim();
export const supabaseAnonKey = String(runtimeEnv.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const nativeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;
const readCache = new Map();
const inFlightReads = new Map();
const MAX_CACHE_ENTRIES = 160;

const WORK_HUB_ITEM_COLUMNS = [
  'id',
  'title',
  'description',
  'item_type',
  'status',
  'priority',
  'visibility',
  'owner_id',
  'created_by',
  'assignee_ids',
  'watcher_ids',
  'due_at',
  'attachments',
  'metadata',
  'source_module',
  'created_at',
  'updated_at',
  'submitted_at',
  'reviewed_at',
  'completed_at',
].join(',');

const WORK_HUB_COMMENT_COLUMNS = [
  'id',
  'item_id',
  'author_id',
  'body',
  'comment_type',
  'attachments',
  'created_at',
].join(',');

const RESOURCE_ITEM_COLUMNS = [
  'id',
  'title',
  'description',
  'category',
  'grade',
  'school_year',
  'unit_name',
  'cefr',
  'skills',
  'tags',
  'source',
  'copyright_status',
  'visibility',
  'allow_download',
  'status',
  'is_featured',
  'uploader_id',
  'uploader_name',
  'mime_type',
  'file_name',
  'file_size',
  'drive_file_id',
  'drive_web_view_link',
  'drive_download_link',
  'ai_summary',
  'ai_uses',
  'checksum',
  'version_number',
  'parent_resource_id',
  'created_at',
  'updated_at',
  'approved_at',
  'approved_by',
  'views',
  'downloads',
  'deleted_at',
].join(',');

const SELECT_PROJECTIONS = [
  ['/rest/v1/work_hub_items', WORK_HUB_ITEM_COLUMNS],
  ['/rest/v1/work_hub_comments', WORK_HUB_COMMENT_COLUMNS],
  ['/rest/v1/resource_items', RESOURCE_ITEM_COLUMNS],
];

const HEAVY_READ_TTL = [
  ['/rest/v1/library_items', 6 * 60 * 60 * 1000],
  ['/rest/v1/resource_items', 60 * 60 * 1000],
  ['/rest/v1/bes_homeroom_workspaces', 60 * 60 * 1000],
  ['/rest/v1/assessment_items', 60 * 60 * 1000],
  ['/rest/v1/content_ecosystem_assets', 60 * 60 * 1000],
  ['/rest/v1/content_ecosystem_kits', 60 * 60 * 1000],
  ['/rest/v1/work_hub_items', 30 * 60 * 1000],
  ['/rest/v1/work_hub_comments', 15 * 60 * 1000],
  ['/rest/v1/automation_', 30 * 60 * 1000],
  ['/rest/v1/profiles', 30 * 60 * 1000],
  ['/rest/v1/system_roles', 30 * 60 * 1000],
];

function getHeavyReadTtl(url) {
  return HEAVY_READ_TTL.find(([path]) => url.includes(path))?.[1] || 0;
}

function applySelectProjection(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return request;
  const projection = SELECT_PROJECTIONS.find(([path]) => request.url.includes(path));
  if (!projection) return request;

  const url = new URL(request.url);
  if (url.searchParams.get('select') !== '*') return request;
  url.searchParams.set('select', projection[1]);
  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    credentials: request.credentials,
    signal: request.signal,
  });
}

function cacheKeyFor(request) {
  const authorization = request.headers.get('authorization') || '';
  const acceptProfile = request.headers.get('accept-profile') || '';
  const range = request.headers.get('range') || '';
  return `${request.url}|${authorization}|${acceptProfile}|${range}`;
}

function clearReadCache(matcher = null) {
  const shouldClear = typeof matcher === 'function' ? matcher : () => true;
  [...readCache.keys()].forEach((key) => {
    if (shouldClear(key)) readCache.delete(key);
  });
  [...inFlightReads.entries()].forEach(([key, entry]) => {
    if (!shouldClear(key)) return;
    if (entry?.token) entry.token.invalidated = true;
    inFlightReads.delete(key);
  });
}

function normalizeTablePath(table) {
  const clean = String(table || '').trim().replace(/^public\./i, '').replace(/[^a-zA-Z0-9_]/g, '');
  return clean ? `/rest/v1/${clean}` : '';
}

export function invalidateSupabaseReadCacheForTable(table) {
  const tablePath = normalizeTablePath(table);
  if (!tablePath) return;
  clearReadCache((key) => key.includes(tablePath));
}

function restTablePath(url) {
  try {
    const match = new URL(url).pathname.match(/\/rest\/v1\/([^/]+)/i);
    return match?.[1] || '';
  } catch {
    return '';
  }
}

function clearReadCacheForMutation(url) {
  const table = restTablePath(url);
  if (!table) {
    clearReadCache();
    return;
  }
  invalidateSupabaseReadCacheForTable(table);
}

function trimReadCache() {
  if (readCache.size <= MAX_CACHE_ENTRIES) return;
  const oldest = [...readCache.entries()]
    .sort((a, b) => a[1].storedAt - b[1].storedAt)
    .slice(0, readCache.size - MAX_CACHE_ENTRIES);
  oldest.forEach(([key]) => readCache.delete(key));
}

function cloneFetchInput(input) {
  if (typeof Request === 'undefined' || !(input instanceof Request)) return input;
  try {
    // Supabase may retry the same Request object. Cloning prevents this wrapper
    // from consuming the caller-owned body on the first attempt.
    return input.clone();
  } catch (error) {
    const method = String(input.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      return new Request(input.url, {
        method,
        headers: new Headers(input.headers),
        credentials: input.credentials,
        cache: input.cache,
        mode: input.mode,
        redirect: input.redirect,
        referrer: input.referrer,
        referrerPolicy: input.referrerPolicy,
        integrity: input.integrity,
        keepalive: input.keepalive,
        signal: input.signal,
      });
    }
    throw new TypeError('Không thể gửi lại yêu cầu vì nội dung request đã được sử dụng.', { cause: error });
  }
}

async function egressAwareFetch(input, init) {
  if (!nativeFetch) throw new Error('Fetch API is unavailable.');
  const originalRequest = new Request(cloneFetchInput(input), init);
  const method = String(originalRequest.method || 'GET').toUpperCase();
  const isRestRequest = originalRequest.url.includes('/rest/v1/');

  // Invalidate only the table changed by the mutation. Clearing every heavy-read
  // cache after unrelated writes caused Work Hub, Homeroom and Resource Library
  // to be downloaded again even when their own data had not changed.
  if (isRestRequest && method !== 'GET' && method !== 'HEAD') {
    clearReadCacheForMutation(originalRequest.url);
    return nativeFetch(originalRequest);
  }

  const request = isRestRequest ? applySelectProjection(originalRequest) : originalRequest;
  const ttl = method === 'GET' && isRestRequest ? getHeavyReadTtl(request.url) : 0;
  if (!ttl) return nativeFetch(request);

  const key = cacheKeyFor(request);
  const cached = readCache.get(key);
  if (cached && Date.now() - cached.storedAt < ttl) {
    return cached.response.clone();
  }
  if (cached) readCache.delete(key);

  if (!inFlightReads.has(key)) {
    const token = { invalidated: false };
    let pending;
    pending = nativeFetch(request)
      .then((response) => {
        if (response.ok && !token.invalidated) {
          readCache.set(key, { storedAt: Date.now(), response: response.clone() });
          trimReadCache();
        }
        return response.clone();
      })
      .finally(() => {
        if (inFlightReads.get(key)?.promise === pending) inFlightReads.delete(key);
      });
    inFlightReads.set(key, { promise: pending, token });
  }

  const response = await inFlightReads.get(key).promise;
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
