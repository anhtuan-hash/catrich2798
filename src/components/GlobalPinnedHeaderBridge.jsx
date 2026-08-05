import { useLayoutEffect } from 'react';
import './GlobalPinnedHeaderBridge.css';

function findShellAndChrome() {
  const shell = document.querySelector('.app-shell[data-route]');
  const chrome = shell?.querySelector(':scope > .bes-top-chrome');
  return { shell, chrome };
}

export default function GlobalPinnedHeaderBridge() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let frame = 0;
    let resizeObserver = null;
    let mutationObserver = null;
    let activeShell = null;

    const measure = () => {
      const { shell, chrome } = findShellAndChrome();
      if (!shell || !chrome) return;

      activeShell = shell;
      const height = Math.max(0, Math.ceil(chrome.getBoundingClientRect().height));

      shell.dataset.besHeaderPinned = 'true';
      shell.style.setProperty('--bes-pinned-header-height', `${height}px`);
      document.documentElement.style.setProperty('--bes-pinned-header-height', `${height}px`);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    scheduleMeasure();

    const initial = findShellAndChrome();
    if (initial.chrome && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(initial.chrome);
    }

    if (initial.chrome && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(scheduleMeasure);
      mutationObserver.observe(initial.chrome, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    window.addEventListener('resize', scheduleMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleMeasure, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      activeShell?.removeAttribute('data-bes-header-pinned');
      activeShell?.style.removeProperty('--bes-pinned-header-height');
      document.documentElement.style.removeProperty('--bes-pinned-header-height');
    };
  }, []);

  return null;
}
