import { useCallback, useEffect, useState } from 'react';
import {
  FOCUS_DEFAULT, loadFocusScene, subscribeFocusScene,
} from './focusSceneService.js';

export default function useFocusScene(open, userId) {
  const [scene, setScene] = useState(FOCUS_DEFAULT);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const next = await loadFocusScene();
    setScene(previous => previous.updatedAt === next.updatedAt ? previous : next);
    setStatus('synced');
    setError('');
    return next;
  }, []);

  useEffect(() => {
    if (!open || !userId) return undefined;
    let active = true;
    const update = () => loadFocusScene()
      .then(next => {
        if (!active) return;
        setScene(previous => previous.updatedAt === next.updatedAt ? previous : next);
        setStatus('synced');
        setError('');
      })
      .catch(err => {
        if (!active) return;
        setStatus('error');
        setError(err?.message || 'Could not sync Focus scene.');
      });
    update();
    const unsubscribe = subscribeFocusScene(update);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') update();
    }, 60_000);
    const visibility = () => { if (!document.hidden) update(); };
    const online = () => update();
    window.addEventListener('focus', online);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      active = false;
      unsubscribe?.();
      window.clearInterval(interval);
      window.removeEventListener('focus', online);
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [open, userId]);
  return { scene, setScene, refresh, status, error };
}
