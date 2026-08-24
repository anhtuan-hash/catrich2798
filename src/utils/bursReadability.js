import { FONT_SCALE_OPTIONS, normalizeFontScale } from './fontScale.js';

/*
 * BURS compatibility bridge — performance-safe.
 *
 * The previous implementation installed a document-wide MutationObserver and
 * repeatedly walked the whole DOM with getComputedStyle(). That caused visible
 * jank whenever React mounted cards, tables, portals or route content.
 *
 * This version keeps the public BURS/font-scale API and legacy data attributes,
 * but performs no DOM scanning and installs no MutationObserver.
 */

const STORAGE_KEY = 'bes-font-scale';
const APPEARANCE_KEY = 'bes-appearance-v2';
const MOBILE_MIN_WIDTH = 700;

function readAppearanceState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readRequestedScale() {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY) || 100);
    return normalizeFontScale(stored, 100);
  } catch {
    return 100;
  }
}

function resolveEffectiveScale(requested) {
  const mobile = window.matchMedia?.(`(max-width:${MOBILE_MIN_WIDTH - 1}px)`)?.matches;
  return mobile && requested < 100 ? 100 : requested;
}

function applyTypographyScale(value, { persist = false } = {}) {
  if (typeof document === 'undefined') return { requested: 100, effective: 100 };

  const requested = normalizeFontScale(value, readRequestedScale());
  const effective = typeof window === 'undefined' ? requested : resolveEffectiveScale(requested);
  const root = document.documentElement;
  const factor = effective / 100;

  root.dataset.burs = 'comfortable';
  root.dataset.fontScaleRequested = String(requested);
  root.dataset.fontScale = String(effective);
  root.dataset.typographyMode = effective > 100 ? 'large' : effective < 100 ? 'compact' : 'standard';
  root.style.setProperty('--bes-ds-scale', String(factor));
  root.style.setProperty('--bes-font-scale', String(factor));

  /* Preserve the established typography tokens without touching every node. */
  root.style.setProperty('--brian-font-body', `${16 * factor}px`);
  root.style.setProperty('--brian-font-body-lg', `${18 * factor}px`);
  root.style.setProperty('--brian-font-support', `${15 * factor}px`);
  root.style.setProperty('--brian-font-label', `${14 * factor}px`);
  root.style.setProperty('--brian-font-caption', `${14 * factor}px`);
  root.style.setProperty('--brian-font-control', `${16 * factor}px`);
  root.style.setProperty('--brian-font-card-title', `${20 * factor}px`);
  root.style.setProperty('--brian-font-section-title', `${24 * factor}px`);
  root.style.setProperty('--brian-font-kpi', `${38 * factor}px`);
  root.style.removeProperty('font-size');

  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, String(requested)); } catch { /* optional */ }
  }

  return { requested, effective };
}

export function installBursReadability() {
  if (typeof window === 'undefined' || window.__BURS_READABILITY_INSTALLED__) return;
  window.__BURS_READABILITY_INSTALLED__ = true;

  applyTypographyScale(readRequestedScale());

  const onFontScale = (event) => {
    const requested = normalizeFontScale(event?.detail?.scale, readRequestedScale());
    applyTypographyScale(requested, { persist: true });
  };

  const onAppearance = (event) => {
    const state = event?.detail?.state || readAppearanceState();
    const requested = state.projector
      ? 135
      : normalizeFontScale(state.textScale, readRequestedScale());
    applyTypographyScale(requested, { persist: true });
  };

  let resizeFrame = 0;
  const onResize = () => {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      applyTypographyScale(readRequestedScale());
    });
  };

  window.addEventListener('bes:font-scale-changed', onFontScale);
  window.addEventListener('bes:appearance-changed', onAppearance);
  window.addEventListener('bes:appearance-ready', onAppearance);
  window.addEventListener('resize', onResize, { passive: true });

  window.BURS = Object.freeze({
    mode: 'performance-safe',
    cardTypography: false,
    scales: [...FONT_SCALE_OPTIONS],
    applyScale: (scale) => applyTypographyScale(scale, { persist: true }),
    rescan: () => applyTypographyScale(readRequestedScale()),
  });
}
