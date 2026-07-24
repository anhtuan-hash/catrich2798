import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { embedTransformStyle, normalizeEmbedView, safeExternalWebAppUrl } from '../utils/externalWebApps.js';
import './ExternalWebApps.css';
import './ExternalWebAppCrop.css';

export default function ExternalWebAppViewer({ app, onClose }) {
  const [key, setKey] = useState(0);
  const [check, setCheck] = useState(null);
  const url = safeExternalWebAppUrl(app?.externalUrl || app?.url);
  const view = normalizeEmbedView(app?.embedView);

  useEffect(() => {
    if (!app || !url) return undefined;
    document.documentElement.classList.add('bes-ext-open');
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('bes-ext-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [app?.id, url, onClose]);

  useEffect(() => {
    if (!url) return undefined;
    const controller = new AbortController();
    setCheck({ checking: true });
    fetch(`/api/check-embed?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(setCheck)
      .catch((error) => {
        if (error?.name !== 'AbortError') setCheck({ embeddable: null, reason: 'Không kiểm tra được chính sách iframe.' });
      });
    return () => controller.abort();
  }, [url, key]);

  if (!app || !url || typeof document === 'undefined') return null;

  return createPortal(
    <div className="bes-ext-layer">
      <section className="bes-ext-viewer">
        <header className="bes-ext-head">
          <div><span>{app.icon || 'WEB'}</span><div><strong>{app.title || app.name}</strong><small>{url}</small></div></div>
          <div className="bes-ext-actions"><button type="button" onClick={() => setKey((value) => value + 1)}>↻ Tải lại</button><button type="button" className="bes-ext-close" onClick={onClose}>×</button></div>
        </header>
        <div className={`bes-ext-viewer-status ${check?.embeddable === false ? 'blocked' : ''}`}>
          {check?.checking ? 'Đang kiểm tra khả năng chạy nội bộ…' : check?.embeddable === false ? `Website có thể chặn iframe: ${check.reason || 'chính sách bảo mật'}.` : 'Đang hiển thị vùng nội dung đã được TTCM duyệt.'}
        </div>
        <div className="bes-ext-viewer-crop" style={embedTransformStyle({ ...view, previewHeight: 900 })}>
          <iframe key={key} src={url} title={app.title || app.name} allow="clipboard-read; clipboard-write; microphone; camera; fullscreen; geolocation" sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads" referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      </section>
    </div>,
    document.body,
  );
}
