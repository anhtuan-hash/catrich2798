export const BRIAN_THEME_STORAGE_KEY = 'bes-theme-preference-v1';
export const BRIAN_THEME_MODES = ['light', 'dark', 'system'];

const DARK_MEDIA = '(prefers-color-scheme: dark)';
let mediaQuery = null;
let installed = false;

function normalizeMode(value) {
  const mode = String(value || '').toLowerCase();
  return BRIAN_THEME_MODES.includes(mode) ? mode : 'light';
}

export function resolveBrianTheme(mode = getBrianThemePreference()) {
  const normalized = normalizeMode(mode);
  if (normalized !== 'system') return normalized;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(DARK_MEDIA).matches ? 'dark' : 'light';
}

export function getBrianThemePreference() {
  if (typeof window === 'undefined') return 'light';
  try {
    return normalizeMode(window.localStorage.getItem(BRIAN_THEME_STORAGE_KEY));
  } catch {
    return normalizeMode(document.documentElement?.dataset?.themeMode || 'light');
  }
}

function updateThemeMeta(resolved) {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0f141b' : '#f8f4ec');
}

export function applyBrianTheme(mode, { persist = false, emit = true } = {}) {
  if (typeof document === 'undefined') return { mode: 'light', resolved: 'light' };
  const normalized = normalizeMode(mode);
  const resolved = resolveBrianTheme(normalized);
  const root = document.documentElement;

  root.dataset.themeMode = normalized;
  root.dataset.theme = resolved;
  root.dataset.besTheme = resolved;
  root.classList.toggle('theme-dark', resolved === 'dark');
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('theme-light', resolved !== 'dark');
  root.style.colorScheme = resolved;
  updateThemeMeta(resolved);

  if (persist && typeof window !== 'undefined') {
    try { window.localStorage.setItem(BRIAN_THEME_STORAGE_KEY, normalized); } catch { /* optional preference */ }
  }

  const detail = { mode: normalized, resolved };
  if (emit && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bes-theme-change', { detail }));
  }
  return detail;
}

export function setBrianThemePreference(mode) {
  return applyBrianTheme(mode, { persist: true, emit: true });
}

function syncSystemTheme() {
  if (getBrianThemePreference() === 'system') applyBrianTheme('system', { persist: false, emit: true });
}

function syncStorage(event) {
  if (event?.key !== BRIAN_THEME_STORAGE_KEY) return;
  applyBrianTheme(event.newValue || 'light', { persist: false, emit: true });
}

export function bootstrapBrianThemeRuntime() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  applyBrianTheme(getBrianThemePreference(), { persist: false, emit: false });
  if (installed) return;
  installed = true;

  mediaQuery = window.matchMedia?.(DARK_MEDIA) || null;
  mediaQuery?.addEventListener?.('change', syncSystemTheme);
  window.addEventListener('storage', syncStorage);

  window.BESTheme = Object.freeze({
    getPreference: getBrianThemePreference,
    resolve: resolveBrianTheme,
    set: setBrianThemePreference,
    apply: applyBrianTheme,
    modes: [...BRIAN_THEME_MODES],
  });
}
