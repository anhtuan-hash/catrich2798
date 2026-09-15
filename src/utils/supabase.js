import { createClient } from '@supabase/supabase-js';
import { RUNTIME_CORE_VERSION } from '../config/version.js';

const runtimeEnv = import.meta.env || {};
export const supabaseUrl = String(runtimeEnv.VITE_SUPABASE_URL || '').trim();
export const supabaseAnonKey = String(runtimeEnv.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const nativeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;
const readCache = new Map();
const inFlightReads = new Map();
const MAX_CACHE_ENTRIES = 240;
const SUPABASE_RETRY_DELAYS = [1800, 4200, 8500, 15000];
const WEEKLY_MUTATION_GAP_MS = 1250;
let weeklyMutationQueue = Promise.resolve();
let lastWeeklyMutationAt = 0;

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
  ['/rest/v1/collaboration_spaces', 'id,owner_id,title,description,space_type,visibility,status,metadata,created_at,updated_at'],
  ['/rest/v1/collaboration_members', 'id,space_id,user_id,member_role,display_name,email,status,invited_by,created_at,updated_at'],
  ['/rest/v1/collaboration_threads', 'id,space_id,created_by,title,thread_type,status,resolved_at,metadata,created_at,updated_at'],
  ['/rest/v1/collaboration_comments', 'id,space_id,thread_id,author_id,author_name,body,parent_id,mentions,attachments,resolved,created_at,updated_at'],
  ['/rest/v1/content_versions', 'id,space_id,entity_type,entity_id,version_no,title,content,created_by,status,restore_of,metadata,created_at'],
  ['/rest/v1/permission_overrides', 'id,resource_type,resource_id,principal_type,principal_id,permission_level,granted_by,expires_at,metadata,created_at,updated_at'],
  ['/rest/v1/audit_events', 'id,actor_id,actor_email,actor_role,action,entity_type,entity_id,source_module,metadata,created_at'],
];

const READ_LIMIT_CAPS = [
  ['/rest/v1/collaboration_spaces', 150],
  ['/rest/v1/collaboration_members', 500],
  ['/rest/v1/collaboration_threads', 400],
  ['/rest/v1/collaboration_comments', 800],
  ['/rest/v1/content_versions', 500],
  ['/rest/v1/permission_overrides', 300],
  ['/rest/v1/audit_events', 300],
  ['/rest/v1/backup_snapshots', 10],
  ['/rest/v1/deleted_items', 100],
];

const HEAVY_READ_TTL = [
  ['/rest/v1/library_items', 6 * 60 * 60 * 1000],
  ['/rest/v1/resource_items', 60 * 60 * 1000],
  ['/rest/v1/resource_smart_metadata', 60 * 60 * 1000],
  ['/rest/v1/resource_user_state', 30 * 60 * 1000],
  ['/rest/v1/resource_collections', 60 * 60 * 1000],
  ['/rest/v1/resource_collection_items', 60 * 60 * 1000],
  ['/rest/v1/bes_homeroom_workspaces', 60 * 60 * 1000],
  ['/rest/v1/student_support_alerts', 2 * 60 * 1000],
  ['/rest/v1/student_support_cases', 2 * 60 * 1000],
  ['/rest/v1/student_support_actions', 60 * 1000],
  ['/rest/v1/student_support_notes', 60 * 1000],
  ['/rest/v1/student_support_teacher_observations', 60 * 1000],
  ['/rest/v1/student_support_family_contacts', 60 * 1000],
  ['/rest/v1/student_support_case_events', 60 * 1000],
  ['/rest/v1/student_support_rules', 5 * 60 * 1000],
  ['/rest/v1/assessment_items', 60 * 60 * 1000],
  ['/rest/v1/assessment_blueprints', 60 * 60 * 1000],
  ['/rest/v1/assessment_tests', 60 * 60 * 1000],
  ['/rest/v1/assessment_test_items', 60 * 60 * 1000],
  ['/rest/v1/content_ecosystem_assets', 60 * 60 * 1000],
  ['/rest/v1/content_ecosystem_kits', 60 * 60 * 1000],
  ['/rest/v1/work_hub_items', 30 * 60 * 1000],
  ['/rest/v1/work_hub_comments', 15 * 60 * 1000],
  ['/rest/v1/automation_', 30 * 60 * 1000],
  ['/rest/v1/collaboration_spaces', 15 * 60 * 1000],
  ['/rest/v1/collaboration_members', 30 * 60 * 1000],
  ['/rest/v1/collaboration_threads', 10 * 60 * 1000],
  ['/rest/v1/collaboration_comments', 5 * 60 * 1000],
  ['/rest/v1/content_versions', 15 * 60 * 1000],
  ['/rest/v1/permission_overrides', 30 * 60 * 1000],
  ['/rest/v1/audit_events', 5 * 60 * 1000],
  ['/rest/v1/backup_snapshots', 30 * 60 * 1000],
  ['/rest/v1/backup_items', 30 * 60 * 1000],
  ['/rest/v1/deleted_items', 10 * 60 * 1000],
  ['/rest/v1/ai_website_settings', 6 * 60 * 60 * 1000],
  ['/rest/v1/permission_requests', 30 * 60 * 1000],
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

function applyReadLimitCap(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return request;
  const entry = READ_LIMIT_CAPS.find(([path]) => request.url.includes(path));
  if (!entry) return request;

  const [, cap] = entry;
  const url = new URL(request.url);
  const requested = Number.parseInt(url.searchParams.get('limit') || '', 10);
  if (!Number.isFinite(requested) || requested <= cap) return request;
  url.searchParams.set('limit', String(cap));
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
    throw error;
  }
}

