import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './SharedLayout.css';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  ariaLabel,
  className,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    restoreFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = panel ? Array.from(panel.querySelectorAll(FOCUSABLE)) : [];
    (focusables[0] || panel)?.focus?.();

    function handleKeyDown(event) {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((node) => !node.hasAttribute('disabled'));
      if (!nodes.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, closeOnEscape, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="bui-drawer-backdrop"
      data-side={side}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      <aside
        ref={panelRef}
        className={['bui-drawer', className].filter(Boolean).join(' ')}
        data-side={side}
        data-size={size}
        role="dialog"
        aria-modal="true"
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        {(title || description || onClose) ? (
          <header className="bui-drawer__header">
            <div className="bui-drawer__heading">
              {title ? <h2 id={titleId} className="bui-drawer__title">{title}</h2> : null}
              {description ? <p id={descriptionId} className="bui-drawer__description">{description}</p> : null}
            </div>
            {onClose ? (
              <button type="button" className="bui-drawer__close" onClick={onClose} aria-label="Close panel">
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </header>
        ) : null}
        <div className="bui-drawer__body">{children}</div>
        {footer ? <footer className="bui-drawer__footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  );
}
