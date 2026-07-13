import React, { useEffect, useState } from 'react';
import { listSyncQueue, SYNC_QUEUE_EVENT } from '../utils/syncQueue.js';

export default function UnifiedUtilityRail({ currentUser, language = 'vi', currentRoute = 'home' }) {
  const [pending, setPending] = useState(() => listSyncQueue(currentUser).filter((item) => item.status !== 'completed').length);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const refresh = () => setPending(listSyncQueue(currentUser).filter((item) => item.status !== 'completed').length);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener(SYNC_QUEUE_EVENT, refresh);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refresh();
    return () => {
      window.removeEventListener(SYNC_QUEUE_EVENT, refresh);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [currentUser?.id, currentUser?.email]);

  const labels = language === 'vi'
    ? { ai: 'Mở Brian AI', sync: 'Mở hàng đợi đồng bộ', music: 'Mở nhạc nền', health: 'Kiểm tra vận hành' }
    : { ai: 'Open Brian AI', sync: 'Open sync queue', music: 'Open background music', health: 'Open operations health' };

  if (!currentUser) return null;
  return (
    <aside className="bes-utility-rail" aria-label={language === 'vi' ? 'Công cụ nhanh' : 'Quick utilities'} data-route={currentRoute}>
      <button type="button" className="is-ai" onClick={() => window.dispatchEvent(new CustomEvent('bes-ai-open'))} title={labels.ai} aria-label={labels.ai}>
        <span aria-hidden="true">✦</span>
      </button>
      <button type="button" className="is-sync" onClick={() => window.dispatchEvent(new CustomEvent('bes-sync-queue-open'))} title={labels.sync} aria-label={labels.sync}>
        <span aria-hidden="true">{online ? '↻' : '⌁'}</span>{pending ? <b>{Math.min(pending, 99)}</b> : null}
      </button>
      <button type="button" className="is-music" onClick={() => window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: 'expand' } }))} title={labels.music} aria-label={labels.music}>
        <span aria-hidden="true">♫</span>
      </button>
      <button type="button" className="is-health" onClick={() => { window.location.hash = '#/production-hardening'; }} title={labels.health} aria-label={labels.health}>
        <span aria-hidden="true">✓</span>
      </button>
    </aside>
  );
}
