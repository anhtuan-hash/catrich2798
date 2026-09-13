import { WORK_SCHEDULE_ITEM_TYPE, WORK_SCHEDULE_SOURCE, scheduleFingerprint } from './workScheduleImport.js';

const LEGACY_IMPORT_SOURCE = WORK_SCHEDULE_SOURCE;

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeFileName(value) {
  return clean(value).toLowerCase();
}

function toIso(value, fallback = '') {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizedRow(row = {}) {
  const startAt = toIso(row.startAt);
  let endAt = toIso(row.endAt);
  if (!endAt && startAt) endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();
  if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
    endAt = new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();
  }
  return {
    ...row,
    title: clean(row.title),
    description: clean(row.description),
    startAt,
    endAt,
    location: clean(row.location),
    ownerText: clean(row.ownerText),
    attendees: clean(row.attendees),
    note: clean(row.note),
    priority: clean(row.priority) || 'normal',
    visibility: clean(row.visibility) || 'department',
    sourceRow: Number(row.sourceRow || 0),
    fingerprint: clean(row.fingerprint) || scheduleFingerprint({ ...row, startAt }),
  };
}

function itemImportKey(item = {}) {
  const metadata = item.metadata || {};
  return clean(metadata.schedule_import_key) || (
    metadata.schedule_source_file && metadata.schedule_source_row
      ? importOwnershipKey(metadata.schedule_source_file, metadata.schedule_source_row)
      : ''
  );
}

function itemFingerprint(item = {}) {
  const metadata = item.metadata || {};
  return clean(metadata.schedule_fingerprint) || scheduleFingerprint({
    title: item.title,
    startAt: metadata.schedule_start_at || item.due_at,
    location: metadata.schedule_location,
  });
}

function rowSignature(row = {}) {
  const normalized = normalizedRow(row);
  return JSON.stringify({
    title: normalized.title,
    description: normalized.description,
    startAt: normalized.startAt,
    endAt: normalized.endAt,
    location: normalized.location,
    ownerText: normalized.ownerText,
    attendees: normalized.attendees,
    note: normalized.note,
    priority: normalized.priority,
    visibility: normalized.visibility,
  });
}

function itemSignature(item = {}) {
  const metadata = item.metadata || {};
  return rowSignature({
    title: item.title,
    description: item.description,
    startAt: metadata.schedule_start_at || item.due_at,
    endAt: metadata.schedule_end_at,
    location: metadata.schedule_location,
    ownerText: metadata.schedule_owner_text,
    attendees: metadata.schedule_attendees,
    note: metadata.schedule_note,
    priority: item.priority,
    visibility: item.visibility,
  });
}

export function importOwnershipKey(fileName, sourceRow) {
  const normalized = normalizeFileName(fileName) || 'schedule.csv';
  const row = Math.max(0, Number.parseInt(sourceRow, 10) || 0);
  return `${normalized}::row:${row}`;
}

export function isImportManagedScheduleItem(item = {}) {
  const metadata = item.metadata || {};
  if (metadata.schedule_manual === true) return false;
  if (metadata.schedule_import_managed === true) return true;
  return Boolean(
    metadata.schedule_import_id
    || (metadata.schedule_source_file && metadata.schedule_source_row)
    || (item.source_module === LEGACY_IMPORT_SOURCE && metadata.schedule_event === true)
  );
}

