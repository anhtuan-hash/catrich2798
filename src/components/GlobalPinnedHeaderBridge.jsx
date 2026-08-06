import { useLayoutEffect } from 'react';
import { installGlobalHubNavigationRuntime } from '../globalHubNavigationRuntime.js';

export default function GlobalPinnedHeaderBridge({ route = '' }) {
  useLayoutEffect(() => {
    installGlobalHubNavigationRuntime();
  }, [route]);

  return null;
}
