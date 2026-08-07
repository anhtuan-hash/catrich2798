import { reportPwaRefreshNeeded } from './utils/pwa.js';

const INSTALL_KEY = '__besTabResumeStabilityInstalled';

function describeError(event) {
  const payload = event?.payload;
  return String(payload?.message || payload || event?.message || 'Vite preload error');
}

export function installTabResumeStabilityGuard() {
  if (typeof window === 'undefined' || window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  // Vite emits this event when a lazy/deferred chunk no longer matches the
  // currently deployed asset set. Brian used to reload immediately here.
  // That is especially disruptive when a background tab resumes. Intercept
  // the event before the legacy listener in main.jsx and let the user decide
  // when to refresh through the PWA update banner instead.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    const message = describeError(event);
    reportPwaRefreshNeeded(message);
    console.warn('[TabResumeStability] Prevented an automatic full-page reload after an asset preload error.', message);
  }, { capture: true });
}

installTabResumeStabilityGuard();
