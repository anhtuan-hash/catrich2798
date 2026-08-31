import React, { useEffect } from 'react';
import { GLOBAL_MOTION_EVENT } from '../utils/globalMotionSystem.js';
import './GlobalPageLaunchEffect.css';

const LAUNCH_DURATION = 480;
const REVEAL_DURATION = 180;
const LAUNCH_EASING = 'cubic-bezier(.2,.82,.2,1)';
const FALLBACK_COLOR = '#6543b5';

function reducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function launchEffectEnabled() {
  const root = document.documentElement;
  return root?.dataset?.motionEnabled === 'true'
    && root?.dataset?.motionPage === 'metro-sweep'
    && !reducedMotion();
}

function internalHashTarget(value = '') {
  const target = String(value || '').trim();
  return target.startsWith('#/') ? target : '';
}

function nextPaint(callback) {
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
}

function isVeryLightColor(color = '') {
  const rgb = String(color).match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgb) {
    const alpha = rgb[4] == null ? 1 : Number(rgb[4]);
    if (alpha <= 0.08) return true;
    const [r, g, b] = rgb.slice(1, 4).map(Number);
    return ((r * 0.299) + (g * 0.587) + (b * 0.114)) > 232;
  }
  const hex = String(color).match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return ((r * 0.299) + (g * 0.587) + (b * 0.114)) > 232;
  }
  return false;
}

function readableColor(value = '') {
  const color = String(value || '').trim();
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || isVeryLightColor(color)) return '';
  return color;
}

function sourceColor(sourceEl, preferred = '') {
  const explicit = readableColor(preferred);
  if (explicit) return explicit;
  if (!sourceEl?.isConnected) return FALLBACK_COLOR;

  let node = sourceEl;
  for (let depth = 0; depth < 3 && node; depth += 1, node = node.parentElement) {
    const style = window.getComputedStyle(node);
    const tileColor = readableColor(style.getPropertyValue('--tile-color'));
    if (tileColor) return tileColor;
    const background = readableColor(style.backgroundColor);
    if (background) return background;
  }
  return FALLBACK_COLOR;
}

function sourceLabel(sourceEl, preferred = '') {
  const explicit = String(preferred || '').trim();
  if (explicit) return explicit;
  return String(
    sourceEl?.getAttribute?.('aria-label')
      || sourceEl?.textContent
      || 'Brian',
  ).replace(/\s+/g, ' ').trim().slice(0, 80) || 'Brian';
}

function sourceRect(sourceEl) {
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const raw = sourceEl?.isConnected && typeof sourceEl.getBoundingClientRect === 'function'
    ? sourceEl.getBoundingClientRect()
    : null;

  if (!raw || raw.width < 2 || raw.height < 2) {
    const width = Math.min(180, viewportWidth * 0.22);
    const height = Math.min(96, viewportHeight * 0.14);
    return {
      left: (viewportWidth - width) / 2,
      top: (viewportHeight - height) / 2,
      width,
      height,
    };
  }

  // Navigation tabs can be extremely thin. A minimum launch surface preserves
  // the Windows 8 expansion feeling without creating an extreme scale ratio.
  const width = Math.min(viewportWidth, Math.max(raw.width, 92));
  const height = Math.min(viewportHeight, Math.max(raw.height, 52));
  const left = Math.max(0, Math.min(viewportWidth - width, raw.left - ((width - raw.width) / 2)));
  const top = Math.max(0, Math.min(viewportHeight - height, raw.top - ((height - raw.height) / 2)));
  return { left, top, width, height };
}

