import { useEffect } from 'react';

// Official Brian English brand mark. Keep the visible wordmark as live text so
// the header stays crisp and readable at every viewport size.
const BRIAN_ENGLISH_MARK = '/brian-english-brand-mark.png';
const BRIAN_ENGLISH_LABEL = 'Brian English';
const BRAND_STYLE_ID = 'brian-english-brand-dedup-style';

function ensureBrandDedupStyle() {
  if (document.getElementById(BRAND_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = BRAND_STYLE_ID;
  style.textContent = `
    .brian-nav__brand--restored::before,
    .brian-nav__brand--restored::after {
      content: none !important;
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function prepareBrandButton(button) {
  button.setAttribute('aria-label', BRIAN_ENGLISH_LABEL);
  button.setAttribute('title', BRIAN_ENGLISH_LABEL);
  button.dataset.brianBrandReady = 'true';
  button.classList.add('brian-nav__brand--restored');

  const image = button.querySelector(':scope > img') || button.querySelector('img');
  if (image) {
    image.src = BRIAN_ENGLISH_MARK;
    image.alt = 'Brian English logo';
    image.removeAttribute('aria-hidden');
  }

  let label = button.querySelector(':scope > span');
  if (!label) {
    label = document.createElement('span');
    button.appendChild(label);
  }
  label.textContent = BRIAN_ENGLISH_LABEL;
  label.dataset.brianBrandLabel = 'true';

  // The legacy navigation can leave an additional "English Hub" text node or
  // sibling label behind. Remove only redundant branding nodes and keep the
  // logo/primary label intact so the button cannot render duplicated wording.
  [...button.childNodes].forEach((node) => {
    if (node === image || node === label) return;

    if (node.nodeType === Node.TEXT_NODE) {
      if (String(node.textContent || '').trim()) node.remove();
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
    if (/^(?:English Hub|Brian English|Brian English Hub)$/i.test(text)) {
      node.remove();
    }
  });
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
  ensureBrandDedupStyle();
  document.querySelectorAll('.brian-nav__brand').forEach(prepareBrandButton);
  hideRedundantHomeTab();

  document.querySelectorAll('.brian-overlap-home .boh-copy-panel > h1').forEach((node) => {
    if (node.textContent === 'English Hub') node.textContent = BRIAN_ENGLISH_LABEL;
  });

  document.querySelectorAll('.brian-overlap-home .boh-eyebrow').forEach((node) => {
    if (node.textContent === 'ENGLISH HUB') node.textContent = 'BRIAN ENGLISH';
  });

  document.querySelectorAll('.brian-overlap-home').forEach((node) => {
    node.setAttribute('aria-label', 'Brian English homepage');
  });

  if (document.title.includes('English Hub')) {
    document.title = document.title.replace('English Hub', BRIAN_ENGLISH_LABEL);
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
