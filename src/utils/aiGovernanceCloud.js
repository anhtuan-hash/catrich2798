import { isSupabaseConfigured, supabase } from './supabase.js';

export const AI_GOVERNANCE_CLOUD_EVENT = 'bes-ai-governance-cloud-updated';
const QUEUE_KEY = 'bes-ai-governance-cloud-queue:v1';
const STATUS_KEY = 'bes-ai-governance-cloud-status:v1';
const MAX_QUEUE_ITEMS = 500;
const BATCH_SIZE = 40;

let currentUser = { id: '', email: '', role: 'guest', name: 'Guest' };
let flushPromise = null;
let listenersReady = false;

function nowIso() {
  return new Date().toISOString();
}

function safeParse(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

function readLocal(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  return safeParse(window.localStorage.getItem(key), fallback) ?? fallback;
}

function writeLocal(key, value) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function dispatch(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AI_GOVERNANCE_CLOUD_EVENT, { detail }));
}

function baseStatus() {
  return {
    configured: isSupabaseConfigured,
    authenticated: false,
    online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    syncing: false,
    migrationReady: null,
    pending: readQueue().length,
    uploaded: 0,
    lastSyncAt: '',
    lastPullAt: '',
    lastError: '',
    lastErrorCode: '',
    mode: 'local-first-cloud-sync',
    updatedAt: nowIso(),
  };
}

function normalizeStatus(raw) {
  return { ...baseStatus(), ...(raw && typeof raw === 'object' ? raw : {}), configured: isSupabaseConfigured, pending: readQueue().length, online: typeof navigator === 'undefined' ? true : navigator.onLine !== false };
}

function writeStatus(patch = {}) {
  const next = normalizeStatus({ ...readLocal(STATUS_KEY, {}), ...patch, updatedAt: nowIso() });
  writeLocal(STATUS_KEY, next);
  dispatch(next);
  return next;
}

export function getAiGovernanceCloudStatus() {
  return normalizeStatus(readLocal(STATUS_KEY, {}));
}

function readQueue() {
  const queue = readLocal(QUEUE_KEY, []);
  return Array.isArray(queue) ? queue.filter(Boolean).slice(0, MAX_QUEUE_ITEMS) : [];
}

function writeQueue(queue) {
  const next = Array.isArray(queue) ? queue.filter(Boolean).slice(0, MAX_QUEUE_ITEMS) : [];
  writeLocal(QUEUE_KEY, next);
  writeStatus({ pending: next.length });
  return next;
}

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const resolved = char === 'x' ? value : (value & 0x3) | 0x8;
    return resolved.toString(16);
  });
}

function cleanString(value, max = 180) {
  return String(value || '').slice(0, max);
}

function cleanNumber(value, max = 1000000000) {
  const number = Math.max(0, Math.round(Number(value) || 0));
  return Math.min(max, number);
}

const SENSITIVE_KEYS = /prompt|result|response|content|body|text|api.?key|secret|password|token|attachment|image|base64/i;

function sanitizeDetail(value, depth = 0) {
  if (depth > 3) return '[truncated]';
  if (value == null) return value;
  if (typeof value === 'string') return value.slice(0, 500);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 12).map((item) => sanitizeDetail(item, depth + 1));
  if (typeof value !== 'object') return cleanString(value, 200);
  const next = {};
  Object.entries(value).slice(0, 40).forEach(([key, item]) => {
    if (SENSITIVE_KEYS.test(key)) return;
    next[cleanString(key, 80)] = sanitizeDetail(item, depth + 1);
  });
  return next;
}

