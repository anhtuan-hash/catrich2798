import { useEffect } from 'react';
import HeroThemeStudioAdminPanel from './HeroThemeStudioAdminPanel.jsx';
import {
  loadHeroThemeStudioSettings,
  normalizeHeroTheme,
  readHeroThemeStudioLocal,
  subscribeToHeroThemeStudioSettings,
} from '../utils/heroThemeStudioSettings.js';
import './GlobalHeroGovernance.css';

const HERO_TOKEN_PATTERN = /(^|[\s_-])hero($|[\s_-])/i;
const SHOWCASE_PATTERN = /(hero-cms|bha-hero|flat-apps-hero|games-v44-hero|games-showcase-hero|newsroom-v823-hero|library-v46-hero|admin-v41-hero)/i;
const ROUTE_PATTERN = /(^|\s)route-hero(?:\s|$)/i;
const COMPACT_PATTERN = /(gd-hero|v1093-hero|hr-hero|resource-library-hero|settings-google-hero)/i;
const CANDIDATE_SELECTOR = 'section,header,article,aside,div';
const ACTION_SELECTOR = '[class*="hero-actions"],.route-hero-actions,[class*="hero-buttons"]';

export const HERO_THEME_REGISTRY = Object.freeze([
  { key: 'home', label: 'Trang chủ' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'work-hub', label: 'Work Hub' },
  { key: 'apps', label: 'Ứng dụng' },
  { key: 'games', label: 'Games' },
  { key: 'news', label: 'Newsroom' },
  { key: 'library', label: 'Library' },
  { key: 'homeroom', label: 'Homeroom' },
  { key: 'resource-library', label: 'Resource Library' },
  { key: 'settings', label: 'Settings' },
  { key: 'admin', label: 'Admin' },
  { key: 'external-app', label: 'External Apps' },
  { key: 'tesol-method', label: 'TESOL Method' },
]);

const REGISTRY_KEYS = new Set(HERO_THEME_REGISTRY.map((item) => item.key));

function classText(element) {
  return typeof element?.className === 'string'
    ? element.className
    : String(element?.getAttribute?.('class') || '');
}

function hasHeroToken(element) {
  return HERO_TOKEN_PATTERN.test(classText(element));
}

function routeOf(element, fallback = '') {
  return element.closest?.('.app-shell')?.dataset?.route || fallback || '';
}

function variantOf(element, route) {
  const classes = classText(element);
  if (SHOWCASE_PATTERN.test(classes) || ['home', 'apps', 'games', 'news', 'library', 'admin'].includes(route)) return 'showcase';
  if (ROUTE_PATTERN.test(classes)) return 'route';
  if (COMPACT_PATTERN.test(classes) || ['dashboard', 'work-hub', 'homeroom', 'resource-library', 'settings'].includes(route)) return 'compact';
  return 'route';
}

function normalizedKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

function themeKeyOf(element, route) {
  const classes = classText(element).toLowerCase();
  if (/tesol.*hero|hero.*tesol/.test(classes)) return 'tesol-method';
  if (/external.*hero|hero.*external/.test(classes)) return 'external-app';
  const routeKey = normalizedKey(route);
  if (REGISTRY_KEYS.has(routeKey)) return routeKey;
  return routeKey || normalizedKey(element.id) || 'shared';
}

function titleCopy(element, title) {
  let copy = title?.parentElement || null;
  while (copy?.parentElement && copy.parentElement !== element && !/hero-copy/i.test(classText(copy))) {
    copy = copy.parentElement;
  }
  return copy && element.contains(copy) ? copy : element;
}

function clearAudit(root) {
  root.querySelectorAll?.('.burs-hero-governed').forEach((element) => {
    element.classList.remove('burs-hero-governed');
    delete element.dataset.brianHeroVariant;
    delete element.dataset.brianHeroRoute;
    delete element.dataset.brianHeroAudit;
    delete element.dataset.brianHeroId;
    delete element.dataset.brianHeroThemeKey;
  });
  root.querySelectorAll?.('.burs-hero-copy-governed').forEach((element) => element.classList.remove('burs-hero-copy-governed'));
}

