import { useLayoutEffect } from 'react';
import './GlobalPinnedHeaderBridge.css';

function findNavigationElements() {
  const shell = document.querySelector('.app-shell[data-route]');
  const chrome = shell?.querySelector(':scope > .bes-top-chrome');
  const navigation = chrome?.querySelector(':scope > .brian-nav');
  return { shell, chrome, navigation };
}

export default function GlobalPinnedHeaderBridge() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let frame = 0;
    let resizeObserver = null;
    let mutationObserver = null;
    let activeShell = null;

    const measure = () => {
      const { shell, navigation } = findNavigationElements();
      if (!shell || !navigation) return;

      activeShell = shell;
      const height = Math.max(0, Math.ceil(navigation.getBoundingClientRect().height));

      shell.dataset.besNavPinned = 'true';
      shell.style.setProperty('--bes-pinned-nav-height', `${height}px`);
      document.documentElement.style.setProperty('--bes-pinned-nav-height', `${height}px`);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    scheduleMeasure();

    const initial = findNavigationElements();
    if (initial.navigation && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(initial.navigation);
    }

    if (initial.navigation && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(scheduleMeasure);
      mutationObserver.observe(initial.navigation, {
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
      activeShell?.removeAttribute('data-bes-nav-pinned');
      activeShell?.style.removeProperty('--bes-pinned-nav-height');
      document.documentElement.style.removeProperty('--bes-pinned-nav-height');
    };
  }, []);

  return null;
}
