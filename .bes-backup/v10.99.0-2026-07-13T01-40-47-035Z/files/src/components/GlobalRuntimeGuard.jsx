import React, { useEffect, useState } from 'react';
import { recordRuntimeError } from '../utils/runtimeDiagnostics.js';

export default function GlobalRuntimeGuard({ language = 'vi' }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [runtimeMessage, setRuntimeMessage] = useState('');

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onError = (event) => {
      const record = recordRuntimeError({ scope: 'window-error', message: event.message, error: event.error, stack: event.error?.stack });
      setRuntimeMessage(record.message);
    };
    const onRejection = (event) => {
      const reason = event.reason;
      const record = recordRuntimeError({ scope: 'unhandled-rejection', message: reason?.message || String(reason || 'Unhandled promise rejection'), error: reason });
      setRuntimeMessage(record.message);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (online && !runtimeMessage) return null;
  return (
    <aside className={`bes-runtime-banner ${online ? 'is-error' : 'is-offline'}`} role="status">
      <span aria-hidden="true">{online ? '!' : '⌁'}</span>
      <div>
        <strong>{online ? (language === 'vi' ? 'Hệ thống vừa chặn một lỗi' : 'A runtime error was contained') : (language === 'vi' ? 'Bạn đang ngoại tuyến' : 'You are offline')}</strong>
        <small>{online ? runtimeMessage : (language === 'vi' ? 'Bản nháp vẫn được lưu trên thiết bị và sẽ tiếp tục khi có mạng.' : 'Drafts remain saved on this device and work can continue.')}</small>
      </div>
      {online ? <button type="button" onClick={() => setRuntimeMessage('')}>{language === 'vi' ? 'Đóng' : 'Dismiss'}</button> : null}
      <button type="button" onClick={() => { window.location.hash = '#/qa'; }}>{language === 'vi' ? 'Kiểm tra' : 'Health'}</button>
    </aside>
  );
}
