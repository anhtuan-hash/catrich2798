import React, { useEffect, useRef } from 'react';
import { ChevronRight, LogOut, X } from 'lucide-react';

export default function MobileMoreSheet({ open, groups = [], onClose, onSelect, currentUser, onLogout }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => closeRef.current?.focus(), 20);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bes-mobile-sheet-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section className="bes-mobile-sheet" role="dialog" aria-modal="true" aria-label="Điều hướng Brian English">
        <div className="bes-mobile-sheet__handle" aria-hidden="true" />
        <header className="bes-mobile-sheet__head">
          <div>
            <small>BRIAN ENGLISH</small>
            <h2>Khám phá</h2>
          </div>
          <button ref={closeRef} type="button" className="bes-mobile-icon-button" onClick={onClose} aria-label="Đóng menu">
            <X size={22} />
          </button>
        </header>

        <div className="bes-mobile-sheet__body">
          {groups.map((group) => (
            <section className="bes-mobile-sheet__group" key={group.id}>
              <h3>{group.label}</h3>
              <div className="bes-mobile-sheet__items">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.active ? 'is-active' : ''}
                    onClick={() => { onSelect?.(item); onClose?.(); }}
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {currentUser && onLogout ? (
          <footer className="bes-mobile-sheet__footer">
            <button type="button" onClick={() => { onClose?.(); onLogout(); }}>
              <LogOut size={18} aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
