(() => {
  'use strict';

  const STYLE_ID = 'bes-force-navbar-ai-visible-style';
  const FALLBACK_ID = 'bes-force-navbar-ai-fallback';
  const RETRY_LIMIT = 40;
  let ensureQueued = false;

  const installStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .brian-nav__actions > .brian-nav__ai-wrap[data-bes-ai-forced-visible="true"] {
        order: 2 !important;
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        flex: 0 0 auto !important;
      }
      .brian-nav__ai-button[data-bes-ai-forced-visible="true"] {
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      .brian-nav__actions > .bes-ai-navbar-hard-wrap {
        order: 2 !important;
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        flex: 0 0 auto !important;
      }
      .bes-ai-navbar-hard-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        color: #0b57d0 !important;
        background: #e8f0fe !important;
        box-shadow: inset 0 0 0 1px rgba(11, 87, 208, .10) !important;
        font-size: 12px !important;
        font-weight: 850 !important;
        letter-spacing: -.04em !important;
      }
      .bes-ai-navbar-hard-button:hover {
        color: #0842a0 !important;
        background: #d3e3fd !important;
      }
    `;
    document.head.appendChild(style);
  };

  const setImportant = (element, property, value) => {
    if (element.style.getPropertyValue(property) === value && element.style.getPropertyPriority(property) === 'important') return;
    element.style.setProperty(property, value, 'important');
  };

  const forceVisible = (element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.dataset.besAiForcedVisible !== 'true') element.dataset.besAiForcedVisible = 'true';
    if (element.hasAttribute('aria-hidden')) element.removeAttribute('aria-hidden');
    setImportant(element, 'display', 'inline-flex');
    setImportant(element, 'visibility', 'visible');
    setImportant(element, 'opacity', '1');
    setImportant(element, 'pointer-events', 'auto');
  };

  const clickNativeButton = () => {
    let attempt = 0;
    const tryClick = () => {
      const nativeButton = document.querySelector('.brian-nav__ai-button');
      if (nativeButton instanceof HTMLButtonElement) {
        forceVisible(nativeButton.closest('.brian-nav__ai-wrap'));
        forceVisible(nativeButton);
        nativeButton.click();
        return;
      }
      attempt += 1;
      if (attempt < RETRY_LIMIT) window.setTimeout(tryClick, 50);
    };
    tryClick();
  };

  const createFallback = (actions) => {
    let wrap = document.getElementById(FALLBACK_ID);
    if (wrap && wrap.parentElement !== actions) wrap.remove();
    if (document.getElementById(FALLBACK_ID)) return;

    wrap = document.createElement('div');
    wrap.id = FALLBACK_ID;
    wrap.className = 'bes-ai-navbar-hard-wrap';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'brian-nav__icon bes-ai-navbar-hard-button';
    button.setAttribute('aria-label', 'Mở không gian AI');
    button.setAttribute('title', 'Không gian AI');
    button.textContent = 'AI';
    button.addEventListener('click', clickNativeButton);

    wrap.appendChild(button);
    const themeButton = actions.querySelector(':scope > .brian-nav__icon');
    if (themeButton?.nextSibling) actions.insertBefore(wrap, themeButton.nextSibling);
    else actions.prepend(wrap);
  };

  const ensureAiButton = () => {
    ensureQueued = false;
    installStyle();

    const actions = document.querySelector('.brian-nav__actions');
    if (!(actions instanceof HTMLElement)) return;

    const signedIn = Boolean(actions.querySelector('.brian-nav__account'));
    if (!signedIn) {
      document.getElementById(FALLBACK_ID)?.remove();
      return;
    }

    const nativeButton = actions.querySelector('.brian-nav__ai-button');
    if (nativeButton instanceof HTMLElement) {
      forceVisible(nativeButton.closest('.brian-nav__ai-wrap'));
      forceVisible(nativeButton);
      document.getElementById(FALLBACK_ID)?.remove();
      return;
    }

    createFallback(actions);
  };

  const queueEnsure = () => {
    if (ensureQueued) return;
    ensureQueued = true;
    window.requestAnimationFrame(ensureAiButton);
  };

  const start = () => {
    ensureAiButton();
    const observer = new MutationObserver(queueEnsure);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'aria-hidden'],
    });
    window.addEventListener('hashchange', queueEnsure);
    window.setTimeout(queueEnsure, 100);
    window.setTimeout(queueEnsure, 500);
    window.setTimeout(queueEnsure, 1500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
