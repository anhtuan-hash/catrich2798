const MIGRATION_EVENT = 'bes-config-migration-complete';
const BACKUP_PREFIX = 'bes-config-backup-v1086';
const REPORT_KEY = 'bes-config-migration-report-v1086';

const STORAGE_SCHEMAS = [
  {
    id: 'launcher',
    legacyKeys: ['bes-launcher-config-v3'],
    targetKey: 'bes-launcher-config-v4',
    targetVersion: 4,
    migrate(value) {
      const source = value && typeof value === 'object' ? value : {};
      return {
        schemaVersion: 4,
        version: 4,
        order: Array.isArray(source.order) ? source.order : [],
        pinned: Array.isArray(source.pinned) ? source.pinned : [],
        hidden: Array.isArray(source.hidden) ? source.hidden : [],
        nav: Array.isArray(source.nav) ? source.nav : [],
        groups: Array.isArray(source.groups) ? source.groups : [],
        assignments: source.assignments && typeof source.assignments === 'object' && !Array.isArray(source.assignments) ? source.assignments : {},
        updatedAt: Number(source.updatedAt) || Date.now(),
        migratedAt: Date.now(),
      };
    },
  },
  {
    id: 'ai-governance',
    pattern: /^bes-ai-governance-settings:v1$/,
    targetVersion: 1,
    migrate(value) {
      const source = value && typeof value === 'object' ? value : {};
      return {
        ...source,
        schemaVersion: 1,
        enabled: source.enabled !== false,
        allowActions: source.allowActions !== false,
        requireActionConfirmation: source.requireActionConfirmation !== false,
        actionTargets: source.actionTargets && typeof source.actionTargets === 'object' && !Array.isArray(source.actionTargets) ? source.actionTargets : {},
        profiles: source.profiles && typeof source.profiles === 'object' && !Array.isArray(source.profiles) ? source.profiles : {},
        updatedAt: source.updatedAt || new Date().toISOString(),
      };
    },
  },
];

function safeParse(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return raw;
  let current = raw;
  for (let i = 0; i < 3 && typeof current === 'string'; i += 1) {
    try { current = JSON.parse(current); } catch { return null; }
  }
  return current;
}

function safeStringify(value) {
  try { return JSON.stringify(value); } catch { return ''; }
}

function backupKey(key) {
  return `${BACKUP_PREFIX}:${key}:${Date.now()}`;
}

function writeBackup(storage, key, raw) {
  try {
    storage.setItem(backupKey(key), String(raw ?? ''));
    return true;
  } catch {
    return false;
  }
}

function migrateOne(storage, schema, key, raw, targetKey = key) {
  const parsed = safeParse(raw);
  if (parsed && Number(parsed.schemaVersion) === schema.targetVersion) {
    if (targetKey !== key) {
      storage.setItem(targetKey, safeStringify(parsed));
    }
    return { id: schema.id, key, targetKey, status: 'current' };
  }

  writeBackup(storage, key, raw);
  try {
    const migrated = schema.migrate(parsed);
    const serialized = safeStringify(migrated);
    if (!serialized) throw new Error('Cannot serialize migrated configuration');
    storage.setItem(targetKey, serialized);
    return { id: schema.id, key, targetKey, status: 'migrated' };
  } catch (error) {
    return { id: schema.id, key, targetKey, status: 'failed', error: String(error?.message || error) };
  }
}

function matchingKeys(storage, schema) {
  const keys = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    if (schema.pattern?.test(key)) keys.push(key);
  }
  return keys;
}

export function runConfigurationMigrations() {
  if (typeof window === 'undefined' || !window.localStorage) return { ranAt: Date.now(), results: [] };
  const storage = window.localStorage;
  const results = [];


  // Retire stale open-app tab state from V10.85/V11 without recreating it.
  const retiredWorkspaceKeys = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith('bes-workspace-tabs:')) retiredWorkspaceKeys.push(key);
  }
  retiredWorkspaceKeys.forEach((key) => {
    const raw = storage.getItem(key);
    writeBackup(storage, key, raw);
    storage.removeItem(key);
    results.push({ id: 'workspace-tabs-retired', key, status: 'removed' });
  });

  STORAGE_SCHEMAS.forEach((schema) => {
    if (schema.legacyKeys?.length) {
      const existingTarget = storage.getItem(schema.targetKey);
      if (existingTarget) {
        results.push(migrateOne(storage, schema, schema.targetKey, existingTarget, schema.targetKey));
        return;
      }
      const sourceKey = schema.legacyKeys.find((key) => storage.getItem(key) != null);
      if (sourceKey) results.push(migrateOne(storage, schema, sourceKey, storage.getItem(sourceKey), schema.targetKey));
      return;
    }

    matchingKeys(storage, schema).forEach((key) => {
      results.push(migrateOne(storage, schema, key, storage.getItem(key), key));
    });
  });

  const report = { ranAt: Date.now(), version: '10.86.0', results };
  try { storage.setItem(REPORT_KEY, JSON.stringify(report)); } catch { /* optional */ }
  try { window.dispatchEvent(new CustomEvent(MIGRATION_EVENT, { detail: report })); } catch { /* optional */ }
  return report;
}

export function getMigrationReport() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(window.localStorage.getItem(REPORT_KEY) || 'null'); } catch { return null; }
}

export function listConfigurationBackups() {
  if (typeof window === 'undefined') return [];
  const storage = window.localStorage;
  const items = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key?.startsWith(`${BACKUP_PREFIX}:`)) continue;
    items.push({ key, raw: storage.getItem(key) || '' });
  }
  return items.sort((a, b) => b.key.localeCompare(a.key));
}

export { MIGRATION_EVENT };
