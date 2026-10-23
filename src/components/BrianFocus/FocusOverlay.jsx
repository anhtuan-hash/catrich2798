import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import FocusBubble from './FocusBubble.jsx';
import HTCSenseClock from './HTCSenseClock.jsx';

/** Portal keeps the real Dashboard mounted and interactive state intact. */
export default function FocusOverlay({ onClose, language, weather, weatherDescription, returnFocusRef }) {
  const dialogRef = useRef(null);
  const dismissRef = useRef(null);
  const closeHandlerRef = useRef(onClose);
  closeHandlerRef.current = onClose;

  useEffect(() => {
    const root = document.getElementById('root');
    const rootWasInert = root?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    const frame = window.requestAnimationFrame(() => dismissRef.current?.focus());

    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHandlerRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(
        'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )).filter(node => node.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', keydown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      if (root) root.inert = rootWasInert;
      window.scrollTo(scrollX, scrollY);
      window.requestAnimationFrame(() => returnFocusRef?.current?.focus?.());
    };
  }, [returnFocusRef]);

  if (typeof document === 'undefined') return null;
  const vi = language !== 'en';

  return createPortal(
    <div className="bfc-overlay" role="dialog" aria-modal="true"
      aria-label={vi ? 'Chế độ tập trung Brian Focus' : 'Brian Focus mode'}
      ref={dialogRef}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="bfc-overlay__aurora" aria-hidden="true"/>
      <button className="bfc-overlay__close" type="button" ref={dismissRef}
        aria-label={vi ? 'Đóng chế độ tập trung' : 'Close Focus mode'}
        onClick={onClose}>
        <X size={20} strokeWidth={1.9} aria-hidden="true"/>
        <span>{vi ? 'Đóng' : 'Close'}</span>
        <kbd>Esc</kbd>
      </button>
      <div className="bfc-overlay__center">
        <HTCSenseClock language={language} weather={weather} weatherDescription={weatherDescription}/>
      </div>
      <FocusBubble active onClick={onClose} language={language}/>
    </div>, document.body,
  );
}
