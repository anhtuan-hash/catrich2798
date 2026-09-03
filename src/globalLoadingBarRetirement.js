const RETIREMENT_STYLE_ID = 'bes-global-loading-bars-retired';
const RETIRED_CONTAINER_SELECTOR = '#bes-global-wave-loader,#bes-wp8-global-loader';
const RETIRED_VISUAL_SELECTOR = [
  '#bes-global-wave-loader',
  '#bes-wp8-global-loader',
  '.bes-wave-loader__wave',
  '.bes-wp8-loader-dot',
  '.bes-wp8-dots',
  '.gm-route-loader',
  '.windows-loader-wrap',
  '.windows-loader-card',
  '[data-bes-route-loading]',
  '[data-route-loading]',
  '[data-global-route-loading]',
  '[data-bes-unified-wave-loader]',
].join(',');

function ensureRetirementStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(RETIREMENT_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = RETIREMENT_STYLE_ID;
    style.dataset.besLoadingBarRetirement = 'true';
    (document.head || document.documentElement).appendChild(style);
  }
  style.textContent = `${RETIRED_VISUAL_SELECTOR}{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;animation:none!important;transition:none!important}`;
}

function purgeRetiredContainers(root = document) {
  if (typeof document === 'undefined') return;
  const scope = root?.querySelectorAll ? root : document;
  scope.querySelectorAll(RETIRED_CONTAINER_SELECTOR).forEach((node) => node.remove());
  if (root instanceof Element && root.matches?.(RETIRED_CONTAINER_SELECTOR)) root.remove();
}

export function installGlobalLoadingBarRetirement() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (window.__besGlobalLoadingBarsRetired) return window.__besGlobalLoadingBarsRetirementDispose || (() => {});
  window.__besGlobalLoadingBarsRetired = true;

  ensureRetirementStyle();
  purgeRetiredContainers();

  if (typeof MutationObserver === 'undefined') return () => {};
  const observer = new MutationObserver((mutations) => {
    ensureRetirementStyle();
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) purgeRetiredContainers(node);
      });
    });
    purgeRetiredContainers();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const dispose = () => observer.disconnect();
  window.__besGlobalLoadingBarsRetirementDispose = dispose;
  return dispose;
}

installGlobalLoadingBarRetirement();
