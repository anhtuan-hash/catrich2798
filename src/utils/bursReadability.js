import { FONT_SCALE_OPTIONS, normalizeFontScale } from './fontScale.js';

/*
 * BURS 2026 compatibility bridge.
 *
 * Typography no longer lives here. BrianDesignSystem2026.css is the only
 * source of font sizes, line heights and semantic hierarchy. BURS now manages
 * one global scale variable only, preserving accessibility controls without
 * scanning the DOM, injecting styles or rewriting individual components.
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
  const stored = Number(localStorage.getItem(STORAGE_KEY) || 100);
  return normalizeFontScale(stored, 100);
}

function resolveEffectiveScale(requested) {
  const mobile = window.matchMedia?.(`(max-width:${MOBILE_MIN_WIDTH - 1}px)`)?.matches;
  return mobile && requested < 100 ? 100 : requested;
}

function activateDesignSystemShell(attempt = 0) {
  const shell = document.querySelector('.app-shell.metro-clean-system');
  if (shell) {
    shell.setAttribute('data-brian-ds', '2026');
    return true;
  }
  if (attempt < 80) window.setTimeout(() => activateDesignSystemShell(attempt + 1), 50);
  return false;
}

function applyTypographyScale(value, { persist = false } = {}) {
  if (typeof document === 'undefined') return { requested: 100, effective: 100 };

  const requested = normalizeFontScale(value, readRequestedScale());
  const effective = typeof window === 'undefined' ? requested : resolveEffectiveScale(requested);
  const root = document.documentElement;

  root.dataset.fontScaleRequested = String(requested);
  root.dataset.fontScale = String(effective);
  root.dataset.typographyMode = effective > 100 ? 'large' : effective < 100 ? 'compact' : 'standard';
  root.dataset.brianTypography = 'design-system-2026';
  root.style.setProperty('--bes-ds-scale', String(effective / 100));

  /* Appearance Engine used to scale the root font-size. That made rem-based
     pages grow while px-based pages stayed unchanged. Lock the root at 100%
     and scale only the Brian Design System tokens above. */
  root.style.setProperty('font-size', '100%', 'important');

  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, String(requested)); } catch { /* optional */ }
  }

  return { requested, effective };
}

export function installBursReadability() {
  if (typeof window === 'undefined' || window.__BURS_READABILITY_INSTALLED__) return;
  window.__BURS_READABILITY_INSTALLED__ = true;

  const root = document.documentElement;
  root.dataset.burs = 'design-system';
  applyTypographyScale(readRequestedScale());
  activateDesignSystemShell();

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

  const onResize = () => applyTypographyScale(readRequestedScale());
  const onRouteChange = () => {
    applyTypographyScale(readRequestedScale());
    activateDesignSystemShell();
  };

  window.addEventListener('bes:font-scale-changed', onFontScale);
  window.addEventListener('bes:appearance-changed', onAppearance);
  window.addEventListener('bes:appearance-ready', onAppearance);
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('hashchange', onRouteChange);

  window.BURS = Object.freeze({
    mode: 'design-system-2026',
    cardTypography: false,
    scales: [...FONT_SCALE_OPTIONS],
    applyScale: (scale) => applyTypographyScale(scale, { persist: true }),
    rescan: () => {
      activateDesignSystemShell();
      return applyTypographyScale(readRequestedScale());
    },
  });
}
