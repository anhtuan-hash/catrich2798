const RETIRED_STORAGE_KEYS = new Set([
  'bet-theme',
  'bes-theme-mode',
  'bes-theme-mode-v3',
  'bes-quick-dictionary-history-v1',
]);

const RETIRED_STORAGE_PREFIXES = [
  'bes-global-music-v1:',
  'bes-global-music-v2:',
  'bes-shared-music-v2:',
];

const RETIRED_APP_ROUTES = new Set([
  'library',
  'practice',
  'tool/teaching-methods-hub',
]);

const APPEARANCE_KEY = 'bes-appearance-v2';
let installed = false;

function removeRetiredStorage() {
  try {
    const keys = Object.keys(window.localStorage);
    keys.forEach((key) => {
      if (RETIRED_STORAGE_KEYS.has(key) || RETIRED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key);
      }
    });

    const appearance = JSON.parse(window.localStorage.getItem(APPEARANCE_KEY) || 'null');
    if (appearance && typeof appearance === 'object' && 'theme' in appearance) {
      delete appearance.theme;
      appearance.updatedAt = Date.now();
      window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
    }
  } catch {
    // Storage can be unavailable in private browsing or a restricted webview.
  }
}

function currentHashRoute() {
  return String(window.location.hash || '')
    .replace(/^#\/?/, '')
    .split('?')[0]
    .split('&')[0]
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
}

function redirectRetiredAppRoute() {
  if (!RETIRED_APP_ROUTES.has(currentHashRoute())) return;
  window.location.hash = '#/apps';
}

function enforceLightOnlyDocument() {
  const root = document.documentElement;
  root.dataset.theme = 'light';
  root.dataset.besTheme = 'light';
  delete root.dataset.themeMode;
  delete root.dataset.themeTransition;
  root.classList.remove('dark', 'theme-dark');
  root.classList.add('theme-light');
  root.style.colorScheme = 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f7f9fc');
}

function clearRetiredMediaCache() {
  if (!('caches' in window)) return;
  window.caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith('bes-media-')).map((key) => window.caches.delete(key))))
    .catch(() => {});
}

export function installRetiredFeatureCleanup() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  removeRetiredStorage();
  redirectRetiredAppRoute();
  enforceLightOnlyDocument();
  clearRetiredMediaCache();

  const enforce = () => {
    removeRetiredStorage();
    enforceLightOnlyDocument();
  };
  window.addEventListener('hashchange', redirectRetiredAppRoute);
  window.addEventListener('storage', enforce);
  window.addEventListener('bes:appearance-ready', enforce);
  window.addEventListener('bes:appearance-changed', enforce);
}

export const RETIRED_FEATURE_STORAGE = Object.freeze({
  keys: [...RETIRED_STORAGE_KEYS],
  prefixes: [...RETIRED_STORAGE_PREFIXES],
});

export const RETIRED_APP_PATHS = Object.freeze([...RETIRED_APP_ROUTES]);
