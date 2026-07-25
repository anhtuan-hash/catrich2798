import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeEmbedView, safeExternalWebAppUrl } from '../utils/externalWebApps.js';
import './ExternalWebApps.css';
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

function currentViewport() {
  if (typeof window === 'undefined') return { width: 1440, height: 900 };
  return {
    width: Math.max(320, window.innerWidth),
    height: Math.max(480, window.innerHeight),
  };
}

export default function ExternalWebAppViewer({ app, onClose }) {
  const [key, setKey] = useState(0);
  const [check, setCheck] = useState(null);
  const [viewport, setViewport] = useState(currentViewport);
  const url = safeExternalWebAppUrl(app?.externalUrl || app?.url);
  const view = normalizeEmbedView(app?.embedView);
  const fullscreen = isFullscreenView(view);

  const cropLeft = (view.cropX / 100) * viewport.width;
  const cropTop = (view.cropY / 100) * viewport.height;
  const cropWidth = Math.max(1, (view.cropWidth / 100) * viewport.width);
  const cropHeight = Math.max(1, (view.cropHeight / 100) * viewport.height);
  const scale = Math.min(viewport.width / cropWidth, viewport.height / cropHeight);
  const exactStyle = {
    '--exact-source-width': `${viewport.width}px`,
    '--exact-source-height': `${viewport.height}px`,
    '--exact-crop-width': `${cropWidth * scale}px`,
    '--exact-crop-height': `${cropHeight * scale}px`,
    '--exact-frame-left': `${-cropLeft * scale}px`,
    '--exact-frame-top': `${-cropTop * scale}px`,
    '--exact-frame-scale': scale,
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
    const onResize = () => setViewport(currentViewport());
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

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
      className={fullscreen ? 'bes-ext-fullscreen-frame' : 'bes-ext-exact-region-frame'}
      src={url}
      title={app.title || app.name}
      allow="clipboard-read; clipboard-write; microphone; camera; fullscreen; geolocation"
      sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );

  const stateText = check?.checking
    ? 'Đang kiểm tra…'
    : check?.embeddable === false
      ? 'Website có thể chặn iframe'
      : fullscreen
        ? 'Đang chạy toàn màn hình trong Brian'
        : 'Đang hiển thị trọn vẹn đúng phạm vi bốn góc đã duyệt';

  return createPortal(
    <div className="bes-ext-layer bes-ext-fullscreen-layer">
      <section
        className={`bes-ext-viewer ${fullscreen ? 'is-fullscreen-app' : 'is-exact-region-app'}`}
        aria-label={app.title || app.name}
      >
        {fullscreen ? frame : (
          <div className="bes-ext-exact-region-stage" style={exactStyle}>
            <div className="bes-ext-exact-region-crop">
              {frame}
            </div>
          </div>
        )}

        <div className="bes-ext-fullscreen-dock">
          <span className="bes-ext-fullscreen-icon">{app.icon || 'WEB'}</span>
          <div className="bes-ext-fullscreen-copy">
            <strong>{app.title || app.name}</strong>
            <small>{stateText}</small>
          </div>
          <button type="button" aria-label="Tải lại ứng dụng" onClick={() => setKey((value) => value + 1)}>↻</button>
          <button type="button" className="bes-ext-fullscreen-close" aria-label="Đóng ứng dụng" onClick={onClose}>×</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