export function buildAiGovernanceCloudEvent(item = {}) {
  const detail = item.detail && typeof item.detail === 'object' ? item.detail : {};
  const runtime = detail.runtime && typeof detail.runtime === 'object' ? detail.runtime : {};
  const validation = detail.validation && typeof detail.validation === 'object' ? detail.validation : {};
  const privacy = detail.privacy && typeof detail.privacy === 'object' ? detail.privacy : {};
  return {
    id: /^[0-9a-f-]{36}$/i.test(String(item.cloudId || '')) ? item.cloudId : uuid(),
    created_at: new Date(Number(item.createdAt) || Date.now()).toISOString(),
    event_type: cleanString(item.type || 'event', 40),
    status: cleanString(item.status || 'info', 24),
    label: cleanString(item.label || 'AI event', 180),
    task_id: cleanString(item.taskId || detail.taskId || 'default', 80),
    provider: cleanString(item.provider || '', 80),
    model: cleanString(item.model || '', 140),
    transport: cleanString(item.transport || detail.transport || '', 80),
    operation_id: cleanString(item.operationId || '', 120),
    action_id: cleanString(item.actionId || '', 120),
    target: cleanString(item.target || '', 120),
    source: cleanString(item.source || '', 120),
    input_tokens: cleanNumber(detail.inputTokens),
    output_tokens: cleanNumber(detail.outputTokens),
    duration_ms: cleanNumber(detail.durationMs),
    provider_calls: cleanNumber(detail.providerCalls),
    fallback_used: Boolean(detail.fallbackUsed),
    privacy_redactions: cleanNumber(privacy.maskedCount),
    validation_repairs: validation.repaired ? 1 : 0,
    runtime_retries: cleanNumber(runtime.retries),
    runtime_cache_hit: Boolean(runtime.cacheHit),
    runtime_dedupe_hit: Boolean(runtime.deduplicated),
    runtime_timeout: Boolean(runtime.timedOut),
    metadata: sanitizeDetail({
      profile: item.profile,
      error: detail.error,
      attempts: detail.attempts,
      privacy,
      validation,
      runtime,
      actorRole: item.actor?.role || currentUser.role,
    }),
  };
}

function isAuthenticatedUser(user = currentUser) {
  return Boolean(user?.id || user?.email) && user?.role !== 'guest';
}

export function queueAiGovernanceCloudEvent(item = {}) {
  if (!isSupabaseConfigured || !isAuthenticatedUser()) return false;
  const event = buildAiGovernanceCloudEvent(item);
  const queue = readQueue();
  if (!queue.some((existing) => existing.id === event.id)) queue.unshift(event);
  writeQueue(queue);
  window.setTimeout(() => { void flushAiGovernanceCloudQueue(); }, 250);
  return true;
}

function migrationMissing(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return error?.code === 'PGRST202' || error?.code === '42P01' || message.includes('bes_v1237_') || message.includes('ai_governance_');
}

async function hasSession() {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data?.session?.user);
}

export async function flushAiGovernanceCloudQueue({ force = false } = {}) {
  if (flushPromise && !force) return flushPromise;
  flushPromise = (async () => {
    const queue = readQueue();
    if (!isSupabaseConfigured || !supabase || !queue.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      return writeStatus({ syncing: false, pending: queue.length, online: typeof navigator === 'undefined' ? true : navigator.onLine !== false });
    }
    writeStatus({ syncing: true, lastError: '', lastErrorCode: '' });
    try {
      const authenticated = await hasSession();
      if (!authenticated) return writeStatus({ syncing: false, authenticated: false, pending: queue.length, lastError: 'No authenticated Supabase session.', lastErrorCode: 'NO_SESSION' });
      let remaining = [...queue];
      let uploaded = 0;
      while (remaining.length) {
        const batch = remaining.slice(-BATCH_SIZE);
        const { data, error } = await supabase.rpc('bes_v1237_ingest_ai_events', { event_batch: batch });
        if (error) throw error;
        uploaded += Number(data?.accepted ?? batch.length) || batch.length;
        const sentIds = new Set(batch.map((item) => item.id));
        remaining = remaining.filter((item) => !sentIds.has(item.id));
        writeQueue(remaining);
      }
      const previous = getAiGovernanceCloudStatus();
      return writeStatus({
        syncing: false,
        authenticated: true,
        migrationReady: true,
        pending: 0,
        uploaded: Number(previous.uploaded || 0) + uploaded,
        lastSyncAt: nowIso(),
        lastError: '',
        lastErrorCode: '',
      });
    } catch (error) {
      return writeStatus({
        syncing: false,
        authenticated: await hasSession().catch(() => false),
        migrationReady: migrationMissing(error) ? false : getAiGovernanceCloudStatus().migrationReady,
        pending: readQueue().length,
        lastError: cleanString(error?.message || 'Cloud sync failed.', 500),
        lastErrorCode: cleanString(error?.code || 'SYNC_FAILED', 80),
      });
    } finally {
      flushPromise = null;
    }
  })();
  return flushPromise;
}

