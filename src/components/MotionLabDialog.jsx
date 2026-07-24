import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './MotionLabDialog.css';

export default function MotionLabDialog({ open, onClose, language = 'vi' }) {
  const vi = language === 'vi';

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="motion-lab-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section className="motion-lab-panel" role="dialog" aria-modal="true" aria-label="Motion Lab">
        <header>
          <div className="motion-lab-brand" aria-hidden="true"><i /><i /><i /><i /></div>
          <div>
            <small>ENGLISH HUB MOTION CORE</small>
            <h2>{vi ? 'Motion Lab · 100 hiệu ứng' : 'Motion Lab · 100 effects'}</h2>
            <p>{vi ? 'Thử nghiệm riêng biệt; chỉ các hiệu ứng production-safe mới được áp dụng tự động lên website.' : 'A separate laboratory; only production-safe effects are applied automatically to the website.'}</p>
          </div>
          <a href="/motion-lab.html" target="_blank" rel="noreferrer">{vi ? 'Mở cửa sổ riêng' : 'Open separately'} ↗</a>
          <button type="button" onClick={onClose} aria-label={vi ? 'Đóng Motion Lab' : 'Close Motion Lab'}>×</button>
        </header>
        <iframe
          title="English Hub Motion Lab"
          src="/motion-lab.html?embedded=1"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
        />
      </section>
    </div>,
    document.body,
  );
}
