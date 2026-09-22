import { useEffect, useState } from 'react';
import {
  PRESENTATION_OVERRIDE_STORAGE_KEY,
  readBrowserPresentationEnvironment,
  readPresentationOverride,
  resolvePresentationMode,
} from '../device/presentationMode.js';

function readCurrent() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceClass: 'desktop',
      orientation: 'landscape',
      presentationMode: 'desktop',
      reason: 'ssr-fallback',
      override: null,
    };
  }

  const override = readPresentationOverride(window.location.search, Boolean(import.meta.env.DEV));
  return {
    ...resolvePresentationMode(readBrowserPresentationEnvironment(window, navigator), override),
    override,
  };
}

export default function usePresentationMode() {
  const [state, setState] = useState(readCurrent);

  useEffect(() => {
    // The retired desktop Star → mobile toggle used a persistent override.
    // Clear that legacy flag once so nobody is left stuck in the old preview mode.
    try { window.localStorage?.removeItem(PRESENTATION_OVERRIDE_STORAGE_KEY); } catch { /* optional storage */ }

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setState(readCurrent()));
    };
    const orientation = window.screen?.orientation;
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    orientation?.addEventListener?.('change', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      orientation?.removeEventListener?.('change', update);
    };
  }, []);

  return state;
}
