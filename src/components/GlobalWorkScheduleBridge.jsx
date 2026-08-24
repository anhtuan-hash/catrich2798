import { useEffect } from 'react';
import { WORK_HUB_DELIVERY_EVENT } from '../utils/workHubDelivery.js';

const WORK_SCHEDULE_UPDATE_EVENT = 'bes-work-schedule-updated';
const DASHBOARD_REFRESH_EVENT = 'bes-work-dashboard-refresh';
const GLOBAL_NOTIFICATION_EVENTS = ['bes-global-notification', 'bes:notification'];
const GLOBAL_NOTIFICATION_STORAGE_PREFIX = 'bes-global-notifications:';

function isWorkScheduleNotification(detail = {}) {
  const id = String(detail?.id || '').toLowerCase();
  const source = String(detail?.source || '').toLowerCase();
  const category = String(detail?.category || '').toLowerCase();
  const target = String(detail?.target || detail?.href || '').toLowerCase();
  return source === 'work-schedule'
    || category === 'schedule'
    || id.startsWith('work-schedule:')
    || target.includes('view=schedule');
}

function dispatchStorageRefresh(key, value) {
  try {
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue: JSON.stringify(value),
      storageArea: window.localStorage,
    }));
  } catch {
    // Older browsers may not expose the StorageEvent constructor.
  }
}

function purgeStoredScheduleNotifications() {
  if (typeof window === 'undefined') return;
  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(GLOBAL_NOTIFICATION_STORAGE_PREFIX)) keys.push(key);
  }

  keys.forEach((key) => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(key) || '[]');
      if (!Array.isArray(stored)) return;
      const filtered = stored.filter((item) => !isWorkScheduleNotification(item));
      if (filtered.length === stored.length) return;
      window.localStorage.setItem(key, JSON.stringify(filtered));
      dispatchStorageRefresh(key, filtered);
    } catch {
      // Malformed optional notification cache can be ignored safely.
    }
  });
}

export default function GlobalWorkScheduleBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    // Work Schedule is intentionally excluded from the global notification center.
    // Capture these events before the bell/notification-board listener receives them.
    const suppressScheduleNotification = (event) => {
      if (!isWorkScheduleNotification(event?.detail || {})) return;
      event.stopImmediatePropagation();
      event.preventDefault?.();
    };

    const forwardUpdate = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      window.dispatchEvent(new CustomEvent(WORK_HUB_DELIVERY_EVENT, {
        detail: { ...detail, type: 'schedule-updated', source: 'work-schedule' },
      }));
      window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT, {
        detail: { ...detail, source: 'work-schedule' },
      }));
    };

    purgeStoredScheduleNotifications();
    GLOBAL_NOTIFICATION_EVENTS.forEach((name) => {
      window.addEventListener(name, suppressScheduleNotification, true);
    });
    window.addEventListener(WORK_SCHEDULE_UPDATE_EVENT, forwardUpdate);

    return () => {
      GLOBAL_NOTIFICATION_EVENTS.forEach((name) => {
        window.removeEventListener(name, suppressScheduleNotification, true);
      });
      window.removeEventListener(WORK_SCHEDULE_UPDATE_EVENT, forwardUpdate);
    };
  }, []);

  return null;
}
