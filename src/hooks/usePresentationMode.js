import { useEffect, useState } from 'react';
import {
  PRESENTATION_OVERRIDE_EVENT,
  PRESENTATION_OVERRIDE_STORAGE_KEY,
  readBrowserPresentationEnvironment,
  readPresentationOverride,
  readStoredPresentationOverride,
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

  const queryOverride = readPresentationOverride(window.location.search, Boolean(import.meta.env.DEV));
  const storedOverride = readStoredPresentationOverride(window.localStorage);
  const override = queryOverride || storedOverride;
  return {
    ...resolvePresentationMode(readBrowserPresentationEnvironment(window, navigator), override),
    override,
  };
}

export default function usePresentationMode() {
  const [state, setState] = useState(readCurrent);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setState(readCurrent()));
    };
    const onStorage = (event) => {
      if (!event?.key || event.key === PRESENTATION_OVERRIDE_STORAGE_KEY) update();
    };
    const orientation = window.screen?.orientation;
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    window.addEventListener(PRESENTATION_OVERRIDE_EVENT, update);
    window.addEventListener('storage', onStorage);
    orientation?.addEventListener?.('change', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener(PRESENTATION_OVERRIDE_EVENT, update);
      window.removeEventListener('storage', onStorage);
      orientation?.removeEventListener?.('change', update);
    };
  }, []);

  return state;
}
