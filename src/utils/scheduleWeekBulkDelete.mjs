/** Week-scoped schedule deletion. Calendar dates are anchored to Asia/Ho_Chi_Minh. */
const VIETNAM_OFFSET = '+07:00';
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function assertDayKey(dayKey) {
  if (!ISO_DAY.test(String(dayKey || ''))) throw new Error('Invalid calendar date');
  const date = new Date(dayKey + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dayKey) {
    throw new Error('Invalid calendar date');
  }
  return date;
}

function addUtcDays(day, days) {
  const value = new Date(assertDayKey(day).getTime());
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function scheduleWeekWindow(anchorDay) {
  const date = assertDayKey(anchorDay);
  const offset = (date.getUTCDay() + 6) % 7;
  const monday = addUtcDays(anchorDay, -offset);
  const endExclusive = addUtcDays(monday, 7);
  return {
    monday,
    sunday: addUtcDays(monday, 6),
    endExclusive,
    startAt: new Date(monday + 'T00:00:00' + VIETNAM_OFFSET).toISOString(),
    endAt: new Date(endExclusive + 'T00:00:00' + VIETNAM_OFFSET).toISOString(),
  };
}

export function moveScheduleWeek(anchorDay, weeks = 1) {
  return addUtcDays(scheduleWeekWindow(anchorDay).monday, Number(weeks) * 7);
}

// A past import stored schedule records with the default item_type='task'.
// The source and metadata guards MUST both be present to avoid ordinary tasks.
export const LEGACY_SCHEDULE_SOURCE = 'work-schedule-import-v1168';

export function isLegacyScheduleItem(item) {
  return item?.item_type === 'task'
    && item?.source_module === LEGACY_SCHEDULE_SOURCE
    && item?.metadata?.schedule_event === true;
}

export function isWeekDeletableScheduleItem(item) {
  return item?.item_type === 'schedule' || isLegacyScheduleItem(item);
}

export function isImportedScheduleItem(item) {
  const m = item?.metadata || {};
  return isWeekDeletableScheduleItem(item)
    && m.schedule_manual !== true
    && Boolean(m.schedule_import_id || m.schedule_source_file || m.schedule_imported_at);
}

/** Never matches ordinary work-hub tasks, even with matching dates or misleading metadata. */
export function eligibleScheduleWeekRows(rows = [], window, includeManual = false) {
  const start = Date.parse(window?.startAt || '');
  const end = Date.parse(window?.endAt || '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const seen = new Set();
  return rows.filter((item) => {
    if (!item?.id || !isWeekDeletableScheduleItem(item) || seen.has(item.id)) return false;
    const date = Date.parse(item.due_at || '');
    if (!Number.isFinite(date) || date < start || date >= end) return false;
    if (!includeManual && !isImportedScheduleItem(item)) return false;
    seen.add(item.id);
    return true;
  });
}

/** A stale confirmation must never delete a row that changed since preview. */
export function deletionPreviewIsCurrent(preview = [], checked = []) {
  if (!Array.isArray(preview) || !Array.isArray(checked) || preview.length !== checked.length) return false;
  const map = new Map(preview.map((row) => [row.id, row]));
  return checked.every((item) => {
    const saved = map.get(item.id);
    return saved && isWeekDeletableScheduleItem(saved) && isWeekDeletableScheduleItem(item)
      && saved.item_type === item.item_type
      && (saved.source_module || '') === (item.source_module || '')
      && saved.title === item.title
      && saved.due_at === item.due_at
      && isImportedScheduleItem(saved) === isImportedScheduleItem(item)
      && (saved.metadata?.schedule_import_id || '') === (item.metadata?.schedule_import_id || '');
  });
}

export function scheduleDeleteBatches(rows = [], size = 40) {
  if (!Number.isInteger(size) || size < 1 || size > 100) throw new Error('Invalid deletion batch size');
  const ids = [...new Set(rows.map((row) => row.id).filter(Boolean))];
  const parts = [];
  for (let index = 0; index < ids.length; index += size) parts.push(ids.slice(index, index + size));
  return parts;
}
