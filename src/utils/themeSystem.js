const STORAGE_KEY = 'bes-theme-mode-v3';
const LEGACY_KEY = 'bet-theme';
const APPEARANCE_KEY = 'bes-appearance-v2';
const CHANGE_EVENT = 'bes:theme-change';
const REQUEST_EVENT = 'bes:theme-request';
const VALID_MODES = new Set(['system', 'light', 'dark']);

let channel = null;
let applyingAppearance = false;

function safeJson(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function normalizeThemeMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  if (VALID_MODES.has(mode)) return mode;
  if (mode === 'oled') return 'dark';
  if (mode === 'paper') return 'light';
  if (mode === 'auto-time') return 'system';
  return '';
}

export function getStoredThemeMode() {
  if (typeof window === 'undefined') return 'system';
  const boot = normalizeThemeMode(window.__BES_THEME_BOOT__?.mode);
  if (boot) return boot;
  try {
    const direct = normalizeThemeMode(window.localStorage.getItem(STORAGE_KEY));
    if (direct) return direct;
    const appearance = safeJson(window.localStorage.getItem(APPEARANCE_KEY), {});
    const appearanceMode = normalizeThemeMode(appearance?.theme);
    if (appearanceMode) return appearanceMode;
    const legacy = normalizeThemeMode(window.localStorage.getItem(LEGACY_KEY));
    if (legacy) return legacy;
  } catch { /* storage is optional */ }
  return 'system';
}

export function resolveThemeMode(mode = getStoredThemeMode()) {
  const normalized = normalizeThemeMode(mode) || 'system';
  if (normalized !== 'system') return normalized;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateAppearanceStorage(mode) {
  try {
    const current = safeJson(window.localStorage.getItem(APPEARANCE_KEY), {}) || {};
    if (normalizeThemeMode(current.theme) === mode) return;
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify({
      ...current,
      theme: mode,
      updatedAt: Date.now(),
    }));
  } catch { /* optional compatibility state */ }
}

function applyDocumentTheme(mode, resolved) {
  const root = document.documentElement;
  root.dataset.themeMode = mode;
  root.dataset.theme = resolved;
  root.dataset.besTheme = resolved;
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('theme-dark', resolved === 'dark');
  root.classList.toggle('theme-light', resolved === 'light');
  root.style.colorScheme = resolved;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute('content', resolved === 'dark' ? '#111318' : '#f7f9fc');
}

export function applyThemeMode(value, options = {}) {
  const {
    persist = true,
    broadcast = true,
    syncAppearance = true,
    emit = true,
  } = options;
  const mode = normalizeThemeMode(value) || 'system';
  const resolved = resolveThemeMode(mode);

  if (typeof document !== 'undefined') applyDocumentTheme(mode, resolved);

  if (typeof window !== 'undefined' && persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
      window.localStorage.setItem(LEGACY_KEY, resolved);
      updateAppearanceStorage(mode);
    } catch { /* storage is optional */ }
  }

  if (syncAppearance && typeof window !== 'undefined' && !applyingAppearance) {
    const appearance = window.BESAppearance;
    const appearanceMode = normalizeThemeMode(appearance?.getState?.()?.theme);
    if (appearance?.setState && appearanceMode !== mode) {
      applyingAppearance = true;
      try { appearance.setState({ theme: mode }); } catch { /* compatibility only */ }
      applyingAppearance = false;
    }
  }

  const detail = { mode, resolved, source: options.source || 'theme-system' };
  if (emit && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail }));
  }
  if (broadcast && typeof BroadcastChannel !== 'undefined') {
    try {
      channel ||= new BroadcastChannel(STORAGE_KEY);
      channel.postMessage(detail);
    } catch { /* optional */ }
  }
  return detail;
}

export function installThemeSystem(onChange) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');

  const notify = (mode, options = {}) => {
    const detail = applyThemeMode(mode, options);
    onChange?.(detail);
  };

  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    notify(event.newValue, { persist: false, broadcast: false, source: 'storage' });
  };
  const onMedia = () => {
    const mode = getStoredThemeMode();
    if (mode === 'system') notify(mode, { persist: false, broadcast: false, syncAppearance: false, source: 'system' });
  };
  const onAppearance = (event) => {
    if (applyingAppearance) return;
    const mode = normalizeThemeMode(event.detail?.state?.theme);
    if (mode) notify(mode, { source: 'appearance' });
  };
  const onRequest = (event) => {
    const mode = normalizeThemeMode(event.detail?.mode || event.detail);
    if (mode) notify(mode, { source: 'request' });
  };
  const onChannel = (event) => {
    const mode = normalizeThemeMode(event.data?.mode);
    if (mode) notify(mode, { persist: false, broadcast: false, source: 'channel' });
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener('bes:appearance-changed', onAppearance);
  window.addEventListener(REQUEST_EVENT, onRequest);
  media?.addEventListener?.('change', onMedia);

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel ||= new BroadcastChannel(STORAGE_KEY);
      channel.addEventListener('message', onChannel);
    } catch { /* optional */ }
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('bes:appearance-changed', onAppearance);
    window.removeEventListener(REQUEST_EVENT, onRequest);
    media?.removeEventListener?.('change', onMedia);
    try { channel?.removeEventListener('message', onChannel); } catch { /* optional */ }
  };
}

export const THEME_MODES = Object.freeze(['system', 'light', 'dark']);
export const THEME_STORAGE_KEY = STORAGE_KEY;
