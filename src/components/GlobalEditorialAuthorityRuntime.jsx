import { useEffect } from 'react';
import editorialCss from '../styles/GlobalEditorialAuthority2026.css?inline';

const STYLE_ID = 'bes-global-editorial-authority-2026';

function ensureFinalStyleNode() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.dataset.besEditorialAuthority = '2026';
    style.textContent = editorialCss;
  } else if (style.textContent !== editorialCss) {
    style.textContent = editorialCss;
  }

  if (style.parentNode !== document.head || document.head.lastElementChild !== style) {
    document.head.appendChild(style);
  }
  return style;
}

export default function GlobalEditorialAuthorityRuntime() {
  useEffect(() => {
    let disposed = false;
    let raf = 0;
    const timers = new Set();

    const promote = () => {
      if (disposed) return;
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        if (!disposed) ensureFinalStyleNode();
      });
    };

    const promoteBurst = () => {
      promote();
      [80, 260, 720, 1400].forEach((delay) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          promote();
        }, delay);
        timers.add(timer);
      });
    };

    const style = ensureFinalStyleNode();
    document.documentElement.dataset.besEditorialSystem = '2026';

    // Lazy routes inject their own CSS after the shell has mounted. Whenever a
    // new stylesheet appears, move the editorial authority back to the absolute
    // end of <head> so old route skins can never regain cascade priority.
    const observer = new MutationObserver((mutations) => {
      const hasNewStylesheet = mutations.some((mutation) => [...mutation.addedNodes].some((node) => {
        if (!(node instanceof HTMLElement) || node === style) return false;
        if (node.tagName === 'STYLE') return true;
        return node.tagName === 'LINK' && String(node.getAttribute('rel') || '').toLowerCase() === 'stylesheet';
      }));
      if (hasNewStylesheet) promote();
    });

    observer.observe(document.head, { childList: true });
    window.addEventListener('hashchange', promoteBurst);
    window.addEventListener('bes-route-change', promoteBurst);
    window.addEventListener('bes-editorial-refresh', promoteBurst);
    promoteBurst();

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('hashchange', promoteBurst);
      window.removeEventListener('bes-route-change', promoteBurst);
      window.removeEventListener('bes-editorial-refresh', promoteBurst);
      window.cancelAnimationFrame(raf);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return null;
}
