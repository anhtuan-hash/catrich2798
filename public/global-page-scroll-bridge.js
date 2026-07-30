(() => {
  'use strict';

  /* Native scrolling is intentionally restored.
     The former bridge intercepted every wheel/trackpad event in capture phase,
     prevented the browser default, queried layout styles and replayed scrolling
     through requestAnimationFrame. That removed macOS momentum scrolling and
     caused visible frame drops across every Brian route. */
  const style = document.getElementById('brian-page-scroll-bridge-style');
  if (style) style.remove();

  window.__BRIAN_PAGE_SCROLL_BRIDGE__ = 'native-scroll-v2';
  window.BrianPageScrollBridge = Object.freeze({
    version: 'native-scroll-v2',
    enabled: false,
    getRedirectedEventCount: () => 0,
    localScrollSelector: '',
    markLocal: (element) => element,
  });
})();
