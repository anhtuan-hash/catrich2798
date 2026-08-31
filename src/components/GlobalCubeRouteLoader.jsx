import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { launchRoute } from '../utils/navigation.js';
import './GlobalCubeRouteLoader.css';

const CUBE_EVENT = 'bes-cube-navigation-request';
const CUBE_VISIBLE_MS = 860;
const CUBE_FADE_MS = 120;

function reducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

function internalHashTarget(value = '') {
  const target = String(value || '').trim();
  return target.startsWith('#/') ? target : '';
}

export default function GlobalCubeRouteLoader() {
  const [host, setHost] = useState(null);
  const [phase, setPhase] = useState('idle');
  const pendingRef = useRef(null);
  const timerRef = useRef(0);
  const fadeTimerRef = useRef(0);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    setHost(document.body);

    const clearTimers = () => {
      window.clearTimeout(timerRef.current);
      window.clearTimeout(fadeTimerRef.current);
      timerRef.current = 0;
      fadeTimerRef.current = 0;
    };

    const finishAndContinue = () => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      setPhase('idle');
      document.documentElement.classList.remove('brian-cube-route-loading');
      if (!pending?.target) return;

      launchRoute({
        target: pending.target,
        navigate: pending.navigate,
        sourceEl: pending.sourceEl || null,
        label: pending.label || '',
        color: pending.color || '',
        meta: {
          ...(pending.meta && typeof pending.meta === 'object' ? pending.meta : {}),
          __skipCubeLoader: true,
        },
      });
    };

    const play = (detail = {}) => {
      const target = internalHashTarget(detail.target);
      if (!target || target === window.location.hash || reducedMotion()) return false;
      if (pendingRef.current) return true;

      clearTimers();
      pendingRef.current = { ...detail, target };
      document.documentElement.classList.add('brian-cube-route-loading');
      setPhase('visible');

      timerRef.current = window.setTimeout(() => {
        setPhase('leaving');
        fadeTimerRef.current = window.setTimeout(finishAndContinue, CUBE_FADE_MS);
      }, CUBE_VISIBLE_MS);
      return true;
    };

    const onCubeRequest = (event) => {
      if (event?.detail?.__skipCubeLoader || reducedMotion()) return;
      const target = internalHashTarget(event?.detail?.target);
      if (!target || target === window.location.hash) return;
      event.preventDefault();
      play(event.detail || {});
    };

    const onAnchorCapture = (event) => {
      if (phase !== 'idle' || pendingRef.current || reducedMotion()) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target?.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const target = internalHashTarget(anchor.getAttribute('href'));
      if (!target || target === window.location.hash) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      play({
        target,
        sourceEl: anchor,
        label: anchor.getAttribute('aria-label') || anchor.textContent || '',
        color: '',
        meta: { source: 'cube-anchor-capture' },
      });
    };

    const onPageHide = () => {
      clearTimers();
      pendingRef.current = null;
      setPhase('idle');
      document.documentElement.classList.remove('brian-cube-route-loading');
    };

    window.addEventListener(CUBE_EVENT, onCubeRequest);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('click', onAnchorCapture, true);

    return () => {
      clearTimers();
      pendingRef.current = null;
      window.removeEventListener(CUBE_EVENT, onCubeRequest);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('click', onAnchorCapture, true);
      document.documentElement.classList.remove('brian-cube-route-loading');
    };
  }, [phase]);

  if (!host || phase === 'idle') return null;

  return createPortal(
    <div
      id="bes-cube-route-loader"
      className={`bes-cube-route-loader ${phase === 'leaving' ? 'is-leaving' : 'is-visible'}`}
      role="status"
      aria-live="polite"
      aria-label="Đang mở trang"
    >
      <div className="bes-cube-stage" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className={`bes-cube-piece bes-cube-piece-${index}`}><i /></span>
        ))}
        <span className="bes-cube-ground" />
      </div>
    </div>,
    host,
  );
}
