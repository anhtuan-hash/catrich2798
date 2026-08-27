import { useEffect } from 'react';

const SPACER_ATTR = 'data-bes-pinned-hub-spacer';
const HIDE_AT = 96;
const SHOW_AT = 24;

function viewportScrollTop() {
  return Math.max(
    0,
    Number(window.scrollY || 0),
    Number(document.documentElement?.scrollTop || 0),
    Number(document.body?.scrollTop || 0),
  );
}

function elementScrollTop(target) {
  if (!target || target === window || target === document || target === document.documentElement || target === document.body) {
    return viewportScrollTop();
  }
  return Math.max(viewportScrollTop(), Number(target.scrollTop || 0));
}

function findVisibleHub() {
  const candidates = [...document.querySelectorAll('.bes-top-chrome')];
  return candidates.find((node) => {
    if (!node?.isConnected) return false;
    const style = window.getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }) || null;
}

export default function GlobalPinnedNavigationHub({ route }) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let chrome = null;
    let shell = null;
    let host = null;
    let spacer = null;
    let resizeObserver = null;
    let mutationObserver = null;
    let scrollFrame = 0;
    let measureFrame = 0;
    let attachFrame = 0;
    let collapsed = false;
    let activeScrollTop = viewportScrollTop();

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
        detail: { collapsed: next, source, scrollY: activeScrollTop },
      }));
      window.setTimeout(measure, 0);
      window.setTimeout(measure, 240);
    };

    const syncFromScroll = () => {
      scrollFrame = 0;
      const y = Math.max(0, activeScrollTop);
      if (!collapsed && y > HIDE_AT) setCollapsed(true);
      else if (collapsed && y < SHOW_AT) setCollapsed(false);
      else measure();
    };

    const onScroll = (event) => {
      activeScrollTop = elementScrollTop(event?.target);
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(syncFromScroll);
    };

    const detachCurrent = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      chrome?.removeAttribute('data-bes-pinned-hub');
      chrome?.removeAttribute('data-bes-newswire-collapsed');
      chrome?.removeAttribute('data-bes-newswire-collapse-source');
      shell?.removeAttribute('data-bes-newswire-collapsed');
      spacer?.remove();
      chrome = null;
      shell = null;
      host = null;
      spacer = null;
    };

    const attach = () => {
      const nextChrome = findVisibleHub();
      if (!nextChrome) return false;

      if (chrome !== nextChrome) {
        detachCurrent();
        chrome = nextChrome;
        shell = chrome.closest('.app-shell') || chrome.parentElement;
        host = chrome.parentElement || shell;
        chrome.dataset.besPinnedHub = 'true';

        spacer = host?.querySelector?.(`:scope > [${SPACER_ATTR}]`) || null;
        if (!spacer && host) {
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

      activeScrollTop = viewportScrollTop();
      collapsed = activeScrollTop > HIDE_AT;
      chrome.dataset.besNewswireCollapsed = collapsed ? 'true' : 'false';
      shell?.setAttribute('data-bes-newswire-collapsed', collapsed ? 'true' : 'false');
      measure();
      return true;
    };

    const scheduleAttach = () => {
      if (attachFrame) return;
      attachFrame = window.requestAnimationFrame(() => {
        attachFrame = 0;
        if (!chrome?.isConnected) attach();
      });
    };

    attach();
    // Capture scroll from both the document and nested app scroll containers.
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', measure, { passive: true });

    mutationObserver = new MutationObserver((records) => {
      if (!chrome?.isConnected) {
        scheduleAttach();
        return;
      }
      const mightContainHub = records.some((record) => [...record.addedNodes].some((node) => (
        node?.nodeType === 1 && (node.matches?.('.bes-top-chrome') || node.querySelector?.('.bes-top-chrome'))
      )));
      if (mightContainHub) scheduleAttach();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    const routeTimer = window.setTimeout(() => {
      attach();
      activeScrollTop = viewportScrollTop();
      syncFromScroll();
    }, 0);

    return () => {
      window.clearTimeout(routeTimer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', measure);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      if (attachFrame) window.cancelAnimationFrame(attachFrame);
      mutationObserver?.disconnect();
      detachCurrent();
      document.documentElement.style.removeProperty('--bes-pinned-hub-reserved-height');
    };
  }, [route]);

  return null;
}
