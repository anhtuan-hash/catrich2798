import { useEffect, useState } from 'react';
import {
  readBrowserPresentationEnvironment,
  readPresentationOverride,
  resolvePresentationMode,
} from '../device/presentationMode.js';

function readCurrent() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { deviceClass: 'desktop', orientation: 'landscape', presentationMode: 'desktop', reason: 'ssr-fallback' };
  }
  const override = readPresentationOverride(window.location.search, Boolean(import.meta.env.DEV));
  return resolvePresentationMode(readBrowserPresentationEnvironment(window, navigator), override);
}

export default function usePresentationMode() {
  const [state, setState] = useState(readCurrent);

  useEffect(() => {
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
