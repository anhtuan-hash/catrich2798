import { invalidateSupabaseReadCacheForTable, isSupabaseConfigured, supabase } from './supabase.js';

const PAGE_SIZE = 1000;
const EVENT_COLUMNS = 'id,practice_id,event_type,device_id,metadata,created_at';
const RESULT_COLUMNS = 'id,practice_id,device_id,student_name,class_code,student_code,score,max_score,correct_count,question_count,duration_seconds,answers,metadata,created_at';

function requireClient() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình cho website Brian.');
  return supabase;
}

function text(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function comparable(value) {
  return text(value).toLocaleLowerCase('vi-VN');
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateValue(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
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

export function resultStudentKey(result) {
  const code = comparable(result?.student_code);
  if (code) return `code:${code}`;
  return `identity:${comparable(result?.class_code)}:${comparable(result?.student_name)}`;
}

export function resultPercentage(result) {
  const score = numberOrNull(result?.score);
  const maxScore = numberOrNull(result?.max_score);
  if (score !== null && maxScore !== null && maxScore > 0) return Math.max(0, Math.min(100, (score / maxScore) * 100));
  const correct = numberOrNull(result?.correct_count);
  const questions = numberOrNull(result?.question_count);
  if (correct !== null && questions !== null && questions > 0) return Math.max(0, Math.min(100, (correct / questions) * 100));
  return null;
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
  const within = (row) => {
    const timestamp = dateValue(row?.created_at);
    return timestamp >= start && timestamp <= end;
  };
  return {
    events: (data?.events || []).filter(within),
    results: (data?.results || []).filter(within),
  };
}

function average(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}

export function summarizeWeeklyPracticeStatistics(data) {
  const events = data?.events || [];
  const results = data?.results || [];
  const opens = events.filter((event) => event.event_type === 'open');
  const completions = events.filter((event) => event.event_type === 'complete');
  const errors = events.filter((event) => event.event_type === 'error');
  const openDevices = new Set(opens.map((event) => text(event.device_id)).filter(Boolean));
  const completedDevices = new Set(completions.map((event) => text(event.device_id)).filter(Boolean));
  const studentKeys = new Set(results.map(resultStudentKey));
  const attemptsByStudent = new Map();
  results.forEach((result) => {
    const key = resultStudentKey(result);
    attemptsByStudent.set(key, (attemptsByStudent.get(key) || 0) + 1);
  });
  const percentages = results.map(resultPercentage).filter((value) => value !== null);
  const durations = results.map((result) => numberOrNull(result.duration_seconds)).filter((value) => value !== null);

  return {
    openCount: opens.length,
    uniqueDeviceCount: openDevices.size,
    completionCount: completions.length,
    completedDeviceCount: completedDevices.size,
    submissionCount: results.length,
    uniqueStudentCount: studentKeys.size,
    errorCount: errors.length,
    completionRate: openDevices.size ? (completedDevices.size / openDevices.size) * 100 : 0,
    averagePercentage: average(percentages),
    averageDurationSeconds: average(durations),
    repeaterCount: [...attemptsByStudent.values()].filter((count) => count > 1).length,
  };
}

export function groupWeeklyPracticeResultsByClass(results) {
  const groups = new Map();
  (results || []).forEach((result) => {
    const classCode = text(result.class_code) || 'Chưa xác định';
    const key = comparable(classCode);
    const group = groups.get(key) || { classCode, results: [], students: new Set(), percentages: [], durations: [] };
    group.results.push(result);
    group.students.add(resultStudentKey(result));
    const percentage = resultPercentage(result);
    if (percentage !== null) group.percentages.push(percentage);
    const duration = numberOrNull(result.duration_seconds);
    if (duration !== null) group.durations.push(duration);
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => ({
    classCode: group.classCode,
    uniqueStudents: group.students.size,
    attempts: group.results.length,
    averagePercentage: average(group.percentages),
    averageDurationSeconds: average(group.durations),
    latestAt: group.results.reduce((latest, result) => dateValue(result.created_at) > dateValue(latest) ? result.created_at : latest, ''),
  })).sort((a, b) => a.classCode.localeCompare(b.classCode, 'vi', { numeric: true }));
}

export function selectWeeklyPracticeStudentAttempts(results, mode = 'latest') {
  const sorted = [...(results || [])].sort((a, b) => dateValue(a.created_at) - dateValue(b.created_at));
  if (mode === 'all') return sorted.reverse();
  const selected = new Map();
  sorted.forEach((result) => {
    const key = resultStudentKey(result);
    const previous = selected.get(key);
    if (!previous || mode === 'latest') selected.set(key, result);
    if (mode === 'best') {
      const nextScore = resultPercentage(result) ?? -1;
      const previousScore = resultPercentage(previous) ?? -1;
      if (!previous || nextScore > previousScore || (nextScore === previousScore && dateValue(result.created_at) > dateValue(previous.created_at))) {
        selected.set(key, result);
      }
    }
  });
  return [...selected.values()].sort((a, b) => {
    const classCompare = text(a.class_code).localeCompare(text(b.class_code), 'vi', { numeric: true });
    return classCompare || text(a.student_name).localeCompare(text(b.student_name), 'vi');
  });
}

export async function deleteWeeklyPracticeResult(resultId) {
  const client = requireClient();
  const { error } = await client.from('weekly_practice_results').delete().eq('id', resultId);
  if (error) throw error;
  invalidateSupabaseReadCacheForTable('weekly_practice_results');
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

export function buildWeeklyPracticeResultsCsv(item, results) {
  const headings = [
    'Bài luyện tập', 'Tuần', 'Họ và tên', 'Lớp', 'Mã học sinh', 'Điểm', 'Điểm tối đa',
    'Tỷ lệ (%)', 'Số câu đúng', 'Tổng số câu', 'Thời gian (giây)', 'Ngày giờ nộp', 'Mã lượt nộp',
  ];
  const rows = (results || []).map((result) => [
    item?.title || '', item?.week_key || '', result.student_name, result.class_code, result.student_code,
    result.score, result.max_score, resultPercentage(result)?.toFixed(2) || '', result.correct_count,
    result.question_count, result.duration_seconds, result.created_at, result.id,
  ]);
  return `\uFEFF${[headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}
