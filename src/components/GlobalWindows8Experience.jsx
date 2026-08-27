import React, { useEffect, useRef } from 'react';
import { GLOBAL_MOTION_EVENT } from '../utils/globalMotionSystem.js';

const ROUTE_ORDER = [
  'home', 'apps', 'news', 'games', 'tools', 'homeroom', 'homeroom-portal',
  'resources', 'library', 'resource-library', 'knowledge-hub', 'dashboard',
  'practice', 'reports', 'ttcm', 'settings', 'admin',
];

function routeName(value = '') {
  return String(value || '')
    .replace(/^#\/?/, '')
    .split('?')[0]
    .split('&')[0]
    .trim() || 'home';
}

function isReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function windows8Active() {
  const root = document.documentElement;
  return root?.dataset?.motionMode === 'windows8'
    && root?.dataset?.motionEnabled === 'true'
    && !isReducedMotion();
}

function inferDirection(fromRoute, toRoute) {
  const fromIndex = ROUTE_ORDER.indexOf(routeName(fromRoute));
  const toIndex = ROUTE_ORDER.indexOf(routeName(toRoute));
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return 'forward';
  return toIndex > fromIndex ? 'forward' : 'backward';
}

function getMain() {
  return document.getElementById('bes-main-content')
    || document.querySelector('[data-bes-main-content]');
}

function visibleElement(node) {
  if (!node?.isConnected || node.nodeType !== 1) return false;
  if (node.hidden || node.getAttribute?.('aria-hidden') === 'true') return false;
  if (node.matches?.('script, style, link, template')) return false;
  const style = window.getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) return false;
  if (style.position === 'fixed') return false;
  return true;
}

function meaningfulChildren(container) {
  if (!container) return [];
  return [...container.children].filter(visibleElement);
}

/**
 * Windows 8 entrance transitions are content-first, not page-first. We prefer
 * meaningful siblings; when Brian renders a single route wrapper we descend
 * one level so hero/header/sections can arrive in sequence instead of moving
 * the whole screen as one giant card.
 */
function collectChoreographyItems(main) {
  const direct = meaningfulChildren(main);
  let candidates = direct;

  if (direct.length === 1) {
    const nested = meaningfulChildren(direct[0]);
    if (nested.length >= 2) candidates = nested;
  }

  if (candidates.length < 2) {
    const discovered = [...(main.querySelectorAll?.([
      ':scope > section',
      ':scope > article',
      ':scope > div > section',
      ':scope > div > article',
      ':scope > div > header',
      ':scope > div > main > section',
    ].join(',')) || [])].filter(visibleElement);
    if (discovered.length) candidates = discovered;
  }

  const unique = [];
  for (const node of candidates) {
    if (!unique.includes(node)) unique.push(node);
    if (unique.length >= 9) break;
  }
  return unique;
}

function clearNodeMotion(main) {
  if (!main) return;
  main.querySelectorAll?.('[data-w8-enter], [data-w8-exit]').forEach((node) => {
    delete node.dataset.w8Enter;
    delete node.dataset.w8Exit;
    node.style.removeProperty('--w8-stagger-index');
  });
  delete main.dataset.w8Choreography;
  delete main.dataset.w8Exiting;
}

function markExit(direction = 'forward') {
  if (!windows8Active()) return;
  const main = getMain();
  if (!main) return;

  main.dataset.w8Exiting = 'true';
  const items = collectChoreographyItems(main);
  items.forEach((node) => {
    delete node.dataset.w8Enter;
    node.dataset.w8Exit = direction;
  });
}

function markEntrance() {
  const main = getMain();
  if (!main) return;

  clearNodeMotion(main);
  if (!windows8Active()) return;

  main.dataset.w8Choreography = 'true';
  const items = collectChoreographyItems(main);
  items.forEach((node, index) => {
    node.style.setProperty('--w8-stagger-index', String(index));
    node.dataset.w8Enter = 'true';
  });

  window.setTimeout(() => {
    if (!main?.isConnected) return;
    items.forEach((node) => {
      if (node?.isConnected) {
        delete node.dataset.w8Enter;
        node.style.removeProperty('--w8-stagger-index');
      }
    });
    delete main.dataset.w8Choreography;
  }, 900);
}

function scheduleEntrance() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(markEntrance);
  });
}

export default function GlobalWindows8Experience({ route = 'home' }) {
  const previousRouteRef = useRef(routeName(window.location.hash || route));
  const cleanupTimerRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;

    const onNavigationStart = (event) => {
      const from = routeName(event?.detail?.from || window.location.hash || previousRouteRef.current);
      const to = routeName(event?.detail?.target || route);
      const direction = event?.detail?.direction || inferDirection(from, to);
      root.dataset.metroDirection = direction;
      root.dataset.metroFrom = from;
      root.dataset.metroTo = to;
      root.dataset.metroNavigating = 'true';
      markExit(direction);

      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => {
        const main = getMain();
        if (main) delete main.dataset.w8Exiting;
      }, 180);
    };

    const onMotionChange = () => {
      const main = getMain();
      if (windows8Active()) scheduleEntrance();
      else clearNodeMotion(main);
    };

    const onHashChange = () => {
      previousRouteRef.current = routeName(window.location.hash);
      scheduleEntrance();
    };

    window.addEventListener('bes-navigation-start', onNavigationStart);
    window.addEventListener(GLOBAL_MOTION_EVENT, onMotionChange);
    window.addEventListener('hashchange', onHashChange);
    scheduleEntrance();

    return () => {
      window.clearTimeout(cleanupTimerRef.current);
      window.removeEventListener('bes-navigation-start', onNavigationStart);
      window.removeEventListener(GLOBAL_MOTION_EVENT, onMotionChange);
      window.removeEventListener('hashchange', onHashChange);
      clearNodeMotion(getMain());
    };
  }, []);

  useEffect(() => {
    const previous = previousRouteRef.current;
    const next = routeName(route);
    if (previous !== next) {
      document.documentElement.dataset.metroDirection = inferDirection(previous, next);
      previousRouteRef.current = next;
    }
    scheduleEntrance();
  }, [route]);

  return null;
}
