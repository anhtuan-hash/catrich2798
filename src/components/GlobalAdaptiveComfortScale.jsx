import { useLayoutEffect } from 'react';
import '../styles/GlobalDashboardScaleBaseline.css';

const LEGACY_MIGRATION_MARKER = 'bes-adaptive-comfort-1440-v1';
const DASHBOARD_BASELINE_MARKER = 'bes-dashboard-scale-standard-v1';
const APPEARANCE_STORAGE_KEY = 'bes-appearance-v2';
const FONT_STORAGE_KEY = 'bes-font-scale';

function isComfortDisplay() {
  if (typeof window === 'undefined') return false;

  const screenWidth = Number(window.screen?.width || window.innerWidth || 0);
  const screenHeight = Number(window.screen?.height || window.innerHeight || 0);
  const longEdge = Math.max(screenWidth, screenHeight);
  const shortEdge = Math.min(screenWidth, screenHeight);

  return window.innerWidth >= 1100 && longEdge <= 1440 && shortEdge <= 900;
}

function readAppearanceState() {
  try {
    const value = JSON.parse(window.localStorage.getItem(APPEARANCE_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function restoreLegacyAutoScale(root, setFontScale) {
  try {
    if (window.localStorage.getItem(DASHBOARD_BASELINE_MARKER) === 'done') return;

    const appearance = readAppearanceState();
    const legacyAutoScaleWasApplied = window.localStorage.getItem(LEGACY_MIGRATION_MARKER) === 'done';
    const storedFontScale = Number(window.localStorage.getItem(FONT_STORAGE_KEY) || appearance.textScale || 100);
    const appearanceScale = Number(appearance.textScale || storedFontScale || 100);
    const shouldRestoreDashboardBaseline = legacyAutoScaleWasApplied
      && storedFontScale === 110
      && appearanceScale === 110
      && !appearance.projector;

    if (shouldRestoreDashboardBaseline) {
      const nextAppearance = {
        ...appearance,
        textScale: 100,
        projector: false,
        updatedAt: Date.now(),
      };

      window.localStorage.setItem(FONT_STORAGE_KEY, '100');
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(nextAppearance));
      root.dataset.fontScale = '100';
      root.style.fontSize = '100%';
      setFontScale?.(100);

      window.dispatchEvent(new CustomEvent('bes:appearance-changed', {
        detail: { state: nextAppearance, source: 'dashboard-scale-baseline' },
      }));
    }

    window.localStorage.setItem(DASHBOARD_BASELINE_MARKER, 'done');
  } catch {
    /* Storage is optional. Never change the user's active scale when it cannot
       be proven that the old adaptive migration caused the 110% value. */
  }
}

export default function GlobalAdaptiveComfortScale({ setFontScale }) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    const updateViewportProfile = () => {
      root.dataset.besComfortDisplay = isComfortDisplay() ? 'true' : 'false';
    };

    updateViewportProfile();
    restoreLegacyAutoScale(root, setFontScale);

    /* Important: this component no longer changes font size based on viewport.
       Dashboard is now the single visual scale reference. Users can still
       change text scale explicitly through Appearance settings. */
    window.addEventListener('resize', updateViewportProfile, { passive: true });
    window.addEventListener('orientationchange', updateViewportProfile, { passive: true });

    return () => {
      window.removeEventListener('resize', updateViewportProfile);
      window.removeEventListener('orientationchange', updateViewportProfile);
      root.removeAttribute('data-bes-comfort-display');
    };
  }, [setFontScale]);

  return null;
}
