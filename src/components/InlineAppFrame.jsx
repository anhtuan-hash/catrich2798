import React, { useMemo, useRef, useState } from 'react';
import './InlineAppFrame.css';

function embeddedUrlFor(target) {
  if (!target || typeof window === 'undefined') return target || '';
  const url = new URL(window.location.href);
  url.searchParams.set('embed', '1');
  url.hash = String(target).replace(/^#/, '');
  return url.toString();
}

export default function InlineAppFrame({
  target,
  title,
  subtitle = '',
  language = 'vi',
  accent = '#8fb315',
  onClose,
  className = '',
}) {
  const vi = language === 'vi';
  const shellRef = useRef(null);
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const src = useMemo(() => embeddedUrlFor(target), [target]);

  const reload = () => {
    setLoading(true);
    setFrameKey((current) => current + 1);
  };

  const toggleFullscreen = async () => {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      // Fullscreen is optional; the app remains usable inside the card.
    }
  };

  return (
    <section
      ref={shellRef}
      className={`inline-app-frame ${className}`.trim()}
      style={{ '--inline-app-accent': accent }}
      aria-label={`${vi ? 'Ứng dụng đang chạy' : 'Running app'}: ${title}`}
    >
      <header className="inline-app-frame__toolbar">
        <button type="button" className="inline-app-frame__back" onClick={onClose}>
          <span aria-hidden="true">←</span>
          <span>{vi ? 'Quay lại danh sách' : 'Back to cards'}</span>
        </button>
        <div className="inline-app-frame__identity">
          <i aria-hidden="true" />
          <span><strong>{title}</strong>{subtitle ? <small>{subtitle}</small> : null}</span>
        </div>
        <div className="inline-app-frame__actions">
          <button type="button" onClick={reload} title={vi ? 'Tải lại ứng dụng' : 'Reload app'} aria-label={vi ? 'Tải lại ứng dụng' : 'Reload app'}>↻</button>
          <button type="button" onClick={toggleFullscreen} title={vi ? 'Toàn màn hình' : 'Full screen'} aria-label={vi ? 'Toàn màn hình' : 'Full screen'}>⛶</button>
        </div>
      </header>

      <div className="inline-app-frame__viewport">
        {loading ? <div className="inline-app-frame__loading" role="status">{vi ? 'Đang mở ứng dụng ngay trong thẻ…' : 'Opening the app inside this card…'}</div> : null}
        <iframe
          key={`${target}:${frameKey}`}
          title={title}
          src={src}
          allow="microphone; camera; clipboard-read; clipboard-write; fullscreen; autoplay; geolocation; display-capture"
          allowFullScreen
          onLoad={() => setLoading(false)}
        />
      </div>
    </section>
  );
}
