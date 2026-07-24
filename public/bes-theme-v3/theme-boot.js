(() => {
  'use strict';

  const ROOT = document.documentElement;
  const STORAGE_KEY = 'bes-theme-mode-v3';
  const LEGACY_KEY = 'bet-theme';
  const APPEARANCE_KEY = 'bes-appearance-v2';
  const VALID = new Set(['system', 'light', 'dark']);

  const safeJson = (value) => {
    try { return JSON.parse(value); } catch { return null; }
  };

  const normalize = (value) => {
    const mode = String(value || '').toLowerCase();
    if (VALID.has(mode)) return mode;
    if (mode === 'oled') return 'dark';
    if (mode === 'paper') return 'light';
    if (mode === 'auto-time') return 'system';
    return '';
  };

  const readMode = () => {
    try {
      const current = normalize(localStorage.getItem(STORAGE_KEY));
      if (current) return current;
      const appearance = safeJson(localStorage.getItem(APPEARANCE_KEY));
      const fromAppearance = normalize(appearance?.theme);
      if (fromAppearance) return fromAppearance;
      const legacy = normalize(localStorage.getItem(LEGACY_KEY));
      if (legacy) return legacy;
    } catch { /* storage may be unavailable */ }
    return 'system';
  };

  const resolve = (mode) => mode === 'system'
    ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;

  const mode = readMode();
  const resolved = resolve(mode);

  ROOT.dataset.themeMode = mode;
  ROOT.dataset.theme = resolved;
  ROOT.dataset.besTheme = resolved;
  ROOT.classList.toggle('dark', resolved === 'dark');
  ROOT.classList.toggle('theme-dark', resolved === 'dark');
  ROOT.classList.toggle('theme-light', resolved === 'light');
  ROOT.style.colorScheme = resolved;

  try {
    localStorage.setItem(STORAGE_KEY, mode);
    localStorage.setItem(LEGACY_KEY, resolved);
  } catch { /* optional */ }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute('content', resolved === 'dark' ? '#111318' : '#f7f9fc');

  window.__BES_THEME_BOOT__ = Object.freeze({ mode, resolved, storageKey: STORAGE_KEY });
})();
