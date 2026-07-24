(() => {
  'use strict';

  const root = document.documentElement;
  const STORAGE_KEY = 'bes-theme-mode-v4';
  const PREVIOUS_KEYS = ['bes-theme-mode-v3', 'bet-theme'];
  const APPEARANCE_KEY = 'bes-appearance-v2';
  const VALID = new Set(['light', 'dark', 'system']);

  const parseJson = (value) => {
    try { return JSON.parse(value); } catch { return null; }
  };

  const normalize = (value) => {
    const mode = String(value || '').trim().toLowerCase();
    if (VALID.has(mode)) return mode;
    if (mode === 'oled') return 'dark';
    if (mode === 'paper') return 'light';
    if (mode === 'auto' || mode === 'auto-time') return 'system';
    return '';
  };

  const readMode = () => {
    try {
      const direct = normalize(localStorage.getItem(STORAGE_KEY));
      if (direct) return direct;

      const appearance = parseJson(localStorage.getItem(APPEARANCE_KEY));
      const appearanceMode = normalize(appearance?.theme);
      if (appearanceMode) return appearanceMode;

      for (const key of PREVIOUS_KEYS) {
        const legacy = normalize(localStorage.getItem(key));
        if (legacy) return legacy;
      }
    } catch { /* private mode or blocked storage */ }
    return 'system';
  };

  const resolveMode = (mode) => mode === 'system'
    ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;

  const apply = (mode, options = {}) => {
    const normalized = normalize(mode) || 'system';
    const resolved = resolveMode(normalized);
    const targets = [root, document.body].filter(Boolean);

    targets.forEach((target) => {
      target.dataset.themeMode = normalized;
      target.dataset.theme = resolved;
      target.dataset.besTheme = resolved;
      target.classList.toggle('dark', resolved === 'dark');
      target.classList.toggle('theme-dark', resolved === 'dark');
      target.classList.toggle('theme-light', resolved === 'light');
      target.style.colorScheme = resolved;
    });

    root.style.setProperty('--bes-resolved-theme', resolved);
    root.style.setProperty('--bes-theme-transition-duration', options.instant ? '0ms' : '180ms');

    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute('content', resolved === 'dark' ? '#111318' : '#f7f9fc');

    try {
      localStorage.setItem(STORAGE_KEY, normalized);
      localStorage.setItem('bes-theme-mode-v3', normalized);
      localStorage.setItem('bet-theme', resolved);
      const appearance = parseJson(localStorage.getItem(APPEARANCE_KEY)) || {};
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify({
        ...appearance,
        theme: normalized,
        resolvedTheme: resolved,
        updatedAt: Date.now(),
      }));
    } catch { /* preference remains active for this page */ }

    window.__BES_THEME_STATE__ = Object.freeze({ mode: normalized, resolved, storageKey: STORAGE_KEY });
    if (!options.silent) {
      const detail = { mode: normalized, resolved, source: options.source || 'runtime' };
      window.dispatchEvent(new CustomEvent('bes:theme-change', { detail }));
      window.dispatchEvent(new CustomEvent('bes-theme-changed', { detail }));
    }
    return { mode: normalized, resolved };
  };

  const initialMode = readMode();
  apply(initialMode, { instant: true, silent: true, source: 'boot' });

  window.__BES_THEME__ = Object.freeze({
    storageKey: STORAGE_KEY,
    normalize,
    resolve: resolveMode,
    read: readMode,
    apply,
  });

  if (!document.body) {
    document.addEventListener('DOMContentLoaded', () => apply(readMode(), { instant: true, silent: true, source: 'body-ready' }), { once: true });
  }
})();
