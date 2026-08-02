import { useEffect } from 'react';

const BACKDROP_SELECTOR = '.v1093-drawer-backdrop';
const MODAL_SELECTOR = '.work-delivery-drawer';
const CLOSE_SELECTOR = '.v1093-drawer-close';
const OPEN_CLASS = 'work-hub-viewport-modal-open';

function focusableElements(modal) {
  if (!modal) return [];
  return [...modal.querySelectorAll([
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(','))].filter((element) => (
    element instanceof HTMLElement
    && element.offsetParent !== null
    && element.getAttribute('aria-hidden') !== 'true'
  ));
}

export default function GlobalWorkHubViewportModalBridge({ route }) {
  useEffect(() => {
    if (route !== 'work-hub' || typeof document === 'undefined') return undefined;

    let activeModal = null;
    let previouslyFocused = null;
    let focusTimer = 0;

    const closeModal = () => {
      const closeButton = activeModal?.querySelector(CLOSE_SELECTOR);
      if (closeButton instanceof HTMLElement) closeButton.click();
    };

    const handleKeyDown = (event) => {
      if (!activeModal) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = focusableElements(activeModal);
      if (!focusables.length) {
        event.preventDefault();
        activeModal.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const syncModal = () => {
      const backdrop = document.querySelector(BACKDROP_SELECTOR);
      const modal = backdrop?.querySelector(MODAL_SELECTOR);

      if (modal instanceof HTMLElement) {
        if (activeModal !== modal) {
          previouslyFocused = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
          activeModal = modal;
          backdrop.classList.add('work-hub-viewport-modal-backdrop');
          modal.classList.add('work-hub-viewport-modal');
          modal.setAttribute('role', 'dialog');
          modal.setAttribute('aria-modal', 'true');
          modal.setAttribute('tabindex', '-1');
          const title = modal.querySelector('h2')?.textContent?.trim();
          if (title) modal.setAttribute('aria-label', title);
          document.documentElement.classList.add(OPEN_CLASS);
          document.body.classList.add(OPEN_CLASS);
          window.clearTimeout(focusTimer);
          focusTimer = window.setTimeout(() => {
            const closeButton = modal.querySelector(CLOSE_SELECTOR);
            if (closeButton instanceof HTMLElement) closeButton.focus({ preventScroll: true });
            else modal.focus({ preventScroll: true });
          }, 0);
        }
        return;
      }

      if (activeModal) {
        activeModal = null;
        document.documentElement.classList.remove(OPEN_CLASS);
        document.body.classList.remove(OPEN_CLASS);
        window.clearTimeout(focusTimer);
        if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
        previouslyFocused = null;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    const observer = new MutationObserver(syncModal);
    observer.observe(document.body, { childList: true, subtree: true });
    syncModal();

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', handleKeyDown, true);
      document.documentElement.classList.remove(OPEN_CLASS);
      document.body.classList.remove(OPEN_CLASS);
      window.clearTimeout(focusTimer);
    };
  }, [route]);

  return null;
}
