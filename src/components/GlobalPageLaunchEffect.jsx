import React, { useEffect } from 'react';
import './GlobalPageLaunchEffect.css';

const LAUNCH_DURATION = 1150;
const REVEAL_DURATION = 180;

function reducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function launchEffectEnabled() {
  return !reducedMotion();
}

function internalHashTarget(value = '') {
  const target = String(value || '').trim();
  return target.startsWith('#/') ? target : '';
}

function nextPaint(callback) {
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
}

function makeCube(parent, index) {
  const box = document.createElement('div');
  box.className = `brian-cube-box brian-cube-box${index}`;
  box.appendChild(document.createElement('div'));
  parent.appendChild(box);
}

function makeOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'brian-global-launch-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-label', 'Đang mở trang');

  const stage = document.createElement('div');
  stage.className = 'brian-cube-transition';

  for (let index = 0; index < 8; index += 1) makeCube(stage, index);

  const ground = document.createElement('div');
  ground.className = 'brian-cube-ground';
  ground.appendChild(document.createElement('div'));
  stage.appendChild(ground);

  overlay.appendChild(stage);
  document.body.appendChild(overlay);
  window.requestAnimationFrame(() => overlay.classList.add('is-active'));
  return overlay;
}

export default function GlobalPageLaunchEffect() {
  useEffect(() => {
    let locked = false;
    let clickSnapshot = null;
    let currentCleanup = null;
    let launchTimer = 0;
    let revealTimer = 0;

    const cleanupRoot = () => {
      document.documentElement.classList.remove('brian-global-page-launching');
      document.documentElement.removeAttribute('data-global-launch-owner');
    };

    const clearTimers = () => {
      window.clearTimeout(launchTimer);
      window.clearTimeout(revealTimer);
      launchTimer = 0;
      revealTimer = 0;
    };

    const beginLaunch = ({ target, navigateAtEnd = true }) => {
      const normalizedTarget = internalHashTarget(target);
      if (!normalizedTarget || locked || !launchEffectEnabled()) return false;
      if (navigateAtEnd && window.location.hash === normalizedTarget) return false;

      locked = true;
      clearTimers();
      document.documentElement.classList.add('brian-global-page-launching');
      document.documentElement.dataset.globalLaunchOwner = 'cube-loader';

      const overlay = makeOverlay();
      let cleaned = false;

      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        clearTimers();
        overlay.remove();
        cleanupRoot();
        locked = false;
        currentCleanup = null;
      };
      currentCleanup = cleanup;

      const revealDestination = () => {
        nextPaint(() => {
          if (!overlay.isConnected) {
            cleanup();
            return;
          }
          overlay.classList.add('is-leaving');
          revealTimer = window.setTimeout(cleanup, REVEAL_DURATION + 40);
        });
      };

      launchTimer = window.setTimeout(() => {
        if (navigateAtEnd && window.location.hash !== normalizedTarget) {
          window.location.hash = normalizedTarget;
        }
        revealDestination();
      }, LAUNCH_DURATION);

      return true;
    };

    const onNavigationStart = (event) => {
      if (!launchEffectEnabled() || locked) return;
      const target = internalHashTarget(event?.detail?.target);
      if (!target || target === window.location.hash) return;
      event.preventDefault();
      beginLaunch({ target, navigateAtEnd: true });
    };

    const onClickCapture = (event) => {
      if (!launchEffectEnabled() || locked) {
        clickSnapshot = null;
        return;
      }
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        clickSnapshot = null;
        return;
      }

      const sourceEl = event.target?.closest?.('a,button,[role="button"],[data-route],[data-target]') || null;
      clickSnapshot = { hash: window.location.hash, sourceEl };

      const anchor = event.target?.closest?.('a[href]');
      const target = internalHashTarget(anchor?.getAttribute?.('href'));
      if (!target || target === window.location.hash || anchor?.target === '_blank' || anchor?.hasAttribute?.('download')) return;

      event.preventDefault();
      event.stopPropagation();
      clickSnapshot = null;
      beginLaunch({ target, navigateAtEnd: true });
    };

    const onClickBubble = () => {
      const snapshot = clickSnapshot;
      clickSnapshot = null;
      if (!snapshot || locked || !launchEffectEnabled()) return;

      queueMicrotask(() => {
        if (locked || !launchEffectEnabled()) return;
        const target = internalHashTarget(window.location.hash);
        if (!target || target === snapshot.hash) return;

        // Legacy controls may still assign location.hash directly. In that case
        // the overlay cannot postpone the already-issued hash mutation, but it
        // immediately covers the destination paint for a consistent transition.
        beginLaunch({ target, navigateAtEnd: false });
      });
    };

    const onPageShow = () => currentCleanup?.();

    window.addEventListener('bes-navigation-start', onNavigationStart);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('click', onClickBubble, false);

    return () => {
      window.removeEventListener('bes-navigation-start', onNavigationStart);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('click', onClickBubble, false);
      currentCleanup?.();
      clearTimers();
      cleanupRoot();
    };
  }, []);

  return null;
}
