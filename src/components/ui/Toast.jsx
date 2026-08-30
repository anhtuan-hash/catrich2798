import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './BrianUI.css';

const ToastContext = createContext(null);

function createToastId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ToastItem({ toast, onDismiss }) {
  React.useEffect(() => {
    if (toast.duration === Infinity) return undefined;
    const duration = Number.isFinite(toast.duration) ? toast.duration : 4200;
    const timer = window.setTimeout(() => onDismiss(toast.id), Math.max(duration, 1200));
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const role = toast.variant === 'danger' ? 'alert' : 'status';

  return (
    <article className="bui-toast" data-variant={toast.variant || 'neutral'} role={role}>
      <div className="bui-toast__content">
        {toast.title ? <strong className="bui-toast__title">{toast.title}</strong> : null}
        {toast.message ? <div className="bui-toast__message">{toast.message}</div> : null}
      </div>
      {toast.action ? (
        <button type="button" className="bui-toast__action" onClick={() => toast.action.onClick?.(toast)}>
          {toast.action.label}
        </button>
      ) : null}
      <button type="button" className="bui-toast__close" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>×</button>
    </article>
  );
}

export function ToastProvider({ children, maxToasts = 4, placement = 'bottom-right' }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  const push = useCallback((input) => {
    const toast = {
      id: input?.id || createToastId(),
      variant: 'neutral',
      duration: 4200,
      ...input,
    };
    setToasts((current) => [...current.filter((item) => item.id !== toast.id), toast].slice(-Math.max(maxToasts, 1)));
    return toast.id;
  }, [maxToasts]);

  const value = useMemo(() => ({ push, dismiss, clear }), [push, dismiss, clear]);

  const viewport = typeof document !== 'undefined'
    ? createPortal(
        <div className="bui-toast-viewport" data-placement={placement} aria-live="polite" aria-relevant="additions removals">
          {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />)}
        </div>,
        document.body,
      )
    : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {viewport}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
