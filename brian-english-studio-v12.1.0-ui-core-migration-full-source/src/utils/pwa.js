const PWA_EVENT = 'bes-pwa-state';
const state = {
  supported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
  registered: false,
  controlled: typeof navigator !== 'undefined' ? Boolean(navigator.serviceWorker?.controller) : false,
  installable: false,
  installed: typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true),
  updateReady: false,
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
    offlineReady: state.offlineReady,
    lastError: state.lastError,
  };
}

function emit() {
  if (typeof window === 'undefined') return;
  window.__besPwaState = snapshot();
  window.dispatchEvent(new CustomEvent(PWA_EVENT, { detail: snapshot() }));
}

export async function registerBrianPwa() {
  if (typeof window === 'undefined' || !state.supported) return snapshot();
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    state.registration = registration;
    state.registered = true;
    state.controlled = Boolean(navigator.serviceWorker.controller);
    state.offlineReady = true;
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          state.updateReady = true;
          emit();
        }
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      state.controlled = true;
      state.updateReady = false;
      emit();
    });
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

export function activatePwaUpdate() {
  const worker = state.registration?.waiting;
  if (worker) worker.postMessage({ type: 'SKIP_WAITING' });
  else window.location.reload();
}

export async function clearPwaCaches() {
  if (typeof caches === 'undefined') return false;
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith('bes-')).map((key) => caches.delete(key)));
  return true;
}

export function getPwaState() { return snapshot(); }

export function subscribePwaState(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => listener?.(event.detail || snapshot());
  window.addEventListener(PWA_EVENT, handler);
  listener?.(snapshot());
  return () => window.removeEventListener(PWA_EVENT, handler);
}
