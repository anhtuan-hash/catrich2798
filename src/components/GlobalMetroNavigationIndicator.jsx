import React, { useEffect } from 'react';
import { GLOBAL_MOTION_EVENT } from '../utils/globalMotionSystem.js';
import './GlobalMetroNavigationIndicator.css';

const PRIMARY_SELECTOR = '.brian-nav__primary';
const INDICATOR_CLASS = 'brian-nav__metro-indicator';
const ACTIVE_SELECTOR = [
  ':scope > button.is-active',
  ':scope > button.active',
  ':scope > button[aria-current="page"]',
  ':scope > a.is-active',
  ':scope > a.active',
  ':scope > a[aria-current="page"]',
].join(',');

function isReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function isWindows8MotionActive() {
  const root = document.documentElement;
  return root?.dataset?.motionMode === 'windows8'
    && root?.dataset?.motionEnabled === 'true'
    && !isReducedMotion();
}

function readTargetGeometry(primary, active) {
  const primaryRect = primary.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const width = Math.max(24, Math.min(54, activeRect.width * .52));
  return {
    left: activeRect.left - primaryRect.left + primary.scrollLeft + ((activeRect.width - width) / 2),
    width,
  };
}

function geometryChanged(previous, next) {
  if (!previous) return false;
  return Math.abs(previous.left - next.left) > 0.5 || Math.abs(previous.width - next.width) > 0.5;
}

function metroKeyframes(previous, next) {
  const delta = previous.left - next.left;
  const scale = next.width > 0 ? previous.width / next.width : 1;
  return [
    {
      transform: `translate3d(${delta}px,0,0) scaleX(${scale})`,
      opacity: .82,
      offset: 0,
    },
    {
      transform: `translate3d(${delta * .22}px,0,0) scaleX(1)`,
      opacity: 1,
      offset: .72,
    },
    { transform: 'translate3d(0,0,0) scaleX(1)', opacity: 1, offset: 1 },
  ];
}

export default function GlobalMetroNavigationIndicator({ route }) {
  useEffect(() => {
    let primary = null;
    let indicator = null;
    let mutationObserver = null;
    let resizeObserver = null;
    let frame = 0;
    let previousGeometry = null;
    let destroyed = false;

    const cancelFrame = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const ensureIndicator = () => {
      primary = document.querySelector(PRIMARY_SELECTOR);
      if (!primary) return false;

      indicator = primary.querySelector(`:scope > .${INDICATOR_CLASS}`);
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = INDICATOR_CLASS;
        indicator.setAttribute('aria-hidden', 'true');
        primary.appendChild(indicator);
      }
      return true;
    };

    const updateIndicator = ({ animate = true } = {}) => {
      if (destroyed || !ensureIndicator()) return;
      const active = primary.querySelector(ACTIVE_SELECTOR);
      if (!active) {
        indicator.dataset.ready = 'false';
        previousGeometry = null;
        return;
      }

      const nextGeometry = readTargetGeometry(primary, active);
      const shouldTravel = animate
        && isWindows8MotionActive()
        && geometryChanged(previousGeometry, nextGeometry)
        && typeof indicator.animate === 'function';

      indicator.getAnimations?.().forEach((animation) => animation.cancel());
      indicator.style.left = `${nextGeometry.left}px`;
      indicator.style.width = `${nextGeometry.width}px`;
      indicator.dataset.ready = 'true';

      if (shouldTravel && previousGeometry) {
        indicator.dataset.traveling = 'true';
        const animation = indicator.animate(
          metroKeyframes(previousGeometry, nextGeometry),
          {
            duration: 190,
            easing: 'cubic-bezier(.1,.9,.2,1)',
            fill: 'none',
          },
        );
        animation.finished
          .catch(() => {})
          .finally(() => {
            if (indicator?.isConnected) delete indicator.dataset.traveling;
          });
      } else {
        delete indicator.dataset.traveling;
      }

      previousGeometry = nextGeometry;
    };

    const scheduleUpdate = (options = {}) => {
      cancelFrame();
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateIndicator(options);
      });
    };

    if (!ensureIndicator()) scheduleUpdate({ animate: false });
    else updateIndicator({ animate: false });

    const onPrimaryScroll = () => scheduleUpdate({ animate: false });

    if (primary) {
      mutationObserver = new MutationObserver((mutations) => {
        const relevant = mutations.some((mutation) => {
          if (mutation.type === 'childList') {
            return [...mutation.addedNodes, ...mutation.removedNodes]
              .some((node) => node !== indicator);
          }
          return mutation.target !== indicator;
        });
        if (relevant) scheduleUpdate({ animate: true });
      });
      mutationObserver.observe(primary, {
        childList: true,
        subtree: false,
        attributes: true,
        attributeFilter: ['class', 'aria-current'],
      });

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => scheduleUpdate({ animate: false }));
        resizeObserver.observe(primary);
      }

      primary.addEventListener('scroll', onPrimaryScroll, { passive: true });
    }

    const onViewportChange = () => scheduleUpdate({ animate: false });
    const onMotionChange = () => scheduleUpdate({ animate: false });
    const onRouteRefresh = () => scheduleUpdate({ animate: true });

    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener(GLOBAL_MOTION_EVENT, onMotionChange);
    window.addEventListener('bes-metro-indicator-refresh', onRouteRefresh);

    return () => {
      destroyed = true;
      cancelFrame();
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      primary?.removeEventListener('scroll', onPrimaryScroll);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener(GLOBAL_MOTION_EVENT, onMotionChange);
      window.removeEventListener('bes-metro-indicator-refresh', onRouteRefresh);
      indicator?.getAnimations?.().forEach((animation) => animation.cancel());
      indicator?.remove();
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bes-metro-indicator-refresh', { detail: { route } }));
  }, [route]);

  return null;
}
