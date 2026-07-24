import { useEffect } from 'react';
import { WORK_HUB_DELIVERY_EVENT } from '../utils/workHubDelivery.js';

const WORK_SCHEDULE_UPDATE_EVENT = 'bes-work-schedule-updated';
const DASHBOARD_REFRESH_EVENT = 'bes-work-dashboard-refresh';

export default function GlobalWorkScheduleBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const forwardUpdate = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      window.dispatchEvent(new CustomEvent(WORK_HUB_DELIVERY_EVENT, {
        detail: { ...detail, type: 'schedule-updated', source: 'work-schedule' },
      }));
      window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT, {
        detail: { ...detail, source: 'work-schedule' },
      }));
    };
    window.addEventListener(WORK_SCHEDULE_UPDATE_EVENT, forwardUpdate);
    return () => window.removeEventListener(WORK_SCHEDULE_UPDATE_EVENT, forwardUpdate);
  }, []);

  return null;
}
