import { useEffect } from 'react';

const SPACER_ATTR = 'data-bes-pinned-hub-spacer';
const HIDE_AT = 96;
const SHOW_AT = 24;

function scrollTop() {
  return Math.max(
    0,
    Number(window.scrollY || 0),
    Number(document.documentElement?.scrollTop || 0),
    Number(document.body?.scrollTop || 0),
  );
}

export default function GlobalPinnedNavigationHub({ route }) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let chrome = null;
    let shell = null;
    let spacer = null;
    let resizeObserver = null;
    let mutationObserver = null;
    let scrollFrame = 0;
    let measureFrame = 0;
    let collapsed = false;

    const measure = () => {
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      measureFrame = window.requestAnimationFrame(() => {
        measureFrame = 0;
        if (!chrome?.isConnected || !spacer?.isConnected) return;
        const rect = chrome.getBoundingClientRect();
        const reserve = Math.max(0, rect.bottom + 14);
        spacer.style.height = `${Math.ceil(reserve)}px`;
        document.documentElement.style.setProperty('--bes-pinned-hub-reserved-height', `${Math.ceil(reserve)}px`);
      });
    };

    const setCollapsed = (next, source = 'scroll') => {
      if (!chrome?.isConnected) return;
      if (collapsed === next && chrome.dataset.besNewswireCollapsed === String(next)) return;
      collapsed = next;
      chrome.dataset.besNewswireCollapsed = next ? 'true' : 'false';
      chrome.dataset.besNewswireCollapseSource = source;
      shell?.setAttribute('data-bes-newswire-collapsed', next ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('bes-newswire-visibility', {
        detail: { collapsed: next, source, scrollY: scrollTop() },
      }));
      window.setTimeout(measure, 0);
      window.setTimeout(measure, 240);
    };

    const syncFromScroll = () => {
      scrollFrame = 0;
      const y = scrollTop();
      if (!collapsed && y > HIDE_AT) setCollapsed(true);
      else if (collapsed && y < SHOW_AT) setCollapsed(false);
      else measure();
    };

    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(syncFromScroll);
    };

    const attach = () => {
      const nextChrome = document.querySelector('.app-shell[data-route] > .bes-top-chrome');
      if (!nextChrome) return false;

      if (chrome !== nextChrome) {
        resizeObserver?.disconnect();
        chrome = nextChrome;
        shell = chrome.parentElement;
        chrome.dataset.besPinnedHub = 'true';

        spacer = shell?.querySelector?.(`[${SPACER_ATTR}]`) || null;
        if (!spacer && shell) {
          spacer = document.createElement('div');
          spacer.setAttribute(SPACER_ATTR, 'true');
          spacer.setAttribute('aria-hidden', 'true');
          chrome.insertAdjacentElement('afterend', spacer);
        }

        resizeObserver = typeof ResizeObserver === 'function'
          ? new ResizeObserver(measure)
          : null;
        resizeObserver?.observe(chrome);
      }

      collapsed = scrollTop() > HIDE_AT;
      chrome.dataset.besNewswireCollapsed = collapsed ? 'true' : 'false';
      shell?.setAttribute('data-bes-newswire-collapsed', collapsed ? 'true' : 'false');
      measure();
      return true;
    };

    attach();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure, { passive: true });

    mutationObserver = new MutationObserver(() => {
      if (!chrome?.isConnected) attach();
      else measure();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    const routeTimer = window.setTimeout(() => {
      attach();
      syncFromScroll();
    }, 0);

    return () => {
      window.clearTimeout(routeTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      chrome?.removeAttribute('data-bes-pinned-hub');
      chrome?.removeAttribute('data-bes-newswire-collapsed');
      chrome?.removeAttribute('data-bes-newswire-collapse-source');
      shell?.removeAttribute('data-bes-newswire-collapsed');
      spacer?.remove();
      document.documentElement.style.removeProperty('--bes-pinned-hub-reserved-height');
    };
  }, [route]);

  return null;
}
