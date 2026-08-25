import { useEffect, useLayoutEffect } from 'react';
import './GlobalNativeTextScaleReset.css';

const APPEARANCE_KEY = 'bes-appearance-v2';
const RETIRED_KEYS = [
  'bes-font-scale',
  'bes-text-scale',
  'bet-font-scale',
  'bet-text-scale',
  'burs-font-scale',
  'bes-display-density',
];

function clearLegacyStorage() {
  try {
    RETIRED_KEYS.forEach((key) => window.localStorage.removeItem(key));

    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return;
    const current = JSON.parse(raw);
    if (!current || typeof current !== 'object' || Array.isArray(current)) return;

    const next = { ...current };
    delete next.textScale;
    delete next.projector;
    delete next.density;
    delete next.contentWidth;
    delete next.touchTargets;
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
  } catch {
    /* local storage is optional */
  }
}

function removeRuntimeScaleMarkers() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.removeProperty('font-size');
  root.style.removeProperty('--bes-text-scale');
  root.style.removeProperty('--bes-ds-scale');
  root.style.removeProperty('--bes-font-scale');
  root.removeAttribute('data-font-scale');
  root.removeAttribute('data-font-scale-requested');
  root.removeAttribute('data-typography-mode');
  root.removeAttribute('data-burs');

  document.querySelectorAll('.metro-clean-system[data-burs], .app-shell[data-burs]').forEach((node) => {
    node.removeAttribute('data-burs');
  });
}

function cleanupLegacyDisplayState() {
  clearLegacyStorage();
  removeRuntimeScaleMarkers();
}

export default function GlobalNativeTextScaleReset() {
  /* Remove stale inline sizing before the browser paints the mounted shell. */
  useLayoutEffect(() => {
    cleanupLegacyDisplayState();
  });

  useEffect(() => {
    const cleanup = () => cleanupLegacyDisplayState();

    cleanup();
    window.addEventListener('bes:font-scale-changed', cleanup);
    window.addEventListener('bes:appearance-changed', cleanup);
    window.addEventListener('bes:appearance-ready', cleanup);
    return () => {
      window.removeEventListener('bes:font-scale-changed', cleanup);
      window.removeEventListener('bes:appearance-changed', cleanup);
      window.removeEventListener('bes:appearance-ready', cleanup);
    };
  }, []);

  return null;
}
