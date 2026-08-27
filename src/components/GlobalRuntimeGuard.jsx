import React, { Suspense, lazy, useEffect, useState } from 'react';
import './BulkTeacherAccountsPanelCompact.css';
import '../styles/TopChromeDividerFix.css';
import '../styles/GlobalLayout16x9Authority.css';
import { recordRuntimeError } from '../utils/runtimeDiagnostics.js';

const VietnamAtmosphereOverlay = lazy(() => import('./VietnamAtmosphereOverlay.jsx'));
const VietnamAtmosphereAdminPanel = lazy(() => import('./VietnamAtmosphereAdminPanel.jsx'));
const UsernameLoginBridge = lazy(() => import('./UsernameLoginBridge.jsx'));
const BulkTeacherAccountsPanel = lazy(() => import('./BulkTeacherAccountsPanel.jsx'));
const UsernameAccountCenter = lazy(() => import('./UsernameAccountCenter.jsx'));

const NO_ATMOSPHERE_ROUTES = new Set(['login', 'register', 'setup', 'homeroom-portal']);

function currentRoute() {
  if (typeof window === 'undefined') return 'home';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim() || 'home';
}

export default function GlobalRuntimeGuard({ language = 'vi' }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [runtimeMessage, setRuntimeMessage] = useState('');
  const [route, setRoute] = useState(currentRoute);
  const [decorationsReady, setDecorationsReady] = useState(false);

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
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  useEffect(() => {
    // The overlay must exist whenever Admin enables it so "Lưu và áp dụng"
    // is truthful. Performance profiles now control motion in CSS instead of
    // preventing the feature from mounting altogether.
    const reveal = () => setDecorationsReady(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(reveal, { timeout: 900 });
      return () => window.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(reveal, 320);
    return () => window.clearTimeout(timer);
  }, []);

  const showRuntimeBanner = !online || Boolean(runtimeMessage);
  const showAtmosphere = decorationsReady && !NO_ATMOSPHERE_ROUTES.has(route);
  const showLoginBridge = route === 'login' || route === 'register';
  const showAdminTools = route === 'admin';
  const showAtmosphereManager = route === 'admin' || route === 'settings';
  const showAccountCenter = route === 'settings';

  return (
    <>
      <Suspense fallback={null}>
        {showLoginBridge ? <UsernameLoginBridge language={language} /> : null}
        {showAtmosphere ? <VietnamAtmosphereOverlay /> : null}
        {showAtmosphereManager ? <VietnamAtmosphereAdminPanel language={language} /> : null}
        {showAdminTools ? <BulkTeacherAccountsPanel language={language} /> : null}
        {showAccountCenter ? <UsernameAccountCenter language={language} /> : null}
      </Suspense>
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
