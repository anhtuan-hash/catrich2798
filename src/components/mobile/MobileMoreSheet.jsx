import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, LogOut, X } from 'lucide-react';

export default function MobileMoreSheet({ open, items = [], onClose, onSelect, currentUser, onLogout }) {
  const closeRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => closeRef.current?.focus(), 20);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = drawerRef.current?.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const drawer = (
    <div
      className="bes-mobile-drawer-layer"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <aside
        ref={drawerRef}
        className="bes-mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Điều hướng Brian English"
      >
        <header className="bes-mobile-drawer__head">
          <button type="button" className="bes-mobile-drawer__brand" onClick={() => { onSelect?.({ id: 'home', route: 'home', action: 'route' }); onClose?.(); }} aria-label="Về trang chủ">
            <span className="bes-mobile-drawer__mark" aria-hidden="true">B</span>
            <span><strong>BRIAN</strong><small>ENGLISH</small></span>
          </button>
          <button ref={closeRef} type="button" className="bes-mobile-icon-button" onClick={onClose} aria-label="Đóng menu">
            <X size={23} />
          </button>
        </header>

        <nav className="bes-mobile-drawer__body" aria-label="Điều hướng chính">
          <div className="bes-mobile-drawer__items bes-mobile-drawer__items--primary">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.active ? 'is-active' : ''}
                aria-current={item.active ? 'page' : undefined}
                onClick={() => { onSelect?.(item); onClose?.(); }}
              >
                <span>{item.label}</span>
                <ChevronRight size={19} aria-hidden="true" />
              </button>
            ))}
          </div>
        </nav>

        {currentUser && onLogout ? (
          <footer className="bes-mobile-drawer__footer">
            <button type="button" onClick={() => { onClose?.(); onLogout(); }}>
              <LogOut size={19} aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : drawer;
}
