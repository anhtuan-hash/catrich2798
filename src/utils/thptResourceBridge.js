import { isSupabaseConfigured, supabase } from './supabase.js';
import {
  fromCloudRow,
  loadResourceLibrary,
  RESOURCE_EVENT,
  updateResourceLibrary,
} from './resourceLibrary.js';
import * as base from './thptResourceBridgeBase.js';

export {
  THPT_RESOURCE_SOURCE,
  THPT_RESOURCE_LINK_TAG,
  THPT_RESOURCE_HIDDEN_TAG,
  isHtmlResource,
  isApprovedHtmlResource,
  isResourceLinkedToThpt,
  resourceToThptLesson,
  loadThptResourceHtml,
  setThptResourceLinked,
} from './thptResourceBridgeBase.js';

const RESOURCE_LIST_CACHE_TTL = 60 * 60 * 1000;
const resourceListCache = new Map();
const resourceListPromises = new Map();

function cacheKey(options = {}) {
  return options.linkedOnly === false ? 'all-html' : 'linked-only';
}

function rowsFromLocal(options = {}) {
  const linkedOnly = options.linkedOnly !== false;
  return loadResourceLibrary().items
    .filter((item) => linkedOnly ? base.isResourceLinkedToThpt(item) : base.isApprovedHtmlResource(item))
    .map(base.resourceToThptLesson)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function writeCache(options, rows) {
  const key = cacheKey(options);
  resourceListCache.set(key, { rows, storedAt: Date.now() });
  return rows;
}

function readCache(options) {
  const cached = resourceListCache.get(cacheKey(options));
  if (!cached || Date.now() - cached.storedAt >= RESOURCE_LIST_CACHE_TTL) return null;
  return cached.rows;
}

function refreshCachesFromLocal() {
  if (resourceListCache.has('linked-only')) writeCache({ linkedOnly: true }, rowsFromLocal({ linkedOnly: true }));
  if (resourceListCache.has('all-html')) writeCache({ linkedOnly: false }, rowsFromLocal({ linkedOnly: false }));
}

function applyResourceRealtime(payload) {
  const row = payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
  if (!row?.id) return false;

  updateResourceLibrary((store) => {
    if (payload?.eventType === 'DELETE') {
      store.items = store.items.filter((item) => String(item.cloudId || item.id) !== String(row.id));
      return;
    }

    const item = fromCloudRow(row);
    const index = store.items.findIndex((entry) => (
      String(entry.cloudId || '') === String(item.cloudId || '')
      || String(entry.id || '') === String(item.id || '')
      || (item.driveFileId && entry.driveFileId === item.driveFileId)
    ));
    if (index >= 0) {
      const existing = store.items[index];
      store.items[index] = {
        ...existing,
        ...item,
        html: existing.html || item.html || '',
      };
    } else {
      store.items.unshift(item);
    }
  });
  refreshCachesFromLocal();
  return true;
}

export async function listApprovedThptResources(options = {}) {
  const key = cacheKey(options);
  const cached = readCache(options);
  if (cached) return cached;
  if (resourceListPromises.has(key)) return resourceListPromises.get(key);

  const task = base.listApprovedThptResources(options)
    .then((rows) => writeCache(options, rows))
    .finally(() => {
      if (resourceListPromises.get(key) === task) resourceListPromises.delete(key);
    });
  resourceListPromises.set(key, task);
  return task;
}

export function subscribeApprovedThptResources(callback, options = {}) {
  if (typeof window === 'undefined') return () => {};
  let active = true;
  let realtime = null;
  let timer = null;

  const publishLocal = () => {
    const rows = writeCache(options, rowsFromLocal(options));
    if (active) callback?.(rows);
  };
  const scheduleLocal = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(publishLocal, 120);
  };

  window.addEventListener(RESOURCE_EVENT, scheduleLocal);
  if (isSupabaseConfigured && supabase) {
    realtime = supabase
      .channel(`bes-thpt-resource-bridge-egress-${options.linkedOnly === false ? 'all' : 'linked'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'resource_items',
      }, (payload) => {
        applyResourceRealtime(payload);
        publishLocal();
      })
      .subscribe();
  }

  listApprovedThptResources(options)
    .then((rows) => { if (active) callback?.(rows); })
    .catch(() => { if (active) callback?.(rowsFromLocal(options)); });

  return () => {
    active = false;
    window.clearTimeout(timer);
    window.removeEventListener(RESOURCE_EVENT, scheduleLocal);
    if (realtime) supabase.removeChannel(realtime);
  };
}