function auditHero(element, route, variant, themeKey, heroId) {
  const titles = [...element.querySelectorAll('h1')];
  const title = titles[0];
  const copy = titleCopy(element, title);
  const description = copy.querySelector('p');
  const secondary = copy.querySelector('h2');
  const actionArea = copy.querySelector(ACTION_SELECTOR);
  const actionCount = actionArea ? actionArea.querySelectorAll('button,a,[role="button"]').length : 0;
  const titleLength = String(title?.textContent || '').replace(/\s+/g, ' ').trim().length;
  const secondaryLength = String(secondary?.textContent || '').replace(/\s+/g, ' ').trim().length;
  const warnings = [];

  if (titles.length > 1) warnings.push('multiple-h1');
  if (titleLength > (variant === 'compact' ? 62 : 82)) warnings.push('long-title');
  if (secondaryLength > 64) warnings.push('long-secondary');
  if (!description) warnings.push('missing-description');
  if (actionCount > 3) warnings.push('crowded-actions');

  copy.classList.add('burs-hero-copy-governed');
  element.dataset.brianHeroVariant = variant;
  element.dataset.brianHeroRoute = route || 'unknown';
  element.dataset.brianHeroAudit = warnings.length ? warnings.join(' ') : 'ok';
  element.dataset.brianHeroId = heroId;
  element.dataset.brianHeroThemeKey = themeKey;

  return {
    id: heroId,
    themeKey,
    route: route || 'unknown',
    variant,
    className: classText(element),
    title: String(title?.textContent || '').replace(/\s+/g, ' ').trim(),
    titleLength,
    secondary: String(secondary?.textContent || '').replace(/\s+/g, ' ').trim(),
    actionCount,
    warnings,
  };
}

function scanHeroes(route = '') {
  const root = document.querySelector('.app-shell') || document.body;
  if (!root) return { report: [], heroes: [] };

  clearAudit(root);
  const candidates = [...root.querySelectorAll(CANDIDATE_SELECTOR)]
    .filter((element) => hasHeroToken(element) && element.querySelector('h1'));
  const report = [];
  const heroes = [];
  const counters = new Map();

  candidates.forEach((element) => {
    if (element.parentElement?.closest('.burs-hero-governed')) return;
    const currentRoute = routeOf(element, route);
    const variant = variantOf(element, currentRoute);
    const themeKey = themeKeyOf(element, currentRoute);
    const count = (counters.get(themeKey) || 0) + 1;
    counters.set(themeKey, count);
    const heroId = `${themeKey}-${count}`;
    element.classList.add('burs-hero-governed');
    report.push(auditHero(element, currentRoute, variant, themeKey, heroId));
    heroes.push({ element, themeKey, heroId });
  });

  document.documentElement.dataset.brianHeroCount = String(report.length);
  window.dispatchEvent(new CustomEvent('bes:hero-audit-complete', { detail: { route, report } }));
  return { report, heroes };
}

function themeMatches(theme, themeKey) {
  if (!theme?.enabled || !theme.imageUrl) return false;
  if (theme.targetMode !== 'selected') return true;
  return Array.isArray(theme.heroKeys) && theme.heroKeys.includes(themeKey);
}

function clearThemeLayer(element) {
  if (!element) return;
  element.classList.remove('bes-hero-theme-active');
  element.querySelector(':scope > .bes-hero-theme-layer')?.remove();
  delete element.dataset.brianHeroThemeActive;
}

function applyThemeLayer(element, theme) {
  clearThemeLayer(element);
  const layer = document.createElement('div');
  layer.className = 'bes-hero-theme-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.backgroundImage = `url("${String(theme.imageUrl).replace(/"/g, '%22')}")`;
  layer.style.backgroundPosition = theme.position;
  layer.style.filter = theme.blur > 0 ? `blur(${theme.blur}px)` : 'none';
  layer.style.setProperty('--bes-hero-theme-overlay', String(theme.overlay));
  layer.style.setProperty('--bes-hero-theme-shift-x', '0px');
  layer.style.setProperty('--bes-hero-theme-shift-y', '0px');
  element.prepend(layer);
  element.classList.add('bes-hero-theme-active');
  element.dataset.brianHeroThemeActive = 'true';
}

