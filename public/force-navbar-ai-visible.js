(() => {
  'use strict';

  const STYLE_ID = 'bes-force-navbar-ai-visible-style';
  const FALLBACK_ID = 'bes-force-navbar-ai-fallback';
  const RETRY_LIMIT = 40;
  let ensureQueued = false;

  const iconMarkup = `
    <span class="bes-ai-orbit-icon" aria-hidden="true">
      <img src="/ai-navbar-orbit-icon.svg" alt="" />
      <i class="bes-ai-orbit-icon__ring"></i>
    </span>
  `;

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
        align-items: center !important;
        justify-content: center !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        background: linear-gradient(145deg, #ffffff, #f3f6ff) !important;
        border: 1px solid rgba(66, 133, 244, .14) !important;
        box-shadow: 0 3px 10px rgba(60, 64, 67, .08), inset 0 1px 0 rgba(255,255,255,.9) !important;
        overflow: visible !important;
      }
      .brian-nav__ai-button[data-bes-ai-forced-visible="true"]:hover,
      .brian-nav__ai-button[data-bes-ai-forced-visible="true"].is-open {
        background: linear-gradient(145deg, #f8fbff, #edf2ff) !important;
        border-color: rgba(124, 77, 255, .24) !important;
        box-shadow: 0 6px 18px rgba(82, 92, 180, .17), inset 0 1px 0 #fff !important;
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
        background: linear-gradient(145deg, #ffffff, #f3f6ff) !important;
        border: 1px solid rgba(66, 133, 244, .14) !important;
        box-shadow: 0 3px 10px rgba(60, 64, 67, .08), inset 0 1px 0 rgba(255,255,255,.9) !important;
        overflow: visible !important;
      }
      .bes-ai-navbar-hard-button:hover {
        background: linear-gradient(145deg, #f8fbff, #edf2ff) !important;
        border-color: rgba(124, 77, 255, .24) !important;
        box-shadow: 0 6px 18px rgba(82, 92, 180, .17), inset 0 1px 0 #fff !important;
      }
      .bes-ai-orbit-icon {
        position: relative;
        width: 31px;
        height: 31px;
        display: grid;
        place-items: center;
        flex: 0 0 31px;
      }
      .bes-ai-orbit-icon img {
        position: relative;
        z-index: 2;
        width: 29px;
        height: 29px;
        display: block;
        filter: drop-shadow(0 3px 5px rgba(66, 80, 170, .22));
        transition: transform .22s cubic-bezier(.2,.8,.2,1), filter .22s ease;
      }
      .bes-ai-orbit-icon__ring {
        position: absolute;
        z-index: 1;
        inset: -2px;
        border: 1.5px solid rgba(124, 77, 255, .22);
        border-left-color: rgba(66, 133, 244, .72);
        border-bottom-color: rgba(236, 72, 153, .58);
        border-radius: 50%;
        opacity: .82;
        transition: transform .35s ease, opacity .2s ease;
      }
      .brian-nav__ai-button:hover .bes-ai-orbit-icon img,
      .brian-nav__ai-button.is-open .bes-ai-orbit-icon img,
      .bes-ai-navbar-hard-button:hover .bes-ai-orbit-icon img {
        transform: scale(1.08) rotate(-4deg);
        filter: drop-shadow(0 5px 8px rgba(82, 80, 190, .3));
      }
      .brian-nav__ai-button:hover .bes-ai-orbit-icon__ring,
      .brian-nav__ai-button.is-open .bes-ai-orbit-icon__ring,
      .bes-ai-navbar-hard-button:hover .bes-ai-orbit-icon__ring {
        transform: rotate(52deg) scale(1.06);
        opacity: 1;
      }
      @media (prefers-reduced-motion: reduce) {
        .bes-ai-orbit-icon img,
        .bes-ai-orbit-icon__ring { transition: none !important; }
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

  const applyGraphic = (button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.dataset.besAiGraphic === 'orbit-v1') return;
    button.innerHTML = iconMarkup;
    button.dataset.besAiGraphic = 'orbit-v1';
  };

  const clickNativeButton = () => {
    let attempt = 0;
    const tryClick = () => {
      const nativeButton = document.querySelector('.brian-nav__ai-button');
      if (nativeButton instanceof HTMLButtonElement) {
        forceVisible(nativeButton.closest('.brian-nav__ai-wrap'));
        forceVisible(nativeButton);
        applyGraphic(nativeButton);
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
    button.innerHTML = iconMarkup;
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
    if (nativeButton instanceof HTMLButtonElement) {
      forceVisible(nativeButton.closest('.brian-nav__ai-wrap'));
      forceVisible(nativeButton);
      applyGraphic(nativeButton);
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
