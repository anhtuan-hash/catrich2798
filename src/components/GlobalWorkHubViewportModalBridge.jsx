import { useEffect } from 'react';

const BACKDROP_SELECTOR = '.v1093-drawer-backdrop';
const MODAL_SELECTOR = '.work-delivery-drawer';
const CLOSE_SELECTOR = '.v1093-drawer-close';
const OPEN_BUTTON_SELECTOR = '.work-task-card-actions button';
const CARD_SELECTOR = '.v1093-task-card';
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

function findWorkHubModal() {
  const backdrops = [...document.querySelectorAll(BACKDROP_SELECTOR)];
  for (const backdrop of backdrops) {
    const modal = backdrop.querySelector(MODAL_SELECTOR);
    if (modal instanceof HTMLElement) return { backdrop, modal };
  }
  return { backdrop: null, modal: null };
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

    const handleOpenClick = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest(OPEN_BUTTON_SELECTOR);
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.classList.contains('delete')) return;
      if (!button.textContent?.trim().toLowerCase().includes('mở chi tiết')) return;
      const card = button.closest(CARD_SELECTOR);
      if (!(card instanceof HTMLElement)) return;

      event.preventDefault();
      event.stopPropagation();
      card.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      }));
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
      const { backdrop, modal } = findWorkHubModal();

      if (modal instanceof HTMLElement && backdrop instanceof HTMLElement) {
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

    document.addEventListener('click', handleOpenClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    const observer = new MutationObserver(syncModal);
    observer.observe(document.body, { childList: true, subtree: true });
    syncModal();

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleOpenClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.documentElement.classList.remove(OPEN_CLASS);
      document.body.classList.remove(OPEN_CLASS);
      window.clearTimeout(focusTimer);
    };
  }, [route]);

  return null;
}
