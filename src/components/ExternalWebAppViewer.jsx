import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { embedTransformStyle, normalizeEmbedView, safeExternalWebAppUrl } from '../utils/externalWebApps.js';
import './ExternalWebApps.css';
import './ExternalWebAppCrop.css';
import './ExternalWebAppViewerCrop.css';

const FULLSCREEN_VIEW = normalizeEmbedView({
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  previewHeight: 900,
  canvasHeight: 1000,
  cropX: 0,
  cropY: 0,
  cropWidth: 100,
  cropHeight: 100,
});

function isFullscreenView(value = {}) {
  const clean = normalizeEmbedView(value);
  return clean.zoom === FULLSCREEN_VIEW.zoom
    && clean.offsetX === FULLSCREEN_VIEW.offsetX
    && clean.offsetY === FULLSCREEN_VIEW.offsetY
    && clean.previewHeight === FULLSCREEN_VIEW.previewHeight
    && clean.canvasHeight === FULLSCREEN_VIEW.canvasHeight
    && clean.cropX === FULLSCREEN_VIEW.cropX
    && clean.cropY === FULLSCREEN_VIEW.cropY
    && clean.cropWidth === FULLSCREEN_VIEW.cropWidth
    && clean.cropHeight === FULLSCREEN_VIEW.cropHeight;
}

export default function ExternalWebAppViewer({ app, onClose }) {
  const [key, setKey] = useState(0);
  const [check, setCheck] = useState(null);
  const url = safeExternalWebAppUrl(app?.externalUrl || app?.url);
  const view = normalizeEmbedView(app?.embedView);
  const fullscreen = isFullscreenView(view);
  const reducedScale = Math.min(view.zoom, 1);
  const viewerStyle = {
    ...embedTransformStyle(view),
    '--viewer-crop-left': `${-(view.cropX / view.cropWidth) * 100}%`,
    '--viewer-crop-top': `${-(view.cropY / view.cropHeight) * 100}%`,
    '--viewer-crop-scale-x': 100 / view.cropWidth / reducedScale,
    '--viewer-crop-scale-y': 100 / view.cropHeight / reducedScale,
  };

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

  const frame = (
    <iframe
      key={key}
      className={fullscreen ? 'bes-ext-fullscreen-frame' : undefined}
      src={url}
      title={app.title || app.name}
      allow="clipboard-read; clipboard-write; microphone; camera; fullscreen; geolocation"
      sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );

  if (fullscreen) {
    return createPortal(
      <div className="bes-ext-layer bes-ext-fullscreen-layer">
        <section className="bes-ext-viewer is-fullscreen-app" aria-label={app.title || app.name}>
          {frame}
          <div className="bes-ext-fullscreen-dock">
            <span className="bes-ext-fullscreen-icon">{app.icon || 'WEB'}</span>
            <div className="bes-ext-fullscreen-copy">
              <strong>{app.title || app.name}</strong>
              <small>{check?.checking ? 'Đang kiểm tra…' : check?.embeddable === false ? 'Website có thể chặn iframe' : 'Đang chạy toàn màn hình trong Brian'}</small>
            </div>
            <button type="button" aria-label="Tải lại ứng dụng" onClick={() => setKey((value) => value + 1)}>↻</button>
            <button type="button" className="bes-ext-fullscreen-close" aria-label="Đóng ứng dụng" onClick={onClose}>×</button>
          </div>
        </section>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="bes-ext-layer">
      <section className="bes-ext-viewer">
        <header className="bes-ext-head">
          <div><span>{app.icon || 'WEB'}</span><div><strong>{app.title || app.name}</strong><small>{url}</small></div></div>
          <div className="bes-ext-actions"><button type="button" onClick={() => setKey((value) => value + 1)}>↻ Tải lại</button><button type="button" className="bes-ext-close" onClick={onClose}>×</button></div>
        </header>
        <div className={`bes-ext-viewer-status ${check?.embeddable === false ? 'blocked' : ''}`}>
          {check?.checking ? 'Đang kiểm tra khả năng chạy nội bộ…' : check?.embeddable === false ? `Website có thể chặn iframe: ${check.reason || 'chính sách bảo mật'}.` : 'Đang hiển thị đúng vùng nội dung TTCM đã cắt và duyệt.'}
        </div>
        <div className="bes-ext-viewer-stage" style={viewerStyle}>
          <div className="bes-ext-viewer-crop">
            {frame}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