export function buildScheduleItemPayload(row, options = {}) {
  const normalized = normalizedRow(row);
  const existing = options.existingItem || null;
  const existingMetadata = existing?.metadata || {};
  const fileName = clean(options.fileName || normalized.fileName || 'schedule.csv');
  const importedAt = options.importedAt || new Date().toISOString();
  const importId = clean(options.importId);
  const ownerId = options.ownerId || existing?.owner_id || existing?.created_by || null;
  const createdBy = options.createdBy || existing?.created_by || ownerId;
  const assigneeIds = Array.isArray(options.assigneeIds)
    ? options.assigneeIds
    : Array.isArray(existing?.assignee_ids) ? existing.assignee_ids : ownerId ? [ownerId] : [];

  return {
    title: normalized.title,
    description: normalized.description,
    item_type: WORK_SCHEDULE_ITEM_TYPE,
    status: existing?.status || 'assigned',
    priority: normalized.priority,
    visibility: normalized.visibility,
    owner_id: ownerId,
    created_by: createdBy,
    assignee_ids: assigneeIds,
    watcher_ids: Array.isArray(existing?.watcher_ids) ? existing.watcher_ids : [],
    due_at: normalized.startAt,
    source_module: WORK_SCHEDULE_SOURCE,
    metadata: {
      ...existingMetadata,
      schedule_event: true,
      schedule_import_managed: true,
      schedule_import_key: importOwnershipKey(fileName, normalized.sourceRow),
      schedule_import_id: importId || existingMetadata.schedule_import_id || '',
      schedule_source_file: fileName,
      schedule_source_row: normalized.sourceRow,
      schedule_imported_at: importedAt,
      schedule_start_at: normalized.startAt,
      schedule_end_at: normalized.endAt,
      schedule_location: normalized.location,
      schedule_owner_text: normalized.ownerText,
      schedule_attendees: normalized.attendees,
      schedule_note: normalized.note,
      schedule_fingerprint: normalized.fingerprint,
      schedule_notify_all: true,
      notify_assignee: false,
      connected_modules: ['ttcm', 'dashboard', 'automation'],
    },
  };
}

export function buildScheduleImportPlan({
  rows = [],
  existingItems = [],
  fileName = 'schedule.csv',
  ownerId = null,
  createdBy = null,
  assigneeIds = [],
  importId = '',
  importedAt = new Date().toISOString(),
} = {}) {
  const managed = existingItems.filter(isImportManagedScheduleItem);
  const manual = existingItems.filter((item) => !isImportManagedScheduleItem(item));
  const managedByKey = new Map(managed.map((item) => [itemImportKey(item), item]).filter(([key]) => key));
  const managedByFingerprint = new Map(managed.map((item) => [itemFingerprint(item), item]).filter(([key]) => key));
  const manualFingerprints = new Set(manual.map(itemFingerprint).filter(Boolean));

  const create = [];
  const update = [];
  const unchanged = [];
  const stats = { added: 0, updated: 0, unchanged: 0, errors: 0, manualConflicts: 0 };

  for (const rawRow of rows) {
    const row = normalizedRow(rawRow);
    if (!row.title || !row.startAt) {
      stats.errors += 1;
      continue;
    }

    const key = importOwnershipKey(fileName, row.sourceRow);
    const exactManaged = managedByKey.get(key);
    const fingerprintManaged = managedByFingerprint.get(row.fingerprint);

    if (exactManaged) {
      if (itemSignature(exactManaged) === rowSignature(row)) {
        unchanged.push({ row, item: exactManaged, reason: 'unchanged-import' });
        stats.unchanged += 1;
        continue;
      }
      const payload = buildScheduleItemPayload(row, {
        fileName, ownerId, createdBy, assigneeIds, importId, importedAt, existingItem: exactManaged,
      });
      update.push({ id: exactManaged.id, row, item: exactManaged, payload });
      stats.updated += 1;
      continue;
    }

    if (fingerprintManaged) {
      unchanged.push({ row, item: fingerprintManaged, reason: 'duplicate-import' });
      stats.unchanged += 1;
      continue;
    }

    if (manualFingerprints.has(row.fingerprint)) {
      unchanged.push({ row, reason: 'manual-conflict' });
      stats.unchanged += 1;
      stats.manualConflicts += 1;
      continue;
    }

    const payload = buildScheduleItemPayload(row, {
      fileName, ownerId, createdBy, assigneeIds, importId, importedAt,
    });
    create.push({ ...payload, row, payload });
    stats.added += 1;
  }

  return { create, update, unchanged, stats };
}
