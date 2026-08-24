(() => {
  'use strict';

  const EXCLUDED_ANCESTORS = [
    '.brian-nav',
    '.brian-nav__actions',
    '.brian-ai-workspace',
    '.brian-ai-workspace-layer',
    '.bes-vn-admin',
    '[role="navigation"]',
  ].join(',');

  const KNOWN_LAUNCHERS = [
    '.bes-chatbot-fab',
    '.bes-chatbot-launcher',
    '.chatbot-fab',
    '.chatbot-launcher',
    '.chatbot-toggle',
    '.floating-chatbot',
    '.floating-chatbot-button',
    '.ai-chatbot-fab',
    '.ai-chatbot-launcher',
    '[data-chatbot-launcher]',
    '[data-ai-chatbot-launcher]',
  ].join(',');

  const semanticPattern = /chat\s*bot|chatbot|trợ\s*lý\s*ai|tro\s*ly\s*ai|ai\s*assistant|brian\s*ai\s*assistant/i;
  const compactIconPattern = /^(ai|🤖|💬|🧠|✨)$/i;

  const hide = (element) => {
    if (!(element instanceof HTMLElement)) return;
    element.dataset.besRemovedFloatingChatbot = 'true';
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('pointer-events', 'none', 'important');
  };

  const markerFor = (element) => [
    element.id,
    element.className,
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.getAttribute('data-testid'),
    element.textContent,
  ].filter(Boolean).join(' ');

  const isFloatingChatbotLauncher = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.closest(EXCLUDED_ANCESTORS)) return false;
    if (element.matches(KNOWN_LAUNCHERS)) return true;

    const role = element.getAttribute('role');
    const isControl = element.matches('button,a,[role="button"]') || role === 'button';
    if (!isControl) return false;

    const marker = markerFor(element);
    const style = window.getComputedStyle(element);
    if (!['fixed', 'sticky', 'absolute'].includes(style.position)) return false;

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    const onRightSide = rect.left >= window.innerWidth * 0.62;
    const belowNavigation = rect.top >= 92;
    const compact = rect.width <= 120 && rect.height <= 120;
    const iconOnly = compactIconPattern.test(String(element.textContent || '').trim());

    return onRightSide
      && belowNavigation
      && compact
      && (semanticPattern.test(marker) || iconOnly);
  };

  const inspect = (root = document) => {
    const controls = root instanceof HTMLElement && root.matches('button,a,[role="button"]')
      ? [root]
      : Array.from(root.querySelectorAll?.('button,a,[role="button"]') || []);

    controls.forEach((control) => {
      if (!isFloatingChatbotLauncher(control)) return;

      const semanticContainer = control.closest([
        '.bes-chatbot-root',
        '.chatbot-root',
        '.floating-chatbot',
        '[data-chatbot-root]',
      ].join(','));

      hide(semanticContainer || control);
    });

    Array.from(root.querySelectorAll?.(KNOWN_LAUNCHERS) || []).forEach((launcher) => {
      if (!launcher.closest(EXCLUDED_ANCESTORS)) hide(launcher);
    });
  };

  const start = () => {
    inspect(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) inspect(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => inspect(document), 400);
    window.setTimeout(() => inspect(document), 1400);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

/* Dashboard hero assets are loaded here because this global guard is already
   present on every signed-in route. Both assets remain fully route-scoped. */
(() => {
  const cssId = 'bes-dashboard-premium-hero-css';
  const scriptId = 'bes-dashboard-premium-hero-js';

  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = '/dashboard-premium-hero.css?v=1';
    document.head.appendChild(link);
  }

  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = '/dashboard-premium-hero.js?v=1';
    script.defer = true;
    document.head.appendChild(script);
  }
})();

/* Word Orbit flight assets are intentionally loaded before the React tool can
   be used. They are route-safe and only activate for .wog-flight-capsule. */
(() => {
  const cssId = 'bes-word-orbit-visible-flight-css';
  const scriptId = 'bes-word-orbit-visible-flight-js';

  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = '/word-orbit-visible-flight.css?v=1';
    document.head.appendChild(link);
  }

  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = '/word-orbit-visible-flight.js?v=1';
    script.async = false;
    document.head.appendChild(script);
  }
})();
