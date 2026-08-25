import { useLayoutEffect } from 'react';

const APPEARANCE_KEY = 'bes-appearance-v2';
const RETIRED_KEYS = [
  'bes-font-scale',
  'bes-text-scale',
  'bet-font-scale',
  'bet-text-scale',
  'burs-font-scale',
];

const RETIRED_ROOT_VARIABLES = [
  '--bes-text-scale',
  '--bes-ds-scale',
  '--bes-font-scale',
  '--brian-font-body',
  '--brian-font-body-lg',
  '--brian-font-support',
  '--brian-font-label',
  '--brian-font-caption',
  '--brian-font-control',
  '--brian-font-card-title',
  '--brian-font-section-title',
  '--brian-font-kpi',
  '--font-sans',
  '--font-display',
  '--font-body',
];

const RETIRED_ROOT_ATTRIBUTES = [
  'data-font-scale',
  'data-font-scale-requested',
  'data-typography-mode',
];

function clearLegacyStorage() {
  try {
    RETIRED_KEYS.forEach((key) => window.localStorage.removeItem(key));

    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return;
    const current = JSON.parse(raw);
    if (!current || typeof current !== 'object' || Array.isArray(current) || !('textScale' in current)) return;

    const next = { ...current };
    delete next.textScale;
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
  } catch {
    /* local storage is optional */
  }
}

function cleanupLegacyTypographyState() {
  if (typeof document === 'undefined') return;
  clearLegacyStorage();
  document.getElementById('brian-personal-font-boot')?.remove();

  const root = document.documentElement;
  root.style.removeProperty('font-size');
  root.style.removeProperty('font-family');
  RETIRED_ROOT_VARIABLES.forEach((property) => root.style.removeProperty(property));
  RETIRED_ROOT_ATTRIBUTES.forEach((attribute) => root.removeAttribute(attribute));

  document.body?.style.removeProperty('font-family');
  document.getElementById('root')?.style.removeProperty('font-family');
}

/* Compatibility component for older lazy imports.
   It performs one migration cleanup before paint and then stays inert.
   No observers, resize/hash/storage listeners, timers or global typography
   writers are installed. */
export default function GlobalNativeTextScaleReset() {
  useLayoutEffect(() => {
    cleanupLegacyTypographyState();
  }, []);

  return null;
}
