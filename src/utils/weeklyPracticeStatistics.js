import { invalidateSupabaseReadCacheForTable, isSupabaseConfigured, supabase } from './supabase.js';

const PAGE_SIZE = 1000;
const EVENT_COLUMNS = 'id,practice_id,event_type,device_id,metadata,created_at';

function requireClient() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình cho website Brian.');
  return supabase;
}

function text(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function dateValue(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function localDateKey(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function readAllEvents(practiceId) {
  const client = requireClient();
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('weekly_practice_events')
      .select(EVENT_COLUMNS)
      .eq('practice_id', practiceId)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function loadWeeklyPracticeStatistics(practiceId) {
  if (!practiceId) return { events: [] };
  return { events: await readAllEvents(practiceId) };
}

export function filterWeeklyPracticeStatistics(data, filters = {}) {
  const start = filters.start ? new Date(`${filters.start}T00:00:00`).getTime() : 0;
  const end = filters.end ? new Date(`${filters.end}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  return {
    events: (data?.events || []).filter((row) => {
      const timestamp = dateValue(row?.created_at);
      return timestamp >= start && timestamp <= end;
    }),
  };
}

export function summarizeWeeklyPracticeStatistics(data) {
  const events = data?.events || [];
  const opens = events.filter((event) => event.event_type === 'open');
  const completions = events.filter((event) => event.event_type === 'complete');
  const errors = events.filter((event) => event.event_type === 'error');
  const openedDevices = new Set(opens.map((event) => text(event.device_id)).filter(Boolean));
  const completedDevices = new Set(completions.map((event) => text(event.device_id)).filter(Boolean));
  const completedAfterOpen = new Set([...completedDevices].filter((deviceId) => openedDevices.has(deviceId)));
  const completionRate = openedDevices.size
    ? Math.min(100, (completedAfterOpen.size / openedDevices.size) * 100)
    : 0;

  return {
    openEventCount: opens.length,
    openedStudentEstimate: openedDevices.size,
    completionEventCount: completions.length,
    completedStudentEstimate: completedDevices.size,
    completionRate,
    errorCount: errors.length,
  };
}

export function groupWeeklyPracticeEventsByDay(data) {
  const groups = new Map();
  (data?.events || []).forEach((event) => {
    if (!['open', 'complete'].includes(event.event_type)) return;
    const key = localDateKey(event.created_at);
    if (!key) return;
    const group = groups.get(key) || {
      date: key,
      openEvents: 0,
      completionEvents: 0,
      openedDevices: new Set(),
      completedDevices: new Set(),
    };
    const deviceId = text(event.device_id);
    if (event.event_type === 'open') {
      group.openEvents += 1;
      if (deviceId) group.openedDevices.add(deviceId);
    }
    if (event.event_type === 'complete') {
      group.completionEvents += 1;
      if (deviceId) group.completedDevices.add(deviceId);
    }
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => ({
    date: group.date,
    openEvents: group.openEvents,
    completionEvents: group.completionEvents,
    openedStudentEstimate: group.openedDevices.size,
    completedStudentEstimate: group.completedDevices.size,
    completionRate: group.openedDevices.size
      ? Math.min(100, (group.completedDevices.size / group.openedDevices.size) * 100)
      : 0,
  })).sort((a, b) => b.date.localeCompare(a.date));
}

export async function clearWeeklyPracticeStatistics(practiceId) {
  const client = requireClient();
  const [resultsDelete, eventsDelete] = await Promise.all([
    client.from('weekly_practice_results').delete().eq('practice_id', practiceId),
    client.from('weekly_practice_events').delete().eq('practice_id', practiceId),
  ]);
  if (resultsDelete.error) throw resultsDelete.error;
  if (eventsDelete.error) throw eventsDelete.error;
  invalidateSupabaseReadCacheForTable('weekly_practice_results');
  invalidateSupabaseReadCacheForTable('weekly_practice_events');
}

function csvCell(value) {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function buildWeeklyPracticeEventsCsv(item, summary, rows) {
  const headings = [
    'Bài luyện tập', 'Ngày', 'Học sinh mở bài (ước tính)', 'Học sinh hoàn thành (ước tính)',
    'Tỷ lệ hoàn thành (%)', 'Tổng sự kiện mở', 'Tổng sự kiện hoàn thành',
  ];
  const dataRows = (rows || []).map((row) => [
    item?.title || '', row.date, row.openedStudentEstimate, row.completedStudentEstimate,
    row.completionRate.toFixed(2), row.openEvents, row.completionEvents,
  ]);
  const totalRow = [
    item?.title || '', 'TỔNG', summary.openedStudentEstimate, summary.completedStudentEstimate,
    summary.completionRate.toFixed(2), summary.openEventCount, summary.completionEventCount,
  ];
  return `\uFEFF${[headings, totalRow, ...dataRows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}
