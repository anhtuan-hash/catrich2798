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

function visibleElement(node) {
  if (!node?.isConnected || node.nodeType !== 1) return false;
  if (node.hidden || node.getAttribute?.('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0;
}

function clearStagger(main) {
  main?.querySelectorAll?.('[data-w8-stagger="true"]').forEach((node) => {
    delete node.dataset.w8Stagger;
    node.style.removeProperty('--w8-stagger-index');
  });
  if (main) delete main.dataset.w8Choreography;
}

function collectChoreographyItems(main) {
  const direct = [...(main?.children || [])]
    .filter((node) => visibleElement(node) && !node.matches('script, style, link'));

  const collected = [...direct];
  if (collected.length < 5) {
    const nested = main?.querySelectorAll?.([
      ':scope > div > section',
      ':scope > div > article',
      ':scope > section > article',
      ':scope > section > div',
      '[class*="grid"] > article',
      '[class*="grid"] > section',
      '[class*="dashboard"] > section',
    ].join(',')) || [];
    [...nested].forEach((node) => {
      if (visibleElement(node) && !collected.includes(node)) collected.push(node);
    });
  }
  return collected.slice(0, 12);
}

function markPageChoreography() {
  const main = document.getElementById('bes-main-content') || document.querySelector('[data-bes-main-content]');
  if (!main) return;
  clearStagger(main);
  if (!windows8Active()) return;

  main.dataset.w8Choreography = 'true';
  collectChoreographyItems(main).forEach((node, index) => {
    node.dataset.w8Stagger = 'true';
    node.style.setProperty('--w8-stagger-index', String(index));
  });
}

function scheduleChoreography() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(markPageChoreography);
  });
}

export default function GlobalWindows8Experience({ route = 'home' }) {
  const previousRouteRef = useRef(routeName(window.location.hash || route));
  const cleanupTimerRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;

    const onNavigationStart = (event) => {
      const from = routeName(window.location.hash || previousRouteRef.current);
      const to = routeName(event?.detail?.target || route);
      root.dataset.metroDirection = inferDirection(from, to);
      root.dataset.metroFrom = from;
      root.dataset.metroTo = to;
      root.dataset.metroNavigating = 'true';
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => {
        delete root.dataset.metroNavigating;
      }, 720);
    };

    const onMotionChange = () => {
      if (windows8Active()) scheduleChoreography();
      else {
        const main = document.getElementById('bes-main-content') || document.querySelector('[data-bes-main-content]');
        clearStagger(main);
      }
    };

    const onHashChange = () => {
      previousRouteRef.current = routeName(window.location.hash);
      scheduleChoreography();
    };

    window.addEventListener('bes-navigation-start', onNavigationStart);
    window.addEventListener(GLOBAL_MOTION_EVENT, onMotionChange);
    window.addEventListener('hashchange', onHashChange);
    scheduleChoreography();

    return () => {
      window.clearTimeout(cleanupTimerRef.current);
      window.removeEventListener('bes-navigation-start', onNavigationStart);
      window.removeEventListener(GLOBAL_MOTION_EVENT, onMotionChange);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  useEffect(() => {
    const previous = previousRouteRef.current;
    const next = routeName(route);
    if (previous !== next) {
      document.documentElement.dataset.metroDirection = inferDirection(previous, next);
      previousRouteRef.current = next;
    }
    scheduleChoreography();
  }, [route]);

  return null;
}
