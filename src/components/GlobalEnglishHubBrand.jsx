import { useEffect } from 'react';

// Official Brian English brand mark. Keep the visible wordmark as live text so
// the header stays crisp and readable at every viewport size.
const BRIAN_ENGLISH_MARK = '/brian-english-brand-mark.png';

function prepareBrandButton(button) {
  button.setAttribute('aria-label', 'Brian English');
  button.setAttribute('title', 'Brian English');
  button.dataset.brianBrandReady = 'true';
  button.classList.add('brian-nav__brand--restored');

  const image = button.querySelector(':scope > img');
  if (image) {
    image.src = BRIAN_ENGLISH_MARK;
    image.alt = 'Brian English logo';
    image.removeAttribute('aria-hidden');
  }

  const label = button.querySelector(':scope > span');
  if (label && label.textContent !== 'Brian English') {
    label.textContent = 'Brian English';
  }
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

function applyBrianEnglishBrand() {
  document.querySelectorAll('.brian-nav__brand').forEach(prepareBrandButton);
  hideRedundantHomeTab();

  document.querySelectorAll('.brian-overlap-home .boh-copy-panel > h1').forEach((node) => {
    if (node.textContent === 'English Hub') node.textContent = 'Brian English';
  });

  document.querySelectorAll('.brian-overlap-home .boh-eyebrow').forEach((node) => {
    if (node.textContent === 'ENGLISH HUB') node.textContent = 'BRIAN ENGLISH';
  });

  document.querySelectorAll('.brian-overlap-home').forEach((node) => {
    node.setAttribute('aria-label', 'Brian English homepage');
  });

  if (document.title.includes('English Hub')) {
    document.title = document.title.replace('English Hub', 'Brian English');
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
        applyBrianEnglishBrand();
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
