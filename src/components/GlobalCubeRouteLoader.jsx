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
  const phaseRef = useRef('idle');
  const pendingRef = useRef(null);
  const clickSnapshotRef = useRef(null);
  const timerRef = useRef(0);
  const fadeTimerRef = useRef(0);

  const setLoaderPhase = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };

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
      setLoaderPhase('idle');
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
      setLoaderPhase('visible');

      timerRef.current = window.setTimeout(() => {
        setLoaderPhase('leaving');
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

    const onClickCapture = (event) => {
      clickSnapshotRef.current = null;
      if (phaseRef.current !== 'idle' || pendingRef.current || reducedMotion()) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const sourceEl = event.target?.closest?.('a,button,[role="button"],[data-route],[data-target]') || null;
      clickSnapshotRef.current = {
        hash: window.location.hash,
        href: window.location.href,
        sourceEl,
      };

      const anchor = event.target?.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const target = internalHashTarget(anchor.getAttribute('href'));
      if (!target || target === window.location.hash) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      clickSnapshotRef.current = null;
      play({
        target,
        sourceEl: anchor,
        label: anchor.getAttribute('aria-label') || anchor.textContent || '',
        color: '',
        meta: { source: 'cube-anchor-capture' },
      });
    };

    const onClickBubble = () => {
      const snapshot = clickSnapshotRef.current;
      clickSnapshotRef.current = null;
      if (!snapshot || pendingRef.current || phaseRef.current !== 'idle' || reducedMotion()) return;

      queueMicrotask(() => {
        if (pendingRef.current || phaseRef.current !== 'idle') return;
        const target = internalHashTarget(window.location.hash);
        if (!target || target === snapshot.hash) return;

        // Legacy controls may assign location.hash directly in their click
        // handler. hashchange is delivered later, so restoring the previous URL
        // here prevents the destination from rendering before the cube phase.
        try { window.history.replaceState(window.history.state, '', snapshot.href); } catch { /* same-origin fallback below */ }
        if (window.location.hash !== snapshot.hash) {
          try { window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${snapshot.hash || ''}`); } catch { /* optional */ }
        }

        play({
          target,
          sourceEl: snapshot.sourceEl,
          label: snapshot.sourceEl?.getAttribute?.('aria-label') || snapshot.sourceEl?.textContent || '',
          color: '',
          meta: { source: 'cube-legacy-hash-capture' },
        });
      });
    };

    const onPageHide = () => {
      clearTimers();
      pendingRef.current = null;
      clickSnapshotRef.current = null;
      setLoaderPhase('idle');
      document.documentElement.classList.remove('brian-cube-route-loading');
    };

    window.addEventListener(CUBE_EVENT, onCubeRequest);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('click', onClickBubble, false);

    return () => {
      clearTimers();
      pendingRef.current = null;
      clickSnapshotRef.current = null;
      window.removeEventListener(CUBE_EVENT, onCubeRequest);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('click', onClickBubble, false);
      document.documentElement.classList.remove('brian-cube-route-loading');
    };
  }, []);

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
