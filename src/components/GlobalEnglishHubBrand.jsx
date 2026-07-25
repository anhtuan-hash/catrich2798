import { useEffect } from 'react';

function prepareBrandButton(button) {
  button.setAttribute('aria-label', 'English Hub');
  button.setAttribute('title', 'English Hub');
  button.dataset.brianBrandReady = 'true';
}

function hideRedundantHomeTab() {
  const homeLabels = new Set(['Trang chủ', 'Home']);

  document.querySelectorAll('.brian-nav__primary > button').forEach((button) => {
    if (!homeLabels.has(String(button.textContent || '').trim())) return;
    button.dataset.brianHomeTabHidden = 'true';
    button.setAttribute('aria-hidden', 'true');
    button.tabIndex = -1;
  });
}

function applyEnglishHubBrand() {
  document.querySelectorAll('.brian-nav__brand').forEach(prepareBrandButton);
  hideRedundantHomeTab();

  document.querySelectorAll('.brian-overlap-home .boh-copy-panel > h1').forEach((node) => {
    if (node.textContent !== 'English Hub') node.textContent = 'English Hub';
  });

  document.querySelectorAll('.brian-overlap-home .boh-eyebrow').forEach((node) => {
    if (node.textContent !== 'ENGLISH HUB') node.textContent = 'ENGLISH HUB';
  });

  document.querySelectorAll('.brian-overlap-home').forEach((node) => {
    node.setAttribute('aria-label', 'English Hub homepage');
  });

  if (document.title.includes('Brian English')) {
    document.title = document.title.replace('Brian English', 'English Hub');
  }
}

function hasExpectedTargets() {
  const route = window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0] || 'home';
  const hasNavigation = Boolean(document.querySelector('.brian-nav__brand'));
  const hasHome = route !== 'home' || Boolean(document.querySelector('.brian-overlap-home'));
  return hasNavigation && hasHome;
}

export default function GlobalEnglishHubBrand() {
  useEffect(() => {
    let frame = 0;
    let cancelled = false;

    const applyWhenReady = () => {
      window.cancelAnimationFrame(frame);
      let attempts = 0;

      const apply = () => {
        if (cancelled) return;
        applyEnglishHubBrand();
        attempts += 1;
        if (!hasExpectedTargets() && attempts < 60) frame = window.requestAnimationFrame(apply);
      };

      apply();
    };

    applyWhenReady();
    window.addEventListener('hashchange', applyWhenReady);
    window.addEventListener('brian:navigation-updated', applyWhenReady);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', applyWhenReady);
      window.removeEventListener('brian:navigation-updated', applyWhenReady);
    };
  }, []);

  return null;
}