function normalizeFetchArgs(input, init = {}) {
  if (typeof Request !== 'undefined' && input instanceof Request) {
    const cloned = cloneFetchInput(input);
    if (init && Object.keys(init).length) return new Request(cloned, init);
    return cloned;
  }
  return new Request(input, init);
}

function shouldRetrySupabaseRequest(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSupabaseRequest(input, init = {}) {
  let request = applyReadLimitCap(applySelectProjection(normalizeFetchArgs(input, init)));
  const method = String(request.method || 'GET').toUpperCase();
  const isRead = method === 'GET' || method === 'HEAD';
  const ttl = isRead ? getHeavyReadTtl(request.url) : 0;
  const key = isRead && ttl ? cacheKeyFor(request) : '';

  if (key) {
    const cached = readCache.get(key);
    if (cached && Date.now() - cached.storedAt < ttl) return cached.response.clone();
    const inFlight = inFlightReads.get(key);
    if (inFlight?.promise) return (await inFlight.promise).clone();
  }

  const token = { invalidated: false };
  const attempt = async () => {
    let lastError = null;
    let lastResponse = null;
    for (let index = 0; index <= SUPABASE_RETRY_DELAYS.length; index += 1) {
      try {
        request = index === 0 ? request : applyReadLimitCap(applySelectProjection(normalizeFetchArgs(input, init)));
        const response = await nativeFetch(request);
        lastResponse = response;
        if (!shouldRetrySupabaseRequest(response.status) || index === SUPABASE_RETRY_DELAYS.length) return response;
      } catch (error) {
        lastError = error;
        if (index === SUPABASE_RETRY_DELAYS.length) throw error;
      }
      await sleep(SUPABASE_RETRY_DELAYS[index]);
    }
    if (lastResponse) return lastResponse;
    throw lastError || new Error('Supabase request failed.');
  };

  const promise = attempt().then((response) => {
    if (key && response.ok && !token.invalidated) {
      readCache.set(key, { response: response.clone(), storedAt: Date.now() });
      trimReadCache();
    }
    return response;
  }).finally(() => {
    if (key && inFlightReads.get(key)?.token === token) inFlightReads.delete(key);
  });

  if (key) inFlightReads.set(key, { promise, token });
  const response = await promise;
  if (!isRead && response.ok) clearReadCacheForMutation(request.url);
  return response;
}

async function pacedMutation(operation) {
  weeklyMutationQueue = weeklyMutationQueue.then(async () => {
    const gap = Date.now() - lastWeeklyMutationAt;
    if (gap < WEEKLY_MUTATION_GAP_MS) await sleep(WEEKLY_MUTATION_GAP_MS - gap);
    try {
      return await operation();
    } finally {
      lastWeeklyMutationAt = Date.now();
    }
  });
  return weeklyMutationQueue;
}

const supabaseOptions = nativeFetch ? {
  global: {
    fetch: runSupabaseRequest,
  },
} : undefined;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, supabaseOptions)
  : null;

export function getSupabaseClient() {
  return supabase;
}

export function getSupabaseRuntimeVersion() {
  return RUNTIME_CORE_VERSION;
}

export async function supabaseQuery(table, configure = null) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  let query = supabase.from(table).select('*');
  if (typeof configure === 'function') query = configure(query);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function supabaseRpc(name, args = {}) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export async function supabaseMutation(table, operation) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  return pacedMutation(async () => {
    const result = await operation(supabase.from(table));
    if (result?.error) throw result.error;
    invalidateSupabaseReadCacheForTable(table);
    return result?.data ?? result;
  });
}
