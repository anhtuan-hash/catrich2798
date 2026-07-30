(() => {
  'use strict';

  if (window.__BRIAN_PAGE_SCROLL_BRIDGE__) return;
  window.__BRIAN_PAGE_SCROLL_BRIDGE__ = true;

  const VERSION = 'v1';
  const ROOT_SELECTORS = [
    '[data-brian-page-scroll-root="true"]',
    '.wp8-page-stage',
    '.metro-shell',
    '.app-shell',
    'main'
  ];
  const LOCAL_SCROLL_SELECTOR = [
    '[data-brian-wheel-scope="local"]',
    '[data-brian-local-scroll="true"]',
    'dialog',
    '[role="dialog"]',
    '[aria-modal="true"]',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[role="listbox"]',
    '[role="menu"]',
    '[role="tree"]',
    'iframe',
    'canvas',
    '.brian-nav__popover',
    '.brian-nav__account-menu',
    '.brian-notification-center',
    '.brian-ai-workspace',
    '.modal',
    '[class$="-modal"]',
    '[class*="-modal "]',
    '.drawer',
    '[class$="-drawer"]',
    '[class*="-drawer "]',
    '.sheet',
    '[class$="-sheet"]',
    '[class*="-sheet "]',
    '.popover',
    '[class$="-popover"]',
    '[class*="-popover "]',
    '.editor',
    '[class$="-editor"]',
    '[class*="-editor "]'
  ].join(',');

  let pendingDelta = 0;
  let pendingScroller = null;
  let frame = 0;
  let redirectedEvents = 0;

  function isElement(value) {
    return value instanceof Element;
  }

  function isVisible(element) {
    if (!isElement(element)) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function isScrollable(element) {
    if (!element) return false;
    if (element === document.scrollingElement) return element.scrollHeight > element.clientHeight + 1;
    if (!isElement(element) || !isVisible(element)) return false;
    const style = getComputedStyle(element);
    return /(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
  }

  function canScrollInDirection(element, deltaY) {
    if (!isScrollable(element)) return false;
    const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
    if (deltaY < 0) return element.scrollTop > 1;
    if (deltaY > 0) return element.scrollTop < maxScrollTop - 1;
    return false;
  }

  function getPageScroller(deltaY) {
    const documentScroller = document.scrollingElement || document.documentElement;
    if (canScrollInDirection(documentScroller, deltaY)) return documentScroller;

    for (const selector of ROOT_SELECTORS) {
      const candidates = document.querySelectorAll(selector);
      for (const candidate of candidates) {
        if (canScrollInDirection(candidate, deltaY)) return candidate;
      }
    }

    return null;
  }

  function pathUsesLocalScroll(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
    return path.some((node) => isElement(node) && node.matches(LOCAL_SCROLL_SELECTOR));
  }

  function normalizeDelta(event) {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * Math.max(1, window.innerHeight * 0.9);
    return event.deltaY;
  }

  function flushScroll() {
    frame = 0;
    const scroller = pendingScroller;
    const delta = pendingDelta;
    pendingScroller = null;
    pendingDelta = 0;
    if (!scroller || !delta) return;

    if (scroller === document.scrollingElement || scroller === document.documentElement || scroller === document.body) {
      window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
    } else {
      scroller.scrollBy({ top: delta, left: 0, behavior: 'auto' });
    }
  }

  function queuePageScroll(scroller, deltaY) {
    if (pendingScroller && pendingScroller !== scroller) flushScroll();
    pendingScroller = scroller;
    pendingDelta += deltaY;
    if (!frame) frame = requestAnimationFrame(flushScroll);
  }

  function handleWheel(event) {
    if (event.ctrlKey || event.shiftKey || event.deltaY === 0) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (pathUsesLocalScroll(event)) return;

    const deltaY = normalizeDelta(event);
    const scroller = getPageScroller(deltaY);
    if (!scroller) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    redirectedEvents += 1;
    queuePageScroll(scroller, deltaY);
  }

  function installRootScrollChaining() {
    const style = document.createElement('style');
    style.id = 'brian-page-scroll-bridge-style';
    style.textContent = `
      html, body, #root, .app-shell, .metro-shell, .wp8-page-stage {
        overscroll-behavior-y: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  installRootScrollChaining();
  window.addEventListener('wheel', handleWheel, { capture: true, passive: false });

  window.BrianPageScrollBridge = Object.freeze({
    version: VERSION,
    getRedirectedEventCount: () => redirectedEvents,
    localScrollSelector: LOCAL_SCROLL_SELECTOR,
    markLocal: (element) => {
      if (isElement(element)) element.dataset.brianWheelScope = 'local';
      return element;
    }
  });
})();
