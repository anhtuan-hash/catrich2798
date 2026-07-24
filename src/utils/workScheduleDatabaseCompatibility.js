import { getRuntimeClient } from '../services/runtime/core.js';

const PATCH_MARK = Symbol.for('bes.workScheduleDatabaseCompatibility.v1');
const LEGACY_SCHEDULE_TYPE = 'schedule';
const SAFE_WORK_HUB_TYPE = 'task';

function rewriteScheduleRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  if (row.item_type !== LEGACY_SCHEDULE_TYPE) return row;
  return {
    ...row,
    item_type: SAFE_WORK_HUB_TYPE,
    metadata: {
      ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
      schedule_event: true,
      schedule_storage_type: SAFE_WORK_HUB_TYPE,
      schedule_requested_type: LEGACY_SCHEDULE_TYPE,
    },
  };
}

function rewriteSchedulePayload(value) {
  return Array.isArray(value) ? value.map(rewriteScheduleRow) : rewriteScheduleRow(value);
}

function wrapScheduleFilter(builder) {
  if (!builder || typeof builder !== 'object') return builder;
  return new Proxy(builder, {
    get(target, property, receiver) {
      if (property === 'eq') {
        return (column, value) => {
          if (column === 'item_type' && value === LEGACY_SCHEDULE_TYPE && typeof target.contains === 'function') {
            return target.contains('metadata', { schedule_event: true });
          }
          return target.eq(column, value);
        };
      }
      const current = Reflect.get(target, property, receiver);
      return typeof current === 'function' ? current.bind(target) : current;
    },
  });
}

function wrapWorkHubBuilder(builder) {
  if (!builder || typeof builder !== 'object') return builder;
  return new Proxy(builder, {
    get(target, property, receiver) {
      if (property === 'select') {
        return (...args) => wrapScheduleFilter(target.select(...args));
      }
      if (property === 'insert' || property === 'update' || property === 'upsert') {
        return (value, ...args) => target[property](rewriteSchedulePayload(value), ...args);
      }
      const current = Reflect.get(target, property, receiver);
      return typeof current === 'function' ? current.bind(target) : current;
    },
  });
}

export function ensureWorkScheduleDatabaseCompatibility() {
  const client = getRuntimeClient();
  if (!client || client[PATCH_MARK]) return client;

  const originalFrom = client.from.bind(client);
  client.from = (table) => {
    const builder = originalFrom(table);
    return table === 'work_hub_items' ? wrapWorkHubBuilder(builder) : builder;
  };

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
  return client;
}

export const WORK_SCHEDULE_STORAGE_TYPE = SAFE_WORK_HUB_TYPE;
