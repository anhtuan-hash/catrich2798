import React, { useEffect } from 'react';
import './B2Overlay.css';
import { B2Button, B2IconButton } from './B2UI.jsx';

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

export function B2Drawer({ open, onClose, eyebrow, title, children, footer = null, width = 'md' }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="b2-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <aside className={`b2-drawer b2-drawer--${width}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div>{eyebrow ? <span>{eyebrow}</span> : null}<h2>{title}</h2></div>
          <B2IconButton label="Đóng" onClick={onClose}>×</B2IconButton>
        </header>
        <div className="b2-drawer__body">{children}</div>
        {footer ? <footer className="b2-drawer__footer">{footer}</footer> : null}
      </aside>
    </div>
  );
}

export function B2Dialog({ open, onClose, title, description, children, confirmLabel = 'Xác nhận', onConfirm }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="b2-overlay b2-overlay--center" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="b2-dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>
        {children ? <div className="b2-dialog__body">{children}</div> : null}
        <footer><B2Button onClick={onClose}>Hủy</B2Button><B2Button variant="primary" onClick={onConfirm}>{confirmLabel}</B2Button></footer>
      </section>
    </div>
  );
}

export function B2Toast({ visible, tone = 'success', title, message, onClose }) {
  if (!visible) return null;
  return (
    <div className={`b2-toast b2-toast--${tone}`} role="status">
      <span className="b2-toast__mark" aria-hidden="true">{tone === 'success' ? '✓' : tone === 'danger' ? '!' : 'i'}</span>
      <span><strong>{title}</strong>{message ? <small>{message}</small> : null}</span>
      <button type="button" onClick={onClose} aria-label="Đóng">×</button>
    </div>
  );
}
