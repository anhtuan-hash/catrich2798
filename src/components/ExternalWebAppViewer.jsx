import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { safeExternalWebAppUrl } from '../utils/externalWebApps.js';
import './ExternalWebApps.css';

export default function ExternalWebAppViewer({ app, onClose, language = 'vi' }) {
  const vi = language !== 'en';
  const [refreshKey, setRefreshKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [embedStatus, setEmbedStatus] = useState(null);
  const url = safeExternalWebAppUrl(app?.externalUrl || app?.url);

  useEffect(() => {
    if (!app || !url) return undefined;
    document.documentElement.classList.add('bes-external-app-viewer-open');
    const escape = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', escape);
    return () => {
      document.documentElement.classList.remove('bes-external-app-viewer-open');
      window.removeEventListener('keydown', escape);
    };
  }, [app?.id, url, onClose]);

  useEffect(() => {
    if (!url) return undefined;
    const controller = new AbortController();
    setLoaded(false);
    setEmbedStatus({ checking: true });
    fetch(`/api/check-embed?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(setEmbedStatus)
      .catch((error) => { if (error.name !== 'AbortError') setEmbedStatus({ embeddable: null, reason: error.message }); });
    return () => controller.abort();
  }, [url, refreshKey]);

  if (!app || !url || typeof document === 'undefined') return null;

  const statusText = embedStatus?.checking
    ? (vi ? 'Đang kiểm tra khả năng chạy nội bộ…' : 'Checking embedded access…')
    : embedStatus?.embeddable === false
      ? (vi ? `Website này thông báo có thể chặn iframe: ${embedStatus.reason || 'chính sách bảo mật của website'}.` : `This website may block iframe embedding: ${embedStatus.reason || 'security policy'}.`)
      : (vi ? 'Website đang chạy trực tiếp trong Brian. Liên kết ngoài không được phép tự mở tab mới.' : 'Website is running inside Brian. External links cannot automatically open a new tab.');

  return createPortal(
    <div className="external-web-app-viewer-layer">
      <section className="external-web-app-viewer" role="dialog" aria-modal="true" aria-label={app.title || app.name}>
        <header className="external-web-app-viewer__header">
          <div className="external-web-app-viewer__identity"><span>{app.icon || 'WEB'}</span><div><strong>{app.title || app.name}</strong><small>{url}</small></div></div>
          <div className="external-web-app-viewer__actions"><button type="button" onClick={() => { setLoaded(false); setRefreshKey((value) => value + 1); }}>↻ {vi ? 'Tải lại' : 'Reload'}</button><button type="button" className="is-close" onClick={onClose} aria-label={vi ? 'Đóng' : 'Close'}>×</button></div>
        </header>
        <div className={`external-web-app-viewer__status ${embedStatus?.embeddable === false ? 'is-blocked' : ''}`}>{statusText}</div>
        <div className="external-web-app-viewer__frame">
          {!loaded ? <div className="external-web-app-viewer__frame-loading"><span /><strong>{vi ? 'Đang tải ứng dụng website…' : 'Loading website application…'}</strong></div> : null}
          <iframe
            key={`${app.id || app.slug}-${refreshKey}`}
            src={url}
            title={app.title || app.name}
            onLoad={() => setLoaded(true)}
            allow="clipboard-read; clipboard-write; microphone; camera; fullscreen; geolocation"
            sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </section>
    </div>, document.body,
  );
}
