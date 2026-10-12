import { dashboardLocalDayKey } from './dashboardClassification.js';

const safeDate = value => {
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly ? new Date(Number(value.slice(0,4)),Number(value.slice(5,7))-1,Number(value.slice(8,10))) : value instanceof Date ? value : new Date(value);
  return Number.isFinite(date?.getTime()) ? date : null;
};
const startLocalDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Pure seven-day projection; rows always correspond to exact source items. */
export function buildDashboardWeek(timeline = [], attention = [], now = new Date()) {
  const base = startLocalDay(now);
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(base);
    date.setDate(base.getDate() + offset);
    return { key: dashboardLocalDayKey(date), date, offset, events: [], tasks: [] };
  });
  const byDay = new Map(days.map(day => [day.key, day]));
  const visited = { events: new Set(), tasks: new Set() };
  for (const [kind, items] of [['events', timeline], ['tasks', attention]]) {
    for (const item of Array.isArray(items) ? items : []) {
      if (!item?.id || !item?.title || (kind === 'tasks' && item.done)) continue;
      const key = dashboardLocalDayKey(safeDate(item.date));
      const day = byDay.get(key);
      if (!day) continue;
      const uid = String(item.id);
      if (visited[kind].has(uid)) continue;
      visited[kind].add(uid);
      day[kind].push(item);
    }
  }
  for (const day of days) {
    for (const kind of ['events', 'tasks']) {
      day[kind].sort((a, b) => {
        const da = safeDate(a.date)?.getTime() ?? 0;
        const db = safeDate(b.date)?.getTime() ?? 0;
        return da - db || String(a.title).localeCompare(String(b.title), 'vi');
      });
    }
  }
  return days;
}
export function buildDashboardWeekText(days, language = 'vi') {
  const vi = language === 'vi';
  const format = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', { weekday: 'long', day:'2-digit', month:'2-digit', year:'numeric' });
  const lines = [vi ? 'BRIAN — LỊCH 7 NGÀY' : 'BRIAN — SEVEN-DAY PLAN'];
  for (const day of days || []) {
    lines.push('', format.format(day.date));
    if (!day.events.length && !day.tasks.length) {
      lines.push(vi ? '  Không có nội dung trong dữ liệu đã tải.' : '  No entries in loaded data.');
      continue;
    }
    for (const item of day.events) lines.push('  • ' + (vi ? 'Sự kiện: ' : 'Event: ') + item.title);
    for (const item of day.tasks) lines.push('  • ' + (vi ? 'Công việc: ' : 'Task: ') + item.title);
  }
  return lines.join('\n');
}
const escapeICS = value => String(value || '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g,'\\;');
const utcStamp = d => d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/, 'Z');
const localDay = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
function folded(line) {
  // Fold by UTF-8 octet length as required by RFC 5545, preserving Unicode characters.
  const parts = [];
  let part = '', bytes = 0;
  for (const char of line) {
    const length = new TextEncoder().encode(char).length;
    if (bytes + length > (parts.length ? 74 : 75)) {
      parts.push(part);
      part = ' ' + char;
      bytes = 1 + length;
    } else { part += char; bytes += length; }
  }
  parts.push(part);
  return parts.join('\r\n');
}
/** Valid iCalendar entries contain source start times only; no invented durations. */
export function buildDashboardWeekICS(days, generated = new Date()) {
  const stamp = safeDate(generated) || new Date();
  const rows = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BRIAN//Dashboard 3.2//VI','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  const seen = new Set();
  let sequence = 0;
  for (const day of days || []) {
    for (const item of day.events || []) {
      const start = safeDate(item.date);
      if (!start || !item.title) continue;
      const key = String(item.id || item.title + ':' + start.toISOString());
      if (seen.has(key)) continue;
      seen.add(key);
      sequence += 1;
      const uid = `brian-dashboard-${stamp.getTime()}-${sequence}@local`;
      const dateOnly = typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date);
      const allDay = item.allDay === true || dateOnly;
      rows.push('BEGIN:VEVENT', folded('UID:' + uid), 'DTSTAMP:' + utcStamp(stamp));
      rows.push(allDay ? 'DTSTART;VALUE=DATE:' + localDay(start) : 'DTSTART:' + utcStamp(start));
      rows.push(folded('SUMMARY:' + escapeICS(item.title)));
      if (item.description) rows.push(folded('DESCRIPTION:' + escapeICS(item.description)));
      rows.push('END:VEVENT');
    }
  }
  rows.push('END:VCALENDAR');
  return rows.join('\r\n') + '\r\n';
}
