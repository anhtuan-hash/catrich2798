import { useEffect } from 'react';

// Canonical Brian English navigation brand.
const BRIAN_ENGLISH_MARK = '/brian-english-brand-mark.png';
const BRIAN_ENGLISH_LABEL = 'Brian English';
const BRAND_STYLE_ID = 'brian-english-brand-dedup-style';

function ensureBrandDedupStyle() {
  if (document.getElementById(BRAND_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = BRAND_STYLE_ID;
  style.textContent = `
    .brian-nav__brand--restored::before,
    .brian-nav__brand--restored::after,
    .brian-nav__brand--restored *::before,
    .brian-nav__brand--restored *::after {
      content: none !important;
      display: none !important;
    }

    .brian-nav__brand--restored > :not([data-brian-brand-logo="true"]):not([data-brian-brand-label="true"]) {
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

  let image = button.querySelector('img[data-brian-brand-logo="true"]') || button.querySelector('img');
  if (!image) image = document.createElement('img');
  image.src = BRIAN_ENGLISH_MARK;
  image.alt = 'Brian English logo';
  image.removeAttribute('aria-hidden');
  image.dataset.brianBrandLogo = 'true';

  let label = button.querySelector('[data-brian-brand-label="true"]');
  if (!label) label = document.createElement('span');
  label.textContent = BRIAN_ENGLISH_LABEL;
  label.dataset.brianBrandLabel = 'true';

  const children = [...button.childNodes];
  const isCanonical =
    children.length === 2 &&
    children[0] === image &&
    children[1] === label &&
    String(button.textContent || '').trim() === BRIAN_ENGLISH_LABEL;

  // Rebuild the inside of the existing button instead of replacing the button
  // itself. This preserves its React click handler while permanently removing
  // all legacy "English Hub" wrappers, text nodes and duplicate labels.
  if (!isCanonical) button.replaceChildren(image, label);
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
    document.title = document.title.replaceAll('English Hub', BRIAN_ENGLISH_LABEL);
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

    // Some legacy navigation effects can re-render their old label after this
    // component runs. Observe child-list changes so the canonical brand wins
    // every time without creating any server-side function.
    const observer = new MutationObserver(() => {
      if (cancelled || !document.querySelector('.brian-nav__brand')) return;
      applyBrianEnglishBrand();
    });

    applyWhenReady();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('hashchange', applyWhenReady);
    window.addEventListener('brian:navigation-updated', applyWhenReady);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', applyWhenReady);
      window.removeEventListener('brian:navigation-updated', applyWhenReady);
    };
  }, []);

  return null;
}
