const RUNTIME_KEY = '__besNavigationHubClearRuntimeV1';
const HUB_VISUAL_SELECTOR = [
  '.bes-top-chrome .brian-nav',
  '.bes-top-chrome .brian-briefing-bar',
].join(',');

function clearPinnedState(shell) {
  shell.removeAttribute('data-bes-nav-pinned');
  shell.removeAttribute('data-bes-header-scrolled');
  shell.style.removeProperty('--bes-pinned-nav-height');
}

function clearChrome(chrome) {
  chrome.removeAttribute('data-bes-pinned-chrome');
  chrome.removeAttribute('data-bes-header-scrolled');
  chrome.style.setProperty('display', 'contents', 'important');
  chrome.style.setProperty('position', 'static', 'important');
  chrome.style.setProperty('inset', 'auto', 'important');
  chrome.style.setProperty('top', 'auto', 'important');
  chrome.style.setProperty('right', 'auto', 'important');
  chrome.style.setProperty('bottom', 'auto', 'important');
  chrome.style.setProperty('left', 'auto', 'important');
  chrome.style.setProperty('margin', '0', 'important');
  chrome.style.setProperty('padding', '0', 'important');
  chrome.style.setProperty('min-height', '0', 'important');
  chrome.style.setProperty('height', 'auto', 'important');
  chrome.style.setProperty('background', 'transparent', 'important');
  chrome.style.setProperty('border', '0', 'important');
  chrome.style.setProperty('box-shadow', 'none', 'important');
  chrome.style.setProperty('transform', 'none', 'important');
}

function hideHubVisual(element) {
  element.removeAttribute('data-bes-pinned-navigation');
  element.removeAttribute('data-bes-scrollable-briefing');
  element.setAttribute('aria-hidden', 'true');
  element.style.setProperty('display', 'none', 'important');
  element.style.setProperty('position', 'static', 'important');
  element.style.setProperty('inset', 'auto', 'important');
  element.style.setProperty('width', '0', 'important');
  element.style.setProperty('height', '0', 'important');
  element.style.setProperty('min-height', '0', 'important');
  element.style.setProperty('margin', '0', 'important');
  element.style.setProperty('padding', '0', 'important');
  element.style.setProperty('border', '0', 'important');
  element.style.setProperty('box-shadow', 'none', 'important');
  element.style.setProperty('overflow', 'hidden', 'important');
}

function applyNavigationHubClear() {
  const root = document.documentElement;
  root.dataset.besNavigationHub = 'cleared';
  root.style.setProperty('--bes-pinned-nav-height', '0px', 'important');
  root.style.setProperty('scroll-padding-top', '0px', 'important');

  document.querySelectorAll('.app-shell[data-route]').forEach(clearPinnedState);
  document.querySelectorAll('.bes-top-chrome').forEach(clearChrome);
  document.querySelectorAll(HUB_VISUAL_SELECTOR).forEach(hideHubVisual);
}

export function installGlobalNavigationHubClearRuntime() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (window[RUNTIME_KEY]?.dispose) return window[RUNTIME_KEY].dispose;

  let frame = 0;
  let observer = null;

  const schedule = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(applyNavigationHubClear);
  };

  const start = () => {
    applyNavigationHubClear();
    if (typeof MutationObserver !== 'undefined' && document.body) {
      observer = new MutationObserver(schedule);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-route', 'hidden'],
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('hashchange', schedule, { passive: true });
  window.addEventListener('pageshow', schedule, { passive: true });

  const dispose = () => {
    window.cancelAnimationFrame(frame);
    observer?.disconnect();
    window.removeEventListener('hashchange', schedule);
    window.removeEventListener('pageshow', schedule);
    document.documentElement.removeAttribute('data-bes-navigation-hub');
    document.documentElement.style.removeProperty('--bes-pinned-nav-height');
    document.documentElement.style.removeProperty('scroll-padding-top');
    delete window[RUNTIME_KEY];
  };

  window[RUNTIME_KEY] = { dispose, refresh: schedule };
  return dispose;
}
