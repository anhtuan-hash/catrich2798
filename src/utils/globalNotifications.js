export const GLOBAL_NOTIFICATION_EVENT = 'bes-global-notification';
export const GLOBAL_NOTIFICATION_OPEN_EVENT = 'bes-notification-center-open';

function safeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function buildGlobalNotification(input = {}) {
  const createdAt = input.createdAt || input.created_at || new Date().toISOString();
  const id = safeString(input.id, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  return {
    id,
    title: safeString(input.title || input.subject, 'Brian English'),
    message: safeString(input.message || input.body || input.description),
    source: safeString(input.source || input.app),
    kind: safeString(input.kind || input.type, 'info').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'info',
    target: safeString(input.target || input.href || input.url),
    createdAt,
    read: Boolean(input.read || input.readAt || input.read_at),
  };
}

export function publishGlobalNotification(input = {}) {
  if (typeof window === 'undefined') return null;
  const detail = buildGlobalNotification(input);
  window.dispatchEvent(new CustomEvent(GLOBAL_NOTIFICATION_EVENT, { detail }));
  return detail;
}

export function publishGlobalNotificationOnce(dedupeKey, input = {}, options = {}) {
  if (typeof window === 'undefined') return null;
  const key = safeString(dedupeKey);
  if (!key) return publishGlobalNotification(input);

  const storage = options.storage === 'local' ? window.localStorage : window.sessionStorage;
  const marker = `bes-global-notification-once:${key}`;
  try {
    if (storage.getItem(marker)) return null;
    storage.setItem(marker, new Date().toISOString());
  } catch {
    // Storage is optional; the notification should still be delivered.
  }
  return publishGlobalNotification(input);
}

export function openGlobalNotificationCenter(trigger = null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(GLOBAL_NOTIFICATION_OPEN_EVENT, { detail: { trigger } }));
}