export async function saveAiGovernanceCloudSettings(settings) {
  if (!isSupabaseConfigured || !supabase || currentUser.role !== 'admin') return { saved: false, reason: 'not-admin-or-not-configured' };
  try {
    const { data, error } = await supabase.rpc('bes_v1237_save_ai_governance_settings', { next_settings: settings || {} });
    if (error) throw error;
    writeStatus({ authenticated: true, migrationReady: true, lastSyncAt: nowIso(), lastError: '', lastErrorCode: '' });
    return { saved: true, data };
  } catch (error) {
    writeStatus({ migrationReady: migrationMissing(error) ? false : getAiGovernanceCloudStatus().migrationReady, lastError: cleanString(error?.message || 'Could not save cloud settings.', 500), lastErrorCode: cleanString(error?.code || 'SETTINGS_SAVE_FAILED', 80) });
    return { saved: false, error };
  }
}

export async function pullAiGovernanceCloudSettings() {
  if (!isSupabaseConfigured || !supabase || !isAuthenticatedUser()) return null;
  try {
    const { data, error } = await supabase.rpc('bes_v1237_get_ai_governance_settings');
    if (error) throw error;
    writeStatus({ authenticated: true, migrationReady: true, lastPullAt: nowIso(), lastError: '', lastErrorCode: '' });
    return data?.settings && typeof data.settings === 'object' ? data.settings : null;
  } catch (error) {
    writeStatus({ migrationReady: migrationMissing(error) ? false : getAiGovernanceCloudStatus().migrationReady, lastError: cleanString(error?.message || 'Could not load cloud settings.', 500), lastErrorCode: cleanString(error?.code || 'SETTINGS_PULL_FAILED', 80) });
    return null;
  }
}

export async function fetchAiGovernanceCloudDashboard(days = 14) {
  if (!isSupabaseConfigured || !supabase || !isAuthenticatedUser()) return null;
  try {
    const { data, error } = await supabase.rpc('bes_v1237_get_ai_governance_dashboard', { lookback_days: Math.min(45, Math.max(1, Number(days) || 14)) });
    if (error) throw error;
    writeStatus({ authenticated: true, migrationReady: true, lastPullAt: nowIso(), lastError: '', lastErrorCode: '' });
    return data || null;
  } catch (error) {
    writeStatus({ migrationReady: migrationMissing(error) ? false : getAiGovernanceCloudStatus().migrationReady, lastError: cleanString(error?.message || 'Could not load cloud dashboard.', 500), lastErrorCode: cleanString(error?.code || 'DASHBOARD_PULL_FAILED', 80) });
    return null;
  }
}

export function clearAiGovernanceCloudQueue() {
  writeQueue([]);
  return getAiGovernanceCloudStatus();
}

export function setAiGovernanceCloudUser(user) {
  currentUser = user?.id || user?.email
    ? { id: user.id || '', email: user.email || '', role: user.role || 'teacher', name: user.name || user.email || 'User' }
    : { id: '', email: '', role: 'guest', name: 'Guest' };
  writeStatus({ authenticated: isAuthenticatedUser(currentUser), pending: readQueue().length });
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && !listenersReady) {
    listenersReady = true;
    window.addEventListener('online', () => { writeStatus({ online: true }); void flushAiGovernanceCloudQueue({ force: true }); });
    window.addEventListener('offline', () => { writeStatus({ online: false, syncing: false }); });
  }
  if (isAuthenticatedUser(currentUser)) window.setTimeout(() => { void flushAiGovernanceCloudQueue(); }, 500);
  return getAiGovernanceCloudStatus();
}
