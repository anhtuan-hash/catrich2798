import { useEffect } from 'react';
import editorialCss from '../styles/GlobalEditorialAuthority2026.css?inline';
import navigationCss from '../styles/GlobalNavigationFinal2026.css?inline';
import stage5AppCss from '../styles/BrianStage5Migration.css?inline';
import stage5WorkflowCss from '../styles/BrianStage5WorkflowMigration.css?inline';
import stage6PolishCss from '../styles/BrianStage6Polish.css?inline';
import homeSparkleCss from './GlobalHomeSparkleButton.css?inline';

const STYLE_ID = 'bes-global-editorial-authority-2026';
const finalEditorialCss = `${editorialCss}\n\n${navigationCss}\n\n${stage5AppCss}\n\n${stage5WorkflowCss}\n\n${stage6PolishCss}\n\n${homeSparkleCss}`;

function ensureFinalStyleNode() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.dataset.besEditorialAuthority = '2026';
    style.textContent = finalEditorialCss;
  } else if (style.textContent !== finalEditorialCss) {
    style.textContent = finalEditorialCss;
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

    const promote = () => {
      if (disposed) return;
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        if (!disposed) ensureFinalStyleNode();
      });
    };

    const style = ensureFinalStyleNode();
    document.documentElement.dataset.besEditorialSystem = '2026';

    // Lazy routes can inject CSS after the shell mounts. The observer is the
    // single source of truth for re-promoting Brian's final visual authority;
    // no timed promotion burst is needed.
    const observer = new MutationObserver((mutations) => {
      const hasNewStylesheet = mutations.some((mutation) => [...mutation.addedNodes].some((node) => {
        if (!(node instanceof HTMLElement) || node === style) return false;
        if (node.tagName === 'STYLE') return true;
        return node.tagName === 'LINK' && String(node.getAttribute('rel') || '').toLowerCase() === 'stylesheet';
      }));
      if (hasNewStylesheet) promote();
    });

    observer.observe(document.head, { childList: true });
    window.addEventListener('hashchange', promote);
    window.addEventListener('bes-route-change', promote);
    window.addEventListener('bes-editorial-refresh', promote);

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener('hashchange', promote);
      window.removeEventListener('bes-route-change', promote);
      window.removeEventListener('bes-editorial-refresh', promote);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
