import { getRuntimeClient } from '../services/runtime/core.js';

const PATCH_MARK = Symbol.for('bes.workScheduleDatabaseCompatibility.v3');
const LEGACY_SCHEDULE_TYPE = 'schedule';
const SAFE_WORK_HUB_TYPE = 'task';
const WORK_HUB_CACHE_PREFIX = 'bes-work-hub-v1093-local:';
const WORK_HUB_SYNC_PREFIX = 'bes-work-hub-v1093-sync:';
const WORK_HUB_REFRESH_EVENT = 'bes-work-hub-delivery-updated';
const WORK_HUB_REALTIME_PREFIX = 'bes-runtime-work-hub-';
const WORK_HUB_TASK_LIST_COLUMNS = 'id,title,description,item_type,status,priority,visibility,owner_id,created_by,assignee_ids,watcher_ids,due_at,attachments,metadata,source_module,created_at,updated_at,submitted_at,reviewed_at,completed_at';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeColumns(value) {
  return String(value || '').replace(/\s+/g, '');
}

function isScheduleRow(row) {
  return Boolean(
    row
    && typeof row === 'object'
    && !Array.isArray(row)
    && (row.item_type === LEGACY_SCHEDULE_TYPE || row.metadata?.schedule_event === true),
  );
}

function realtimeRow(payload) {
  return payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
}

function rewriteScheduleRow(row) {
  if (!isScheduleRow(row)) return row;
  const viewerIds = Array.isArray(row.assignee_ids) ? row.assignee_ids.filter(Boolean) : [];
  return {
    ...row,
    item_type: SAFE_WORK_HUB_TYPE,
    metadata: {
      ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
      schedule_event: true,
      schedule_only: true,
      schedule_storage_type: SAFE_WORK_HUB_TYPE,
      schedule_requested_type: LEGACY_SCHEDULE_TYPE,
      schedule_notify_all: true,
      notify_assignee: false,
      assignment_scope: null,
      assignment_batch_id: null,
      assignment_mode: 'calendar_visibility',
      schedule_viewer_ids: viewerIds,
    },
  };
}

function rewriteSchedulePayload(value) {
  return Array.isArray(value) ? value.map(rewriteScheduleRow) : rewriteScheduleRow(value);
}

function payloadContainsSchedule(value) {
  return Array.isArray(value) ? value.some(isScheduleRow) : isScheduleRow(value);
}

function filterScheduleRows(response, shouldFilter) {
  if (!shouldFilter || !Array.isArray(response?.data)) return response;
  const data = response.data.filter((row) => !isScheduleRow(row));
  if (data.length === response.data.length) return response;
  const removed = response.data.length - data.length;
  return {
    ...response,
    data,
    count: Number.isFinite(response.count) ? Math.max(0, response.count - removed) : response.count,
  };
}

function wrapWorkHubBuilder(builder, context = { includeScheduleRows: false, taskListQuery: false }) {
  if (!builder || typeof builder !== 'object') return builder;
  return new Proxy(builder, {
    get(target, property) {
      if (property === 'then') {
        return (onFulfilled, onRejected) => target.then(
          (response) => {
            const filtered = filterScheduleRows(
              response,
              context.taskListQuery && !context.includeScheduleRows,
            );
            return typeof onFulfilled === 'function' ? onFulfilled(filtered) : filtered;
          },
          onRejected,
        );
      }
      if (property === 'select') {
        return (...args) => wrapWorkHubBuilder(target.select(...args), {
          ...context,
          taskListQuery: normalizeColumns(args[0]) === normalizeColumns(WORK_HUB_TASK_LIST_COLUMNS),
        });
      }
      if (property === 'eq') {
        return (column, value) => {
          if (column === 'item_type' && value === LEGACY_SCHEDULE_TYPE && typeof target.contains === 'function') {
            return wrapWorkHubBuilder(
              target.contains('metadata', { schedule_event: true }),
              { ...context, includeScheduleRows: true },
            );
          }
          return wrapWorkHubBuilder(target.eq(column, value), context);
        };
      }
      if (property === 'insert' || property === 'update' || property === 'upsert') {
        return (value, ...args) => wrapWorkHubBuilder(
          target[property](rewriteSchedulePayload(value), ...args),
          { ...context, includeScheduleRows: context.includeScheduleRows || payloadContainsSchedule(value) },
        );
      }
      const current = Reflect.get(target, property, target);
      if (typeof current !== 'function') return current;
      return (...args) => {
        const next = current.apply(target, args);
        return next && typeof next === 'object' && !Array.isArray(next)
          ? wrapWorkHubBuilder(next, context)
          : next;
      };
    },
  });
}

function rewriteAutomationEventRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  if (!Object.prototype.hasOwnProperty.call(row, 'id')) return row;
  if (UUID_PATTERN.test(String(row.id || ''))) return row;
  const { id: invalidLocalId, ...cloudRow } = row;
  void invalidLocalId;
  return cloudRow;
}

function rewriteAutomationEventPayload(value) {
  return Array.isArray(value) ? value.map(rewriteAutomationEventRow) : rewriteAutomationEventRow(value);
}

function wrapAutomationEventBuilder(builder) {
  if (!builder || typeof builder !== 'object') return builder;
  return new Proxy(builder, {
    get(target, property) {
      if (property === 'insert' || property === 'upsert') {
        return (value, ...args) => target[property](rewriteAutomationEventPayload(value), ...args);
      }
      const current = Reflect.get(target, property, target);
      return typeof current === 'function' ? current.bind(target) : current;
    },
  });
}

function patchWorkHubRealtime(client) {
  if (!client || typeof client.channel !== 'function') return;
  const originalChannel = client.channel.bind(client);
  client.channel = (name, ...args) => {
    const channel = originalChannel(name, ...args);
    if (!String(name || '').startsWith(WORK_HUB_REALTIME_PREFIX) || typeof channel?.on !== 'function') {
      return channel;
    }
    const originalOn = channel.on.bind(channel);
    channel.on = (type, filter, callback) => {
      const suppressSchedule = type === 'postgres_changes' && filter?.table === 'work_hub_items';
      if (!suppressSchedule || typeof callback !== 'function') return originalOn(type, filter, callback);
      return originalOn(type, filter, (payload) => {
        if (isScheduleRow(realtimeRow(payload))) return;
        callback(payload);
      });
    };
    return channel;
  };
}

function cleanScheduleRowsFromWorkHubCache() {
  if (typeof window === 'undefined') return false;
  let changed = false;
  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(WORK_HUB_CACHE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => {
    try {
      const value = JSON.parse(window.localStorage.getItem(key) || '[]');
      if (!Array.isArray(value)) return;
      const filtered = value.filter((row) => !isScheduleRow(row));
      if (filtered.length === value.length) return;
      window.localStorage.setItem(key, JSON.stringify(filtered));
      const suffix = key.slice(WORK_HUB_CACHE_PREFIX.length);
      window.localStorage.removeItem(`${WORK_HUB_SYNC_PREFIX}${suffix}`);
      changed = true;
    } catch {
      // Ignore malformed optional cache entries.
    }
  });
  return changed;
}

function refreshWorkHubAfterSeparation() {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(WORK_HUB_REFRESH_EVENT, {
      detail: { type: 'schedule-separated', source: 'work-schedule', force: true },
    }));
  }, 0);
}

export function ensureWorkScheduleDatabaseCompatibility() {
  const client = getRuntimeClient();
  if (!client || client[PATCH_MARK]) return client;

  const originalFrom = client.from.bind(client);
  client.from = (table) => {
    const builder = originalFrom(table);
    if (table === 'work_hub_items') return wrapWorkHubBuilder(builder);
    if (table === 'automation_events') return wrapAutomationEventBuilder(builder);
    return builder;
  };
  patchWorkHubRealtime(client);

  try {
    Object.defineProperty(client, PATCH_MARK, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  } catch {
    client[PATCH_MARK] = true;
  }

  cleanScheduleRowsFromWorkHubCache();
  refreshWorkHubAfterSeparation();
  return client;
}

export const WORK_SCHEDULE_STORAGE_TYPE = SAFE_WORK_HUB_TYPE;
