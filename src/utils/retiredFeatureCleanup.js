import { installMonthlyReportReviewAccordion } from './monthlyReportReviewAccordion.js';
import { isRetiredPath } from '../data/retiredApps.js';

const RETIRED_STORAGE_KEYS = new Set([
  'bet-theme',
  'bes-theme-mode',
  'bes-theme-mode-v3',
  'bes-quick-dictionary-history-v1',
  'bes-appearance-v2',
  'bes-accent-color',
  'bes.slot',
  'bes.seatingChartStudio.v10',
  'bes.askBrian.seatingChartStudio.v10',
  'bes.mobileDock.seatingChartStudio.v10',
  'bes.top5.cloud.v1',
  'bes.top5.sessions.v1',
  'bes.top5.visibility.v1',
  'bes.mobileDock.top5.v1',
  'bes.top5.lastCompletedSession.v1',
]);

const RETIRED_STORAGE_PREFIXES = [
  'bes-global-music-v1:',
  'bes-global-music-v2:',
  'bes-shared-music-v2:',
  'brian-activity-graph:',
  'bes.seating-chart-studio',
  'bes.seatingChartStudio',
  'bes.top5',
  'bes.top-five-arena',
  'bes.teaching-tool-hub',
  'bes.game-hub',
  'bes.games',
  'bes.tesol-method',
  'bes.tesol-methodology',
];

// Exact production routes plus historical aliases. The two real routes that
// were previously missed are tool/top-five-arena and tool/tesol-method.
const RETIRED_APP_ROUTES = new Set([
  'library',
  'practice',
  'tool/teaching-methods-hub',
  'tool/activity-graph',
  'tool/top-five-arena',
  'route/top-five-arena',
  'top-five-arena',
  'tool/top-5-arena',
  'route/top-5-arena',
  'top-5-arena',
  'tool/top5-studio',
  'route/top5-studio',
  'top5-studio',
  'tool/brian-top-5-arena',
  'route/brian-top-5-arena',
  'brian-top-5-arena',
  'tool/tesol-method',
  'route/tesol-method',
  'tesol-method',
  'tesol-methodology',
  'route/tesol-methodology',
  'tool/tesol-methodology',
  'tool/teaching-tool-hub',
  'route/teaching-tool-hub',
  'teaching-tool-hub',
  'tool/seating-chart-studio',
  'route/seating-chart-studio',
  'seating-chart-studio',
  'games',
  'game',
  'route/games',
  'tool/game-hub',
  'route/game-hub',
  'game-hub',
]);

const RETIRED_RECENTS_STORAGE_KEY = 'bes.recentActivities';
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

function itemLooksRetired(item) {
  if (!item) return false;
  if (typeof item === 'string') return isRetiredPath(item);
  if (typeof item !== 'object') return false;
  return [item.slug, item.route, item.path, item.href, item.hash, item.target, item.id]
    .some((value) => value && isRetiredPath(value));
}

function removeRetiredRecents() {
  try {
    const raw = window.localStorage.getItem(RETIRED_RECENTS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const cleaned = parsed.filter((item) => !itemLooksRetired(item));
    if (cleaned.length !== parsed.length) {
      window.localStorage.setItem(RETIRED_RECENTS_STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch {
    // Ignore malformed or inaccessible legacy storage.
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
  const route = currentHashRoute();
  if (!RETIRED_APP_ROUTES.has(route) && !isRetiredPath(route)) return;

  // Replace instead of append so a removed tool cannot remain in browser
  // history and re-open when the user presses Back/Forward.
  if (window.location.hash !== '#/apps') {
    window.history.replaceState(null, '', '#/apps');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
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
  removeRetiredRecents();
  redirectRetiredAppRoute();
  enforceLightOnlyDocument();
  clearRetiredAppearanceDocument();
  clearRetiredMediaCache();
  installMonthlyReportReviewAccordion();

  const enforce = () => {
    removeRetiredStorage();
    removeRetiredRecents();
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
