import { useLayoutEffect } from 'react';
import './GlobalPinnedHeaderBridge.css';

function findNavigationElements() {
  const shell = document.querySelector('.app-shell[data-route]');
  const chrome = shell?.querySelector(':scope > .bes-top-chrome');
  const navigation = chrome?.querySelector(':scope > .brian-nav');
  const briefing = chrome?.querySelector(':scope > .brian-briefing-bar');
  return { shell, chrome, navigation, briefing };
}

export default function GlobalPinnedHeaderBridge() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let frame = 0;
    let resizeObserver = null;
    let mutationObserver = null;
    let activeShell = null;

    const measure = () => {
      const { shell, chrome, navigation, briefing } = findNavigationElements();
      if (!shell || !navigation) return;

      activeShell = shell;
      const navigationRect = navigation.getBoundingClientRect();
      const alignmentRect = (briefing || chrome || navigation).getBoundingClientRect();
      const height = Math.max(0, Math.ceil(navigationRect.height));
      const left = Math.max(0, Math.round(alignmentRect.left));
      const width = Math.max(0, Math.round(alignmentRect.width));

      shell.dataset.besNavPinned = 'true';
      shell.style.setProperty('--bes-pinned-nav-height', `${height}px`);
      shell.style.setProperty('--bes-header-row-left', `${left}px`);
      shell.style.setProperty('--bes-header-row-width', `${width}px`);
      document.documentElement.style.setProperty('--bes-pinned-nav-height', `${height}px`);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    scheduleMeasure();

    const initial = findNavigationElements();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      if (initial.chrome) resizeObserver.observe(initial.chrome);
      if (initial.navigation) resizeObserver.observe(initial.navigation);
      if (initial.briefing) resizeObserver.observe(initial.briefing);
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
      activeShell?.removeAttribute('data-bes-nav-pinned');
      activeShell?.style.removeProperty('--bes-pinned-nav-height');
      activeShell?.style.removeProperty('--bes-header-row-left');
      activeShell?.style.removeProperty('--bes-header-row-width');
      document.documentElement.style.removeProperty('--bes-pinned-nav-height');
    };
  }, []);

  return null;
}