function applyTheme(heroes, inputTheme) {
  const theme = normalizeHeroTheme(inputTheme);
  heroes.forEach(({ element, themeKey }) => {
    if (themeMatches(theme, themeKey)) applyThemeLayer(element, theme);
    else clearThemeLayer(element);
  });
  document.documentElement.dataset.brianHeroTheme = theme.enabled && theme.imageUrl ? 'custom' : 'original';
  return theme;
}

function clearAllThemeLayers() {
  document.querySelectorAll?.('.bes-hero-theme-active').forEach(clearThemeLayer);
  delete document.documentElement.dataset.brianHeroTheme;
}

export default function GlobalHeroGovernance({ route = '' }) {
  useEffect(() => {
    document.documentElement.dataset.brianHeroGovernance = 'v2-theme-studio-performance-safe';
    let report = [];
    let heroes = [];
    let frame = 0;
    let pointerFrame = 0;
    let previewTheme = null;
    let publishedTheme = normalizeHeroTheme(readHeroThemeStudioLocal().published);

    const activeTheme = () => previewTheme || publishedTheme;

    const rescan = () => {
      const next = scanHeroes(route);
      report = next.report;
      heroes = next.heroes;
      applyTheme(heroes, activeTheme());
      return report;
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        rescan();
      });
    };

    const onPreview = (event) => {
      previewTheme = normalizeHeroTheme(event.detail?.theme || {});
      applyTheme(heroes, previewTheme);
    };

    const onPreviewClear = () => {
      previewTheme = null;
      applyTheme(heroes, publishedTheme);
    };

    const onPointerMove = (event) => {
      if (pointerFrame || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const theme = activeTheme();
      if (!theme?.parallax) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        const x = ((event.clientX / Math.max(1, window.innerWidth)) - 0.5) * theme.parallax;
        const y = ((event.clientY / Math.max(1, window.innerHeight)) - 0.5) * theme.parallax;
        heroes.forEach(({ element }) => {
          const layer = element.querySelector(':scope > .bes-hero-theme-layer');
          if (!layer) return;
          layer.style.setProperty('--bes-hero-theme-shift-x', `${x.toFixed(2)}px`);
          layer.style.setProperty('--bes-hero-theme-shift-y', `${y.toFixed(2)}px`);
        });
      });
    };

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('bes:font-scale-changed', schedule);
    window.addEventListener('bes:appearance-changed', schedule);
    window.addEventListener('bes:hero-theme-preview', onPreview);
    window.addEventListener('bes:hero-theme-preview-clear', onPreviewClear);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    schedule();

    loadHeroThemeStudioSettings().then((snapshot) => {
      publishedTheme = normalizeHeroTheme(snapshot.published);
      if (!previewTheme) applyTheme(heroes, publishedTheme);
    }).catch(() => null);

    const unsubscribeSettings = subscribeToHeroThemeStudioSettings((snapshot) => {
      publishedTheme = normalizeHeroTheme(snapshot.published);
      if (!previewTheme) applyTheme(heroes, publishedTheme);
    });

    window.BrianHeroAudit = Object.freeze({
      version: 'v2-theme-studio-performance-safe',
      registry: HERO_THEME_REGISTRY.map((item) => ({ ...item })),
      getReport: () => report.map((item) => ({ ...item, warnings: [...item.warnings] })),
      rescan,
    });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      unsubscribeSettings?.();
      clearAllThemeLayers();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('bes:font-scale-changed', schedule);
      window.removeEventListener('bes:appearance-changed', schedule);
      window.removeEventListener('bes:hero-theme-preview', onPreview);
      window.removeEventListener('bes:hero-theme-preview-clear', onPreviewClear);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [route]);

  return <HeroThemeStudioAdminPanel route={route} registry={HERO_THEME_REGISTRY} />;
}
