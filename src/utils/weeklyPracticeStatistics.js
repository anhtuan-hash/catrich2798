import { invalidateSupabaseReadCacheForTable, isSupabaseConfigured, supabase } from './supabase.js';
import { WEEKLY_PRACTICE_PROOF_BUCKET } from './weeklyPractice.js';

const PAGE_SIZE = 1000;
const EVENT_COLUMNS = 'id,practice_id,event_type,device_id,metadata,created_at';
const RESULT_COLUMNS = 'id,practice_id,device_id,student_name,class_code,student_code,score,max_score,correct_count,question_count,duration_seconds,proof_path,metadata,created_at';

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

async function readAll(table, columns, practiceId) {
  const client = requireClient();
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
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
  if (!practiceId) return { events: [], results: [] };
  const [events, results] = await Promise.all([
    readAll('weekly_practice_events', EVENT_COLUMNS, practiceId),
    readAll('weekly_practice_results', RESULT_COLUMNS, practiceId),
  ]);
  return { events, results };
}

export function filterWeeklyPracticeStatistics(data, filters = {}) {
  const start = filters.start ? new Date(`${filters.start}T00:00:00`).getTime() : 0;
  const end = filters.end ? new Date(`${filters.end}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  const classCode = text(filters.classCode);
  const insideRange = (row) => {
    const timestamp = dateValue(row?.created_at);
    return timestamp >= start && timestamp <= end;
  };
  return {
    events: (data?.events || []).filter(insideRange),
    results: (data?.results || []).filter((row) => insideRange(row) && (!classCode || row.class_code === classCode)),
  };
}

export function summarizeWeeklyPracticeStatistics(data) {
  const events = data?.events || [];
  const results = data?.results || [];
  const opens = events.filter((event) => event.event_type === 'open');
  const errors = events.filter((event) => event.event_type === 'error');
  const openedDevices = new Set(opens.map((event) => text(event.device_id)).filter(Boolean));
  const submittedDevices = new Set(results.map((result) => text(result.device_id)).filter(Boolean));
  const completionRate = openedDevices.size
    ? Math.min(100, (submittedDevices.size / openedDevices.size) * 100)
    : 0;
  const durationTotal = results.reduce((sum, row) => sum + Math.max(0, Number(row.duration_seconds || 0)), 0);
  const classCount = new Set(results.map((row) => text(row.class_code)).filter(Boolean)).size;

  return {
    openEventCount: opens.length,
    openedStudentEstimate: openedDevices.size,
    submittedCount: results.length,
    uniqueSubmittedDevices: submittedDevices.size,
    completionRate,
    averageDurationSeconds: results.length ? Math.round(durationTotal / results.length) : 0,
    classCount,
    errorCount: errors.length,
  };
}

export function groupWeeklyPracticeEventsByDay(data) {
  const groups = new Map();
  (data?.events || []).forEach((event) => {
    if (event.event_type !== 'open') return;
    const key = localDateKey(event.created_at);
    if (!key) return;
    const group = groups.get(key) || { date: key, openEvents: 0, openedDevices: new Set(), submissions: 0, classes: new Set() };
    group.openEvents += 1;
    if (event.device_id) group.openedDevices.add(event.device_id);
    groups.set(key, group);
  });
  (data?.results || []).forEach((result) => {
    const key = localDateKey(result.created_at);
    if (!key) return;
    const group = groups.get(key) || { date: key, openEvents: 0, openedDevices: new Set(), submissions: 0, classes: new Set() };
    group.submissions += 1;
    if (result.class_code) group.classes.add(result.class_code);
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => ({
    date: group.date,
    openEvents: group.openEvents,
    openedStudentEstimate: group.openedDevices.size,
    submissions: group.submissions,
    classCount: group.classes.size,
    completionRate: group.openedDevices.size ? Math.min(100, (group.submissions / group.openedDevices.size) * 100) : 0,
  })).sort((a, b) => b.date.localeCompare(a.date));
}

export async function createWeeklyPracticeProofUrl(path) {
  const cleanPath = text(path);
  if (!cleanPath) throw new Error('Bài nộp chưa có ảnh xác nhận.');
  const client = requireClient();
  const { data, error } = await client.storage
    .from(WEEKLY_PRACTICE_PROOF_BUCKET)
    .createSignedUrl(cleanPath, 120);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Không thể mở ảnh xác nhận.');
  return data.signedUrl;
}

export async function clearWeeklyPracticeStatistics(practiceId) {
  const client = requireClient();
  const { data: resultRows, error: resultReadError } = await client
    .from('weekly_practice_results')
    .select('proof_path')
    .eq('practice_id', practiceId);
  if (resultReadError) throw resultReadError;
  const proofPaths = (resultRows || []).map((row) => text(row.proof_path)).filter(Boolean);
  if (proofPaths.length) {
    const { error: removeError } = await client.storage.from(WEEKLY_PRACTICE_PROOF_BUCKET).remove(proofPaths);
    if (removeError) throw removeError;
  }
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

export function buildWeeklyPracticeResultsCsv(item, results) {
  const headings = [
    'Bài luyện tập', 'Họ và tên', 'Lớp', 'Thời gian nộp', 'Thời lượng (giây)',
    'Điểm', 'Điểm tối đa', 'Số câu đúng', 'Tổng số câu', 'Mã minh chứng', 'Đường dẫn ảnh xác nhận',
  ];
  const dataRows = (results || []).map((row) => [
    item?.title || '',
    row.student_name || '',
    row.class_code || '',
    row.created_at || '',
    row.duration_seconds ?? '',
    row.score ?? '',
    row.max_score ?? '',
    row.correct_count ?? '',
    row.question_count ?? '',
    row.metadata?.proofCode || '',
    row.proof_path || '',
  ]);
  return `\uFEFF${[headings, ...dataRows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}
