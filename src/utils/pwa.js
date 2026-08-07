const PWA_EVENT = 'bes-pwa-state';
const state = {
  supported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
  registered: false,
  controlled: typeof navigator !== 'undefined' ? Boolean(navigator.serviceWorker?.controller) : false,
  installable: false,
  installed: typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true),
  updateReady: false,
  refreshNeeded: false,
  refreshReason: '',
  offlineReady: false,
  lastError: '',
  registration: null,
  installPrompt: null,
};

function snapshot() {
  return {
    supported: state.supported,
    registered: state.registered,
    controlled: state.controlled,
    installable: state.installable,
    installed: state.installed,
    updateReady: state.updateReady,
    refreshNeeded: state.refreshNeeded,
    refreshReason: state.refreshReason,
    offlineReady: state.offlineReady,
    lastError: state.lastError,
  };
}

function emit() {
  if (typeof window === 'undefined') return;
  window.__besPwaState = snapshot();
  window.dispatchEvent(new CustomEvent(PWA_EVENT, { detail: snapshot() }));
}

export async function clearPwaCaches() {
  if (typeof caches === 'undefined') return false;
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith('bes-')).map((key) => caches.delete(key)));
  return true;
}

export async function registerBrianPwa() {
  if (typeof window === 'undefined' || !state.supported) return snapshot();
  try {
    // Brian now runs as a normal network-first web app. Service-worker updates
    // were able to alter the active asset/controller state while a browser tab
    // was suspended and resumed. Retire every Brian registration instead of
    // letting a background tab participate in PWA lifecycle changes.
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations
      .filter((registration) => {
        try { return new URL(registration.scope).origin === window.location.origin; }
        catch { return true; }
      })
      .map(async (registration) => {
        try { registration.active?.postMessage?.({ type: 'CLEAR_CACHE' }); } catch { /* best effort */ }
        try { await registration.unregister(); } catch { /* best effort */ }
      }));
    await clearPwaCaches();

    state.registration = null;
    state.registered = false;
    state.controlled = Boolean(navigator.serviceWorker.controller);
    state.offlineReady = false;
    state.updateReady = false;
    state.refreshNeeded = false;
    state.refreshReason = '';
    emit();
  } catch (error) {
    state.lastError = error?.message || String(error);
    emit();
  }
  return snapshot();
}

export function installPwaEventCapture() {
  if (typeof window === 'undefined' || window.__besPwaCaptureInstalled) return;
  window.__besPwaCaptureInstalled = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    state.installable = true;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    state.installed = true;
    state.installable = false;
    state.installPrompt = null;
    emit();
  });
}

export async function requestPwaInstall() {
  const prompt = state.installPrompt;
  if (!prompt) return { outcome: state.installed ? 'installed' : 'unavailable' };
  await prompt.prompt();
  const result = await prompt.userChoice;
  if (result?.outcome === 'accepted') {
    state.installable = false;
    state.installPrompt = null;
  }
  emit();
  return result || { outcome: 'dismissed' };
}

export function reportPwaRefreshNeeded(reason = 'asset-version-mismatch') {
  // Keep diagnostics only. Never turn an asset mismatch into an automatic page
  // reload; the active Brian session must stay mounted until the user chooses a
  // normal browser refresh/reopen themselves.
  state.refreshNeeded = true;
  state.refreshReason = String(reason || 'asset-version-mismatch');
  emit();
}

export async function activatePwaUpdate() {
  // Legacy API retained for callers, but deliberately never reloads the page.
  await registerBrianPwa();
  return snapshot();
}

export function getPwaState() { return snapshot(); }

export function subscribePwaState(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => listener?.(event.detail || snapshot());
  window.addEventListener(PWA_EVENT, handler);
  listener?.(snapshot());
  return () => window.removeEventListener(PWA_EVENT, handler);
}
