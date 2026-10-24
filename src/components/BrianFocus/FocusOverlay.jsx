import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import HTCSenseClock from './HTCSenseClock.jsx';
import CosmicAmbient from './CosmicAmbient.jsx';

/** Portal keeps the real Dashboard mounted and interactive state intact. */
export default function FocusOverlay({ onClose, language, weather, onRefreshWeather, returnFocusRef }) {
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
      // The Focus Bubble is portalled alongside the dialog, not underneath it.
      // Include it explicitly in the modal's keyboard loop and aria-owns.
      const focusable = [
        ...Array.from(dialogRef.current.querySelectorAll(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        )),
        returnFocusRef?.current,
      ].filter(node => node && node.getClientRects().length);
      if (!focusable.length) return;
      // The trigger is before the overlay in document.body. Never rely on
      // browser DOM tab order; cycle explicitly through dialog + portal bubble.
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = currentIndex === -1
        ? (event.shiftKey ? focusable.length - 1 : 0)
        : (currentIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      event.preventDefault();
      focusable[nextIndex].focus();
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
      aria-owns="bfc-focus-trigger"
      ref={dialogRef}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <CosmicAmbient />
      <button className="bfc-overlay__close" type="button" ref={dismissRef}
        aria-label={vi ? 'Đóng chế độ tập trung' : 'Close Focus mode'}
        onClick={onClose}>
        <X size={20} strokeWidth={1.9} aria-hidden="true"/>
        <span>{vi ? 'Đóng' : 'Close'}</span>
        <kbd>Esc</kbd>
      </button>
      <div className="bfc-overlay__center">
        <HTCSenseClock language={language} weather={weather} onRefreshWeather={onRefreshWeather}/>
      </div>
    </div>, document.body,
  );
}
