import { useLayoutEffect } from 'react';

const MIGRATION_MARKER = 'bes-adaptive-comfort-1440-v1';
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

export default function GlobalAdaptiveComfortScale({ setFontScale }) {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const root = document.documentElement;

    const updateViewportProfile = () => {
      root.dataset.besComfortDisplay = isComfortDisplay() ? 'true' : 'false';
    };

    updateViewportProfile();

    if (isComfortDisplay()) {
      let shouldUpgrade = false;
      let nextAppearance = null;

      try {
        const migrationDone = window.localStorage.getItem(MIGRATION_MARKER) === 'done';
        const storedFontScale = Number(window.localStorage.getItem(FONT_STORAGE_KEY) || 100);
        const appearance = readAppearanceState();
        const appearanceScale = Number(appearance.textScale || 100);

        shouldUpgrade = !migrationDone
          && storedFontScale === 100
          && appearanceScale === 100
          && !appearance.projector;

        if (shouldUpgrade) {
          nextAppearance = {
            ...appearance,
            textScale: 110,
            projector: false,
            updatedAt: Date.now(),
          };

          window.localStorage.setItem(FONT_STORAGE_KEY, '110');
          window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(nextAppearance));
        }

        window.localStorage.setItem(MIGRATION_MARKER, 'done');
      } catch {
        shouldUpgrade = true;
      }

      if (shouldUpgrade) {
        root.dataset.fontScale = '110';
        root.style.fontSize = '110%';
        setFontScale?.(110);

        const detailState = nextAppearance || {
          ...readAppearanceState(),
          textScale: 110,
          projector: false,
          updatedAt: Date.now(),
        };

        window.dispatchEvent(new CustomEvent('bes:appearance-changed', {
          detail: { state: detailState, source: 'adaptive-comfort-display' },
        }));
      }
    }

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
