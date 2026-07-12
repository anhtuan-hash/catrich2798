export function isLeader(user) {
  return ['admin', 'ttcm', 'department_head', 'department-head', 'leader', 'head'].includes(String(user?.role || '').toLowerCase());
}

export function formatDate(value, locale = 'vi-VN') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function safeJsonParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function scopedLocalKey(prefix, user) {
  return `${prefix}:${user?.id || user?.email || 'guest'}`;
}

export function readLocal(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function uid(prefix = 'bes') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
