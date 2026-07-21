import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function classes(...items) { return items.filter(Boolean).join(' '); }

let overlayDepth = 0;

function focusableElements(root) {
  if (!root) return [];
  return [...root.querySelectorAll([
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(','))].filter((node) => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
}

export function UIOverlayPortal({
  open = true,
  onDismiss,
  placement = 'center',
  modal = true,
  className = '',
  children,
  closeOnBackdrop = true,
  closeOnEscape = true,
  restoreFocus = true,
  ...props
}) {
  const layerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const dismissRef = useRef(onDismiss);

  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    previousFocusRef.current = document.activeElement;
    overlayDepth += 1;
    document.documentElement.dataset.uiOverlayOpen = String(overlayDepth);
    if (modal) document.body.classList.add('bui-overlay-lock');

    const timer = window.setTimeout(() => {
      const first = focusableElements(layerRef.current)[0];
      first?.focus?.({ preventScroll: true });
    }, 20);

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        dismissRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !modal) return;
      const items = focusableElements(layerRef.current);
      if (!items.length) {
        event.preventDefault();
        layerRef.current?.focus?.({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown, true);
      overlayDepth = Math.max(0, overlayDepth - 1);
      if (overlayDepth) document.documentElement.dataset.uiOverlayOpen = String(overlayDepth);
      else delete document.documentElement.dataset.uiOverlayOpen;
      if (!overlayDepth) document.body.classList.remove('bui-overlay-lock');
      if (restoreFocus) previousFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, modal, closeOnEscape, restoreFocus]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={layerRef}
      className={classes('bui-overlay-layer', `bui-overlay-layer--${placement}`, className)}
      data-ui="overlay-layer"
      data-placement={placement}
      role="presentation"
      tabIndex={-1}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onDismiss?.();
      }}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

export function UIOverlaySurface({
  as: Component = 'section',
  variant = 'dialog',
  className = '',
  children,
  ...props
}) {
  return (
    <Component
      className={classes('bui-overlay-surface', `bui-overlay-surface--${variant}`, className)}
      data-ui="overlay-surface"
      data-overlay-variant={variant}
      {...props}
    >
      {children}
    </Component>
  );
}

export function UIOverlayHeader({ className = '', children, ...props }) {
  return <header className={classes('bui-overlay-header', className)} {...props}>{children}</header>;
}

export function UIOverlayClose({ label = 'Close', className = '', children = '×', ...props }) {
  return <button type="button" className={classes('bui-overlay-close', className)} aria-label={label} {...props}>{children}</button>;
}

export function notifyUI(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('brian:ui-toast', {
    detail: typeof detail === 'string' ? { message: detail } : detail,
  }));
}

export function UIToastCenter() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (event) => {
      const detail = event?.detail || {};
      const id = detail.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = Number(detail.timeout || 4200);
      const toast = {
        id,
        title: String(detail.title || ''),
        message: String(detail.message || ''),
        tone: ['success', 'warning', 'danger', 'info'].includes(detail.tone) ? detail.tone : 'info',
      };
      setToasts((current) => [...current.filter((item) => item.id !== id), toast].slice(-5));
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), timeout);
    };
    window.addEventListener('brian:ui-toast', onToast);
    return () => window.removeEventListener('brian:ui-toast', onToast);
  }, []);

  if (typeof document === 'undefined' || !toasts.length) return null;
  return createPortal(
    <div className="bui-toast-region" data-ui="toast-region" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <article key={toast.id} className={`bui-toast bui-toast--${toast.tone}`} role="status" aria-live="polite">
          <span className="bui-toast-mark" aria-hidden="true">{toast.tone === 'success' ? '✓' : toast.tone === 'warning' ? '!' : toast.tone === 'danger' ? '×' : 'i'}</span>
          <div>{toast.title ? <strong>{toast.title}</strong> : null}<p>{toast.message}</p></div>
          <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Close">×</button>
        </article>
      ))}
    </div>,
    document.body,
  );
}
