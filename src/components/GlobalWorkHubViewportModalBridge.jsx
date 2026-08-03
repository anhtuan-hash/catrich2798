import { useEffect } from 'react';

const BACKDROP_SELECTOR = '.v1093-drawer-backdrop';
const MODAL_SELECTOR = '.work-delivery-drawer';
const CLOSE_SELECTOR = '.v1093-drawer-close';
const OPEN_BUTTON_SELECTOR = '.work-task-card-actions button';
const CARD_SELECTOR = '.v1093-task-card';
const OPEN_CLASS = 'work-hub-viewport-modal-open';
const ANCHORED_CLASS = 'work-hub-modal-is-anchored';
const VIEWPORT_LAYER_CLASS = 'work-hub-modal-viewport-layer';

const ANCESTOR_RESET = {
  transform: 'none',
  translate: 'none',
  scale: 'none',
  rotate: 'none',
  filter: 'none',
  'backdrop-filter': 'none',
  perspective: 'none',
  contain: 'none',
  'content-visibility': 'visible',
  'clip-path': 'none',
  mask: 'none',
  'will-change': 'auto',
  overflow: 'visible',
  'overflow-x': 'visible',
  'overflow-y': 'visible',
};

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

function captureInlineStyles(element, properties) {
  return {
    element,
    values: properties.map((property) => ({
      property,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    })),
  };
}

function restoreInlineStyles(snapshot) {
  if (!snapshot?.element?.isConnected) return;
  snapshot.values.forEach(({ property, value, priority }) => {
    if (value) snapshot.element.style.setProperty(property, value, priority);
    else snapshot.element.style.removeProperty(property);
  });
}

function numericStyle(element, property) {
  if (!(element instanceof HTMLElement)) return 0;
  const value = Number.parseFloat(window.getComputedStyle(element).getPropertyValue(property));
  return Number.isFinite(value) ? value : 0;
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
    let ancestorSnapshots = [];

    const restoreAncestors = () => {
      ancestorSnapshots.slice().reverse().forEach(restoreInlineStyles);
      ancestorSnapshots = [];
    };

    const releaseViewportLayer = () => {
      window.cancelAnimationFrame(positionFrame);
      positionFrame = 0;
      if (activeBackdrop instanceof HTMLElement) {
        activeBackdrop.classList.remove(ANCHORED_CLASS, VIEWPORT_LAYER_CLASS);
        activeBackdrop.style.removeProperty('--work-hub-backdrop-top');
        activeBackdrop.style.removeProperty('--work-hub-backdrop-left');
        activeBackdrop.style.removeProperty('--work-hub-viewport-width');
        activeBackdrop.style.removeProperty('--work-hub-viewport-height');
        activeBackdrop.style.removeProperty('--work-hub-modal-left');
        activeBackdrop.style.removeProperty('--work-hub-modal-top');
        activeBackdrop.style.removeProperty('--work-hub-modal-max-height');
      }
      if (activeModal instanceof HTMLElement) activeModal.classList.remove(ANCHORED_CLASS);
      restoreAncestors();
    };

    const neutralizeAncestorContainingBlocks = () => {
      restoreAncestors();
      if (!(activeBackdrop instanceof HTMLElement)) return;
      const properties = Object.keys(ANCESTOR_RESET);
      let ancestor = activeBackdrop.parentElement;
      while (ancestor instanceof HTMLElement
        && ancestor !== document.body
        && ancestor !== document.documentElement) {
        ancestorSnapshots.push(captureInlineStyles(ancestor, properties));
        Object.entries(ANCESTOR_RESET).forEach(([property, value]) => {
          ancestor.style.setProperty(property, value, 'important');
        });
        ancestor = ancestor.parentElement;
      }
    };

    const positionModalAtAnchor = () => {
      if (!(activeBackdrop instanceof HTMLElement) || !(activeModal instanceof HTMLElement)) return;
      window.cancelAnimationFrame(positionFrame);
      positionFrame = window.requestAnimationFrame(() => {
        if (!(activeBackdrop instanceof HTMLElement) || !(activeModal instanceof HTMLElement)) return;

        const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        const margin = viewportWidth <= 680 ? 10 : 16;

        const offsetParent = activeBackdrop.offsetParent instanceof HTMLElement
          ? activeBackdrop.offsetParent
          : activeBackdrop.parentElement;
        const parentRect = offsetParent instanceof HTMLElement
          ? offsetParent.getBoundingClientRect()
          : { top: -window.scrollY, left: -window.scrollX };
        const parentScrollTop = offsetParent instanceof HTMLElement ? offsetParent.scrollTop : 0;
        const parentScrollLeft = offsetParent instanceof HTMLElement ? offsetParent.scrollLeft : 0;
        const backdropTop = parentScrollTop - parentRect.top - numericStyle(offsetParent, 'border-top-width');
        const backdropLeft = parentScrollLeft - parentRect.left - numericStyle(offsetParent, 'border-left-width');

        activeBackdrop.style.setProperty('--work-hub-backdrop-top', `${Math.round(backdropTop)}px`);
        activeBackdrop.style.setProperty('--work-hub-backdrop-left', `${Math.round(backdropLeft)}px`);
        activeBackdrop.style.setProperty('--work-hub-viewport-width', `${Math.round(viewportWidth)}px`);
        activeBackdrop.style.setProperty('--work-hub-viewport-height', `${Math.round(viewportHeight)}px`);
        activeBackdrop.classList.add(VIEWPORT_LAYER_CLASS);

        const modalWidth = Math.min(activeModal.offsetWidth || 620, viewportWidth - (margin * 2));
        const measuredHeight = Math.max(activeModal.offsetHeight || 0, Math.min(activeModal.scrollHeight || 0, 720));
        const modalHeight = Math.min(measuredHeight || 520, viewportHeight - (margin * 2));
        const anchor = lastAnchorRect || {
          top: (viewportHeight - modalHeight) / 2,
          right: (viewportWidth + modalWidth) / 2,
          bottom: (viewportHeight + modalHeight) / 2,
          left: (viewportWidth - modalWidth) / 2,
          width: modalWidth,
          height: modalHeight,
        };

        const preferredLeft = anchor.right - modalWidth;
        const preferredTop = anchor.top - Math.min(120, modalHeight * 0.22);
        const minimumVisibleHeight = Math.min(420, viewportHeight - (margin * 2));
        const left = clamp(preferredLeft, margin, viewportWidth - modalWidth - margin);
        const top = clamp(preferredTop, margin, viewportHeight - minimumVisibleHeight - margin);
        const maxHeight = Math.max(260, Math.min(720, viewportHeight - top - margin));

        activeBackdrop.style.setProperty('--work-hub-modal-left', `${Math.round(left)}px`);
        activeBackdrop.style.setProperty('--work-hub-modal-top', `${Math.round(top)}px`);
        activeBackdrop.style.setProperty('--work-hub-modal-max-height', `${Math.round(maxHeight)}px`);
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
          neutralizeAncestorContainingBlocks();
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
        releaseViewportLayer();
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
      releaseViewportLayer();
      document.documentElement.classList.remove(OPEN_CLASS);
      document.body.classList.remove(OPEN_CLASS);
      window.clearTimeout(focusTimer);
    };
  }, [route]);

  return null;
}
