const INSTALL_KEY = '__besAttendanceLegacyMonthlyCalendarCleanupInstalled';
const LAYOUT_SELECTOR = '.attendance-calendar-layout';
const DAILY_HOST_SELECTOR = '[data-attendance-daily-status-root]';
const REMOVED_ATTRIBUTE = 'data-bes-monthly-calendar-removed';

let observer = null;
let scanQueued = false;

function removeLegacyMonthlyCalendar(layout) {
  if (!layout?.isConnected) return;

  layout.querySelectorAll(':scope > *').forEach((element) => {
    if (element.matches(DAILY_HOST_SELECTOR)) return;
    element.remove();
  });

  layout.setAttribute(REMOVED_ATTRIBUTE, 'true');
}

function scanAttendanceCalendars() {
  scanQueued = false;
  document.querySelectorAll(LAYOUT_SELECTOR).forEach((layout) => removeLegacyMonthlyCalendar(layout));
}

function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  queueMicrotask(scanAttendanceCalendars);
}

function startLegacyMonthlyCalendarCleanup() {
  if (observer || typeof document === 'undefined') return;
  scanAttendanceCalendars();
  observer = new MutationObserver(queueScan);
  observer.observe(document.body, { childList: true, subtree: true });
}

export function installAttendanceLegacyMonthlyCalendarCleanup() {
  if (typeof window === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLegacyMonthlyCalendarCleanup, { once: true });
  } else {
    startLegacyMonthlyCalendarCleanup();
  }
}

installAttendanceLegacyMonthlyCalendarCleanup();
