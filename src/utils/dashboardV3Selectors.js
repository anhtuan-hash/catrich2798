import { dashboardLocalDayKey, dashboardDayOffset } from './dashboardClassification.js';
function getDashboardDueState(value, done = false, now = new Date()) {
  if (!value || done) return 'normal';
  const days = dashboardDayOffset(value, now);
  if (days === null) return 'normal';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  return 'normal';
}

const lower = (value) => String(value || '').toLocaleLowerCase('vi').normalize('NFC');
const safeTime = (value) => {
  const time = Date.parse(String(value || ''));
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
};
export function sortDashboardTasks(items, mode = 'urgency', now = new Date()) {
  const priority = { urgent: 0, high: 1, normal: 2, low: 3 };
  const urgency = { overdue: 0, today: 1, soon: 2, normal: 3 };
  return [...(items || [])].sort((a, b) => {
    if (mode === 'recent') return safeTime(b.updatedAt || b.raw?.updated_at) - safeTime(a.updatedAt || a.raw?.updated_at);
    if (mode === 'date') return safeTime(a.date) - safeTime(b.date);
    const aa = urgency[getDashboardDueState(a.date, a.done, now)] ?? 3;
    const bb = urgency[getDashboardDueState(b.date, b.done, now)] ?? 3;
    return aa - bb || (priority[a.priority] ?? 2) - (priority[b.priority] ?? 2)
      || safeTime(a.date) - safeTime(b.date);
  });
}
export function filterDashboardTasks(items, { group = 'all', query = '', priority = 'all', owner = 'all', sort = 'urgency' } = {}, now = new Date()) {
  const normalized = lower(query.trim());
  const chosen = (items || []).filter(item => {
    if (group !== 'all' && group !== 'approvals' && getDashboardDueState(item.date, item.done, now) !== group) return false;
    if (priority !== 'all' && item.priority !== priority) return false;
    if (owner === 'mine' && !item.mine) return false;
    if (normalized && ![item.title, item.description, item.owner, item.sourceLabel]
      .some(value => lower(value).includes(normalized))) return false;
    return true;
  });
  return sortDashboardTasks(chosen, sort, now);
}
export function buildDashboardBrief(snapshot, now = new Date()) {
  const items = (snapshot?.attention || []).filter(item => !item.done);
  const ordered = sortDashboardTasks(items, 'urgency', now);
  const upcoming = (snapshot?.timeline || []).filter(item => {
    const date = Date.parse(item.date);
    return Number.isFinite(date) && date >= now.getTime();
  }).sort((a,b)=>safeTime(a.date)-safeTime(b.date));
  return {
    urgent: items.filter(item => ['high','urgent'].includes(item.priority)).length,
    overdue: items.filter(item => getDashboardDueState(item.date, item.done, now) === 'overdue').length,
    today: items.filter(item => getDashboardDueState(item.date, item.done, now) === 'today').length,
    focus: ordered.slice(0, 3),
    next: upcoming[0] || null,
    generatedAt: snapshot?.generatedAt || null,
    limited: Boolean(snapshot?.coverageLimited || snapshot?.sourceErrors?.length),
  };
}
export function getDashboardMonthGrid(now, offset = 0, events = []) {
  const year = now.getFullYear();
  const month = now.getMonth() + Math.min(1, Math.max(0, offset));
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const total = Math.ceil((mondayOffset + last.getDate()) / 7) * 7;
  const grouped = new Map();
  for (const event of events || []) {
    const key = dashboardLocalDayKey(event.date);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) || []), event]);
  }
  return Array.from({length: total}, (_, i) => {
    const date = new Date(year, month, 1 - mondayOffset + i);
    const key = dashboardLocalDayKey(date);
    return { date, key, inMonth: date.getMonth() === first.getMonth(), today: key === dashboardLocalDayKey(now), events: grouped.get(key) || [] };
  });
}
