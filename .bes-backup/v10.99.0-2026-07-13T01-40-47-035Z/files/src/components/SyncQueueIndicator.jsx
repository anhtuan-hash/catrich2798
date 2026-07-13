import React, { useEffect, useState } from 'react';
import { clearCompletedSyncItems, listSyncQueue, processSyncQueue, removeSyncItem, SYNC_QUEUE_EVENT } from '../utils/syncQueue.js';
import { listTransfers } from '../utils/contentTransfer.js';

export default function SyncQueueIndicator({ currentUser, language = 'vi' }) {
  const [items, setItems] = useState(() => listSyncQueue(currentUser));
  const [online, setOnline] = useState(() => navigator.onLine);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(listSyncQueue(currentUser));
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const refresh = () => setItems(listSyncQueue(currentUser));
    const onOnline = async () => {
      setOnline(true);
      const next = await processSyncQueue(currentUser, {
        'content-transfer': async (item) => {
          const exists = listTransfers(currentUser).some((transfer) => transfer.id === item?.payload?.transferId);
          if (!exists) throw new Error('Transferred content is no longer available');
        },
      });
      setItems(next);
      window.setTimeout(() => setItems(clearCompletedSyncItems(currentUser)), 2400);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener(SYNC_QUEUE_EVENT, refresh);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (navigator.onLine) onOnline();
    return () => {
      window.removeEventListener(SYNC_QUEUE_EVENT, refresh);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [currentUser?.id, currentUser?.email]);

  const pending = items.filter((item) => item.status !== 'completed');
  if (!currentUser || (online && pending.length === 0 && !open)) return null;

  return (
    <div className={`bes-sync-queue${online ? ' is-online' : ' is-offline'}`}>
      <button type="button" className="bes-sync-queue-toggle" onClick={() => setOpen((value) => !value)}>
        <span>{online ? (pending.length ? '↻' : '✓') : '⌁'}</span>
        <b>{online ? (pending.length ? `${pending.length} ${language === 'vi' ? 'đang đồng bộ' : 'syncing'}` : (language === 'vi' ? 'Đã đồng bộ' : 'Synced')) : `${pending.length} ${language === 'vi' ? 'đang chờ mạng' : 'waiting for network'}`}</b>
      </button>
      {open ? (
        <section className="bes-sync-queue-panel">
          <header><strong>{language === 'vi' ? 'Hàng đợi đồng bộ' : 'Sync queue'}</strong><button type="button" onClick={() => setOpen(false)}>×</button></header>
          {items.length ? items.map((item) => (
            <div key={item.id} className={`bes-sync-item is-${item.status}`}>
              <span>{item.status === 'completed' ? '✓' : item.status === 'failed' ? '!' : '↻'}</span>
              <div><strong>{item.label}</strong><small>{new Date(item.createdAt).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')}</small></div>
              <button type="button" onClick={() => setItems(removeSyncItem(currentUser, item.id))}>×</button>
            </div>
          )) : <p>{language === 'vi' ? 'Không có thay đổi chờ đồng bộ.' : 'No pending changes.'}</p>}
        </section>
      ) : null}
    </div>
  );
}
