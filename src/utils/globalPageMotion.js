let installed = false;
let cleanupTimer = 0;

const PAGE_HOST_SELECTOR = '#bes-main-content, [data-bes-main-content]';

function motionAllowed() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (document.documentElement?.dataset?.motionEnabled !== 'true') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

function findPageHost() {
  return document.querySelector(PAGE_HOST_SELECTOR);
}

export function replayGlobalPageEntrance() {
  if (!motionAllowed()) return;

  let attempts = 0;
  const mark = () => {
    if (!motionAllowed()) return;
    const host = findPageHost();
    if (!host) {
      if (attempts++ < 12) window.requestAnimationFrame(mark);
      return;
    }

    /* The SPA keeps #bes-main-content mounted between hash routes. Temporarily
       suppress the CSS animation, force style calculation, then expose the
       global animation again so every route change gets a fresh page entrance. */
    host.style.setProperty('animation', 'none', 'important');
    host.removeAttribute('data-global-page-enter');
    void host.offsetWidth;

    window.requestAnimationFrame(() => {
      if (!host.isConnected || !motionAllowed()) {
        host.style.removeProperty('animation');
        return;
      }
      host.dataset.globalPageEnter = 'true';
      host.style.removeProperty('animation');
      void host.offsetWidth;
      window.clearTimeout(cleanupTimer);
      cleanupTimer = window.setTimeout(() => {
        if (host?.isConnected) delete host.dataset.globalPageEnter;
      }, 950);
    });
  };

  window.requestAnimationFrame(() => window.requestAnimationFrame(mark));
}

export function installGlobalPageMotion() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;

  const onRouteChange = () => replayGlobalPageEntrance();
  window.addEventListener('hashchange', onRouteChange);
  window.addEventListener('popstate', onRouteChange);
  window.addEventListener('bes-navigation-changed', onRouteChange);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onRouteChange, { once: true });
  } else {
    window.setTimeout(onRouteChange, 0);
  }
}