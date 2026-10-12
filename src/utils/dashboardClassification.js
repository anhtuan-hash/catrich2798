/**
 * Dashboard-only classification. Calendar events and attendance/teaching sessions
 * are not outstanding tasks simply because their start time is in the past.
 * This file does not change persisted records or Work Hub permissions.
 */
export function isDashboardSchedule(item) {
  const raw = item?.raw || item;
  return Boolean(item?.schedule === true
    || raw?.item_type === 'schedule'
    || raw?.metadata?.schedule_event === true);
}

export function isDashboardActionableTask(item) {
  if (!item || item.done) return false;
  if (item.source && item.source !== 'work') return false;
  return !isDashboardSchedule(item);
}

export function isDashboardTeachingPeriod(item) {
  const raw = item?.raw || item;
  const value = [
    item?.title, item?.description, item?.sourceLabel,
    raw?.source_module, raw?.metadata?.schedule_note,
  ].filter(Boolean).join(' ');
  return /tiết\s*dạy|teaching\s*period|lesson\s*period|thời\s*khóa\s*biểu|timetable/i.test(value);
}

export function dashboardLocalDayKey(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dashboardDayOffset(value, today = new Date()) {
  const candidate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(candidate.getTime())) return null;
  const local = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
  const baseline = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()) -
    Date.UTC(baseline.getFullYear(), baseline.getMonth(), baseline.getDate())) / 86400000);
}
