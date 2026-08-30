import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './BrianUI.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Modal({
  open,
  onClose,
  title,
  description,
  ariaLabel,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}) {
  const generatedId = useId();
  const titleId = `bui-modal-title-${generatedId.replace(/:/g, '')}`;
  const descriptionId = `bui-modal-description-${generatedId.replace(/:/g, '')}`;
  const panelRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    previousActiveRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector(FOCUSABLE_SELECTOR);
    (firstFocusable || panel)?.focus?.();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveRef.current?.focus?.();
    };
  }, [open, onClose, closeOnBackdrop, closeOnEscape]);

  if (!open || typeof document === 'undefined') return null;

  const dialog = (
    <div
      className="bui-modal-backdrop"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        ref={panelRef}
        className={cx('bui-modal', className)}
        data-size={size}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={!title ? (ariaLabel || 'Dialog') : undefined}
        tabIndex={-1}
      >
        {(title || description || showCloseButton) ? (
          <header className="bui-modal__header">
            <div className="bui-modal__heading">
              {title ? <h2 id={titleId} className="bui-modal__title">{title}</h2> : null}
              {description ? <p id={descriptionId} className="bui-modal__description">{description}</p> : null}
            </div>
            {showCloseButton ? (
              <button type="button" className="bui-modal__close" aria-label="Close dialog" onClick={onClose}>×</button>
            ) : null}
          </header>
        ) : null}
        <div className="bui-modal__body">{children}</div>
        {footer ? <footer className="bui-modal__footer">{footer}</footer> : null}
      </section>
    </div>
  );

  return createPortal(dialog, document.body);
}
