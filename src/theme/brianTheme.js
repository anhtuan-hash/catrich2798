export const BRIAN_THEME_STORAGE_KEY = 'bes-theme-preference-v1';
export const BRIAN_THEME_MODES = ['light'];

let installed = false;

function enforceLight({ persist = true, emit = true } = {}) {
  if (typeof document === 'undefined') return { mode: 'light', resolved: 'light' };

  const root = document.documentElement;
  root.dataset.themeMode = 'light';
  root.dataset.theme = 'light';
  root.dataset.besTheme = 'light';
  root.classList.remove('theme-dark', 'dark');
  root.classList.add('theme-light');
  document.body?.classList.remove('theme-dark', 'dark');
  document.body?.classList.add('theme-light');
  root.style.colorScheme = 'light';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#f8f4ec');

  if (persist && typeof window !== 'undefined') {
    try { window.localStorage.setItem(BRIAN_THEME_STORAGE_KEY, 'light'); } catch { /* optional preference */ }
  }

  const detail = { mode: 'light', resolved: 'light', lightOnly: true };
  if (emit && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bes-theme-change', { detail }));
  }
  return detail;
}

export function resolveBrianTheme() {
  return 'light';
}

export function getBrianThemePreference() {
  return 'light';
}

export function applyBrianTheme(_mode, { persist = false, emit = true } = {}) {
  return enforceLight({ persist, emit });
}

export function setBrianThemePreference() {
  return enforceLight({ persist: true, emit: true });
}

function syncStorage(event) {
  if (event?.key !== BRIAN_THEME_STORAGE_KEY) return;
  enforceLight({ persist: true, emit: true });
}

export function bootstrapBrianThemeRuntime() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Migration guard: any device that previously stored dark/system is reset
  // permanently to Brian's only supported appearance: light.
  enforceLight({ persist: true, emit: false });
  if (installed) return;
  installed = true;

  window.addEventListener('storage', syncStorage);

  window.BESTheme = Object.freeze({
    getPreference: getBrianThemePreference,
    resolve: resolveBrianTheme,
    set: setBrianThemePreference,
    apply: applyBrianTheme,
    modes: [...BRIAN_THEME_MODES],
  });
}
