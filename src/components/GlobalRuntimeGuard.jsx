import React, { useEffect, useState } from 'react';
import VietnamAtmosphereOverlay from './VietnamAtmosphereOverlay.jsx';
import UsernameLoginBridge from './UsernameLoginBridge.jsx';
import './BulkTeacherAccountsPanelCompact.css';
import '../styles/TopChromeDividerFix.css';
import UsernameAccountCenter from './UsernameAccountCenter.jsx';
import { recordRuntimeError } from '../utils/runtimeDiagnostics.js';
import './AdminRoutePerformance.css';

const VietnamAtmosphereAdminPanel = React.lazy(() => import('./VietnamAtmosphereAdminPanel.jsx'));
const BulkTeacherAccountsPanel = React.lazy(() => import('./BulkTeacherAccountsPanel.jsx'));

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim();
}

export default function GlobalRuntimeGuard({ language = 'vi' }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [runtimeMessage, setRuntimeMessage] = useState('');
  const [route, setRoute] = useState(currentRoute);
  const [adminToolsReady, setAdminToolsReady] = useState(false);

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

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (route !== 'admin') {
      setAdminToolsReady(false);
      return undefined;
    }

    let cancelled = false;
    let timer = 0;
    let idleHandle = 0;
    const revealAdminTools = () => {
      if (!cancelled) setAdminToolsReady(true);
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(revealAdminTools, { timeout: 700 });
    } else {
      timer = window.setTimeout(revealAdminTools, 180);
    }

    return () => {
      cancelled = true;
      if (idleHandle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle);
      if (timer) window.clearTimeout(timer);
    };
  }, [route]);

  const showRuntimeBanner = !online || Boolean(runtimeMessage);

  return (
    <>
      <UsernameLoginBridge language={language} />
      <VietnamAtmosphereOverlay />
      {adminToolsReady ? (
        <React.Suspense fallback={null}>
          <VietnamAtmosphereAdminPanel language={language} />
          <BulkTeacherAccountsPanel language={language} />
        </React.Suspense>
      ) : null}
      <UsernameAccountCenter language={language} />
      {showRuntimeBanner ? (
        <aside className={`bes-runtime-banner ${online ? 'is-error' : 'is-offline'}`} role="status">
          <span aria-hidden="true">{online ? '!' : '⌁'}</span>
          <div>
            <strong>{online ? (language === 'vi' ? 'Hệ thống vừa chặn một lỗi' : 'A runtime error was contained') : (language === 'vi' ? 'Bạn đang ngoại tuyến' : 'You are offline')}</strong>
            <small>{online ? runtimeMessage : (language === 'vi' ? 'Bản nháp vẫn được lưu trên thiết bị và sẽ tiếp tục khi có mạng.' : 'Drafts remain saved on this device and work can continue.')}</small>
          </div>
          {online ? <button type="button" onClick={() => setRuntimeMessage('')}>{language === 'vi' ? 'Đóng' : 'Dismiss'}</button> : null}
          <button type="button" onClick={() => { window.location.hash = '#/qa'; }}>{language === 'vi' ? 'Kiểm tra' : 'Health'}</button>
        </aside>
      ) : null}
    </>
  );
}
