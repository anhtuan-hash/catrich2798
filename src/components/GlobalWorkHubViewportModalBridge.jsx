import { useEffect } from 'react';

const BACKDROP_SELECTOR = '.v1093-drawer-backdrop';
const MODAL_SELECTOR = '.work-delivery-drawer';
const CLOSE_SELECTOR = '.v1093-drawer-close';
const OPEN_BUTTON_SELECTOR = '.work-task-card-actions button';
const CARD_SELECTOR = '.v1093-task-card';
const OPEN_CLASS = 'work-hub-viewport-modal-open';
const ANCHORED_CLASS = 'work-hub-modal-is-anchored';

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

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function rectSnapshot(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export default function GlobalWorkHubViewportModalBridge({ route }) {
  useEffect(() => {
    if (route !== 'work-hub' || typeof document === 'undefined') return undefined;

    let activeBackdrop = null;
    let activeModal = null;
    let previouslyFocused = null;
    let focusTimer = 0;
    let positionFrame = 0;
    let lastAnchorRect = null;

    const clearPosition = () => {
      window.cancelAnimationFrame(positionFrame);
      positionFrame = 0;
      if (activeBackdrop instanceof HTMLElement) {
        activeBackdrop.classList.remove(ANCHORED_CLASS);
        activeBackdrop.style.removeProperty('--work-hub-modal-left');
        activeBackdrop.style.removeProperty('--work-hub-modal-top');
      }
      if (activeModal instanceof HTMLElement) activeModal.classList.remove(ANCHORED_CLASS);
    };

    const positionModalAtAnchor = () => {
      if (!(activeBackdrop instanceof HTMLElement) || !(activeModal instanceof HTMLElement)) return;
      window.cancelAnimationFrame(positionFrame);
      positionFrame = window.requestAnimationFrame(() => {
        if (!(activeBackdrop instanceof HTMLElement) || !(activeModal instanceof HTMLElement)) return;

        const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        const margin = viewportWidth <= 680 ? 10 : 16;
        const modalRect = activeModal.getBoundingClientRect();
        const modalWidth = Math.min(modalRect.width || activeModal.offsetWidth || 620, viewportWidth - (margin * 2));
        const modalHeight = Math.min(modalRect.height || activeModal.offsetHeight || 560, viewportHeight - (margin * 2));
        const anchor = lastAnchorRect || {
          top: viewportHeight / 2,
          right: viewportWidth / 2,
          bottom: viewportHeight / 2,
          left: viewportWidth / 2,
          width: 0,
          height: 0,
        };
        const anchorCenterY = anchor.top + (anchor.height / 2);
        const preferredLeft = anchor.right - modalWidth;
        const preferredTop = anchorCenterY - (modalHeight / 2);
        const left = clamp(preferredLeft, margin, viewportWidth - modalWidth - margin);
        const top = clamp(preferredTop, margin, viewportHeight - modalHeight - margin);

        activeBackdrop.style.setProperty('--work-hub-modal-left', `${Math.round(left)}px`);
        activeBackdrop.style.setProperty('--work-hub-modal-top', `${Math.round(top)}px`);
        activeBackdrop.classList.add(ANCHORED_CLASS);
        activeModal.classList.add(ANCHORED_CLASS);
      });
    };

    const closeModal = () => {
      const closeButton = activeModal?.querySelector(CLOSE_SELECTOR);
      if (closeButton instanceof HTMLElement) closeButton.click();
    };

    const rememberAnchor = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return null;
      const deleteButton = target.closest(`${OPEN_BUTTON_SELECTOR}.delete`);
      if (deleteButton) return null;

      const openButton = target.closest(OPEN_BUTTON_SELECTOR);
      if (openButton instanceof HTMLButtonElement
        && openButton.textContent?.trim().toLowerCase().includes('mở chi tiết')) {
        lastAnchorRect = rectSnapshot(openButton);
        return { button: openButton, card: openButton.closest(CARD_SELECTOR) };
      }

      const card = target.closest(CARD_SELECTOR);
      if (!(card instanceof HTMLElement)) return null;
      const cardOpenButton = [...card.querySelectorAll(OPEN_BUTTON_SELECTOR)].find((button) => (
        button instanceof HTMLButtonElement
        && !button.classList.contains('delete')
        && button.textContent?.trim().toLowerCase().includes('mở chi tiết')
      ));
      lastAnchorRect = rectSnapshot(cardOpenButton instanceof HTMLElement ? cardOpenButton : card);
      return { button: null, card };
    };

    const handleOpenClick = (event) => {
      const anchor = rememberAnchor(event);
      if (!anchor?.button || !(anchor.card instanceof HTMLElement)) return;

      event.preventDefault();
      event.stopPropagation();
      anchor.card.dispatchEvent(new MouseEvent('click', {
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
          activeBackdrop = backdrop;
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
          positionModalAtAnchor();
          window.clearTimeout(focusTimer);
          focusTimer = window.setTimeout(() => {
            positionModalAtAnchor();
            const closeButton = modal.querySelector(CLOSE_SELECTOR);
            if (closeButton instanceof HTMLElement) closeButton.focus({ preventScroll: true });
            else modal.focus({ preventScroll: true });
          }, 0);
        } else {
          positionModalAtAnchor();
        }
        return;
      }

      if (activeModal) {
        clearPosition();
        activeBackdrop = null;
        activeModal = null;
        lastAnchorRect = null;
        document.documentElement.classList.remove(OPEN_CLASS);
        document.body.classList.remove(OPEN_CLASS);
        window.clearTimeout(focusTimer);
        if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
        previouslyFocused = null;
      }
    };

    document.addEventListener('click', handleOpenClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', positionModalAtAnchor, { passive: true });
    const observer = new MutationObserver(syncModal);
    observer.observe(document.body, { childList: true, subtree: true });
    syncModal();

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleOpenClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', positionModalAtAnchor);
      clearPosition();
      document.documentElement.classList.remove(OPEN_CLASS);
      document.body.classList.remove(OPEN_CLASS);
      window.clearTimeout(focusTimer);
    };
  }, [route]);

  return null;
}
