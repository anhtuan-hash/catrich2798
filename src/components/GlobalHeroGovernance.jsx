import { useEffect } from 'react';
import './GlobalHeroGovernance.css';

const HERO_TOKEN_PATTERN = /(^|[\s_-])hero($|[\s_-])/i;
const SHOWCASE_PATTERN = /(hero-cms|bha-hero|flat-apps-hero|games-v44-hero|games-showcase-hero|newsroom-v823-hero|library-v46-hero|admin-v41-hero)/i;
const ROUTE_PATTERN = /(^|\s)route-hero(?:\s|$)/i;
const COMPACT_PATTERN = /(gd-hero|v1093-hero|hr-hero|resource-library-hero|settings-google-hero)/i;
const CANDIDATE_SELECTOR = 'section,header,article,aside,div';
const ACTION_SELECTOR = '[class*="hero-actions"],.route-hero-actions,[class*="hero-buttons"]';

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

function titleCopy(element, title) {
  let copy = title?.parentElement || null;
  while (copy?.parentElement && copy.parentElement !== element && !/hero-copy/i.test(classText(copy))) {
    copy = copy.parentElement;
  }
  return copy && element.contains(copy) ? copy : element;
}

function cleanPrevious(root) {
  root.querySelectorAll?.('.burs-hero-governed').forEach((element) => {
    element.classList.remove('burs-hero-governed');
    delete element.dataset.brianHeroVariant;
    delete element.dataset.brianHeroRoute;
    delete element.dataset.brianHeroAudit;
  });
  root.querySelectorAll?.('.burs-hero-copy-governed').forEach((element) => element.classList.remove('burs-hero-copy-governed'));
}

function auditHero(element, route, variant) {
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

  return {
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
  if (!root) return [];

  cleanPrevious(root);
  const candidates = [...root.querySelectorAll(CANDIDATE_SELECTOR)]
    .filter((element) => hasHeroToken(element) && element.querySelector('h1'));
  const report = [];

  candidates.forEach((element) => {
    if (element.parentElement?.closest('.burs-hero-governed')) return;
    const currentRoute = routeOf(element, route);
    const variant = variantOf(element, currentRoute);
    element.classList.add('burs-hero-governed');
    report.push(auditHero(element, currentRoute, variant));
  });

  document.documentElement.dataset.brianHeroCount = String(report.length);
  window.dispatchEvent(new CustomEvent('bes:hero-audit-complete', { detail: { route, report } }));
  return report;
}

export default function GlobalHeroGovernance({ route = '' }) {
  useEffect(() => {
    document.documentElement.dataset.brianHeroGovernance = 'v1';
    let report = [];
    let frame = 0;

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        report = scanHeroes(route);
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('hashchange', schedule);
    window.addEventListener('bes:font-scale-changed', schedule);
    window.addEventListener('bes:appearance-changed', schedule);
    schedule();

    window.BrianHeroAudit = Object.freeze({
      version: 'v1',
      getReport: () => report.map((item) => ({ ...item, warnings: [...item.warnings] })),
      rescan: () => {
        report = scanHeroes(route);
        return report;
      },
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener('bes:font-scale-changed', schedule);
      window.removeEventListener('bes:appearance-changed', schedule);
    };
  }, [route]);

  return null;
}
