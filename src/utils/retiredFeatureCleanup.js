import { installMonthlyReportReviewAccordion } from './monthlyReportReviewAccordion.js';

const RETIRED_STORAGE_KEYS = new Set([
  'bet-theme',
  'bes-theme-mode',
  'bes-theme-mode-v3',
  'bes-quick-dictionary-history-v1',
  'bes-appearance-v2',
  'bes-accent-color',
]);

const RETIRED_STORAGE_PREFIXES = [
  'bes-global-music-v1:',
  'bes-global-music-v2:',
  'bes-shared-music-v2:',
  'brian-activity-graph:',
];

const RETIRED_APP_ROUTES = new Set([
  'library',
  'practice',
  'tool/teaching-methods-hub',
  'tool/activity-graph',
]);

let installed = false;

function removeRetiredStorage() {
  try {
    const keys = Object.keys(window.localStorage);
    keys.forEach((key) => {
      if (RETIRED_STORAGE_KEYS.has(key) || RETIRED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key);
      }
    });
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
  root.classList.remove('dark', 'theme-dark');
  root.classList.add('theme-light');
  root.style.colorScheme = 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f7f9fc');
}

function clearRetiredAppearanceDocument() {
  const root = document.documentElement;
  delete root.dataset.besBackground;
  delete root.dataset.besContrast;
  delete root.dataset.besBatterySaver;
  delete root.dataset.accentMode;
  delete root.dataset.adaptivePerformance;
  delete root.dataset.highContrast;
  delete root.dataset.batterySaver;
  delete root.dataset.accent;
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
  clearRetiredAppearanceDocument();
  clearRetiredMediaCache();
  installMonthlyReportReviewAccordion();

  const enforce = () => {
    removeRetiredStorage();
    enforceLightOnlyDocument();
    clearRetiredAppearanceDocument();
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