function makeOverlay({ sourceEl, color, label }) {
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const rect = sourceRect(sourceEl);
  const scaleX = Math.max(rect.width / viewportWidth, 0.001);
  const scaleY = Math.max(rect.height / viewportHeight, 0.001);
  const initialTransform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(${scaleX}, ${scaleY})`;

  const overlay = document.createElement('div');
  overlay.className = 'brian-global-launch-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.background = sourceColor(sourceEl, color);
  overlay.style.transform = initialTransform;

  const copy = document.createElement('span');
  copy.textContent = sourceLabel(sourceEl, label);
  overlay.appendChild(copy);
  document.body.appendChild(overlay);

  return { overlay, copy, initialTransform };
}

export default function GlobalPageLaunchEffect() {
  useEffect(() => {
    let locked = false;
    let clickSnapshot = null;
    let currentCleanup = null;

    const cleanupRoot = () => {
      document.documentElement.classList.remove('brian-global-page-launching');
      document.documentElement.removeAttribute('data-global-launch-owner');
    };

    const beginLaunch = ({ target, sourceEl, color = '', label = '', navigateAtEnd = true }) => {
      const normalizedTarget = internalHashTarget(target);
      if (!normalizedTarget || locked || !launchEffectEnabled()) return false;
      if (navigateAtEnd && window.location.hash === normalizedTarget) return false;

      locked = true;
      document.documentElement.classList.add('brian-global-page-launching');
      document.documentElement.dataset.globalLaunchOwner = 'windows8-app-launch';
      sourceEl?.classList?.add('is-global-launch-source');

      const { overlay, copy, initialTransform } = makeOverlay({ sourceEl, color, label });
      const main = document.getElementById('bes-main-content') || document.querySelector('[data-bes-main-content]');

      const pageAnimation = navigateAtEnd && main?.animate ? main.animate([
        { opacity: 1, transform: 'translate3d(0,0,0)' },
        { opacity: 0.16, transform: 'translate3d(-10px,0,0)' },
      ], {
        duration: 360,
        delay: 80,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'forwards',
      }) : null;

      const labelAnimation = copy.animate([
        { opacity: 0, transform: 'translate3d(34px,0,0)' },
        { opacity: 0, transform: 'translate3d(20px,0,0)', offset: 0.28 },
        { opacity: 0.92, transform: 'translate3d(0,0,0)' },
      ], {
        duration: LAUNCH_DURATION,
        easing: LAUNCH_EASING,
        fill: 'forwards',
      });

      const launchAnimation = overlay.animate([
        { transform: initialTransform },
        { transform: 'translate3d(0,0,0) scale(1,1)' },
      ], {
        duration: LAUNCH_DURATION,
        easing: LAUNCH_EASING,
        fill: 'forwards',
      });

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        pageAnimation?.cancel();
        labelAnimation?.cancel();
        launchAnimation?.cancel();
        overlay.remove();
        sourceEl?.classList?.remove('is-global-launch-source');
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
          const reveal = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: REVEAL_DURATION,
            easing: 'cubic-bezier(.2,.8,.2,1)',
            fill: 'forwards',
          });
          reveal.finished.then(cleanup).catch(cleanup);
        });
      };

      launchAnimation.finished.then(() => {
        if (navigateAtEnd) window.location.hash = normalizedTarget;
        revealDestination();
      }).catch(() => {
        if (navigateAtEnd && window.location.hash !== normalizedTarget) window.location.hash = normalizedTarget;
        cleanup();
      });
      return true;
    };

    const onNavigationStart = (event) => {
      if (!launchEffectEnabled() || locked) return;
      const target = internalHashTarget(event?.detail?.target);
      if (!target || target === window.location.hash) return;
      event.preventDefault();
      beginLaunch({
        target,
        sourceEl: event?.detail?.sourceEl || null,
        color: event?.detail?.color || '',
        label: event?.detail?.label || '',
        navigateAtEnd: true,
      });
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
      beginLaunch({
        target,
        sourceEl: anchor,
        label: anchor.getAttribute('aria-label') || anchor.textContent || '',
        navigateAtEnd: true,
      });
    };

    const onClickBubble = () => {
      const snapshot = clickSnapshot;
      clickSnapshot = null;
      if (!snapshot || locked || !launchEffectEnabled()) return;

      queueMicrotask(() => {
        if (locked || !launchEffectEnabled()) return;
        const target = internalHashTarget(window.location.hash);
        if (!target || target === snapshot.hash) return;
        // Some legacy buttons assign location.hash directly instead of using
        // launchRoute(). The URL changes synchronously, while hashchange/render
        // happens on the next task, so this compositor overlay still starts in
        // time to cover the destination paint.
        beginLaunch({
          target,
          sourceEl: snapshot.sourceEl,
          navigateAtEnd: false,
        });
      });
    };

    const onMotionChange = () => {
      if (!launchEffectEnabled() && locked) currentCleanup?.();
    };

    window.addEventListener('bes-navigation-start', onNavigationStart);
    window.addEventListener(GLOBAL_MOTION_EVENT, onMotionChange);
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('click', onClickBubble, false);

    return () => {
      window.removeEventListener('bes-navigation-start', onNavigationStart);
      window.removeEventListener(GLOBAL_MOTION_EVENT, onMotionChange);
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('click', onClickBubble, false);
      currentCleanup?.();
      cleanupRoot();
    };
  }, []);

  return null;
}
