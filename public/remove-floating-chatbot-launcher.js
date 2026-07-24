(() => {
  'use strict';

  if (window.__BES_CHATBOT_PURGE_V2__) return;
  window.__BES_CHATBOT_PURGE_V2__ = true;

  const ROOT_SELECTORS = [
    '.shared-chatbot-drawer',
    '.bes-chatbot-root',
    '.bes-chatbot-fab',
    '.bes-chatbot-launcher',
    '.chatbot-root',
    '.chatbot-fab',
    '.chatbot-launcher',
    '.chatbot-toggle',
    '.floating-chatbot',
    '.floating-chatbot-button',
    '.ai-chatbot-fab',
    '.ai-chatbot-launcher',
    '.independent-chatbot',
    '.independent-chatbot-launcher',
    '.global-ai-website-launcher',
    '.brian-nav__ai-wrap',
    '.brian-nav__ai-button',
    '.brian-ai-workspace',
    '.brian-ai-workspace-layer',
    '[data-chatbot-root]',
    '[data-chatbot-launcher]',
    '[data-ai-chatbot-launcher]',
  ];

  const ROOT_QUERY = ROOT_SELECTORS.join(',');
  const CHATBOT_TEXT = /chat\s*bot(?:\s*ai)?|chatbotai|brian\s*ai|kh[oô]ng\s*gian\s*ai|tr[oợ]\s*l[yý]\s*ai|ai\s*(?:assistant|workspace|copilot)/i;
  const SAFE_NAV_AREAS = [
    '.brian-nav__dictionary-wrap',
    '.brian-nav__music-wrap',
    '.brian-nav__notification-wrap',
    '.brian-nav__profile-wrap',
  ].join(',');

  const markerFor = (element) => [
    element.id,
    typeof element.className === 'string' ? element.className : '',
    element.getAttribute?.('aria-label'),
    element.getAttribute?.('title'),
    element.getAttribute?.('data-testid'),
    element.textContent,
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  const removeNode = (node) => {
    if (!(node instanceof Element)) return;
    const removableRoot = node.closest?.(ROOT_QUERY) || node;
    removableRoot.remove();
  };

  const isSemanticLauncher = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (!element.matches('button,a,[role="button"],[tabindex]')) return false;
    if (element.closest(SAFE_NAV_AREAS)) return false;

    const marker = markerFor(element);
    if (!CHATBOT_TEXT.test(marker)) return false;

    const inTopChrome = Boolean(element.closest('.bes-top-chrome,.brian-nav,.brian-nav__actions'));
    const style = window.getComputedStyle(element);
    const isFloating = ['fixed', 'sticky', 'absolute'].includes(style.position);
    const rect = element.getBoundingClientRect();
    const nearGlobalChrome = rect.top < 190 || rect.right > window.innerWidth * 0.62;

    return inTopChrome || (isFloating && nearGlobalChrome);
  };

  const purge = (root = document) => {
    const directNodes = [];
    if (root instanceof Element && root.matches(ROOT_QUERY)) directNodes.push(root);
    root.querySelectorAll?.(ROOT_QUERY).forEach((node) => directNodes.push(node));
    directNodes.forEach(removeNode);

    const controls = [];
    if (root instanceof HTMLElement && root.matches('button,a,[role="button"],[tabindex]')) controls.push(root);
    root.querySelectorAll?.('button,a,[role="button"],[tabindex]').forEach((node) => controls.push(node));
    controls.forEach((control) => {
      if (isSemanticLauncher(control)) removeNode(control);
    });

    document.documentElement.classList.remove('bes-ai-workspace-open');
    document.documentElement.dataset.aiChatbot = 'removed';
  };

  const cleanStorage = () => {
    try {
      const prefixes = ['bes-ai-hide-active-name-', 'brian-ai-chatbot', 'bes-chatbot'];
      const keys = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = String(localStorage.key(index) || '').toLowerCase();
        if (prefixes.some((prefix) => key.startsWith(prefix))) keys.push(key);
      }
      keys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Local storage is optional.
    }
  };

  const start = () => {
    cleanStorage();
    purge(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          purge(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) purge(node);
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'aria-label', 'title', 'style'],
    });

    [0, 120, 400, 900, 1800, 3500].forEach((delay) => {
      window.setTimeout(() => purge(document), delay);
    });

    window.addEventListener('bes-ai-open', (event) => event.stopImmediatePropagation(), true);
    window.addEventListener('bes-chatbot-drawer-open', (event) => event.stopImmediatePropagation(), true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
