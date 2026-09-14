import mobileHomeHeroImage from './assets/mobileHero/index.js';

const HERO_SELECTOR = '[data-mobile-home-hero]';
const HERO_IMAGE_SELECTOR = '[data-mobile-home-hero-art]';

function applyDirectMobileHero(root = document) {
  const hero = root.querySelector?.(HERO_SELECTOR) || document.querySelector(HERO_SELECTOR);
  if (!hero) return false;

  const image = hero.querySelector(HERO_IMAGE_SELECTOR);
  if (!image) return false;

  if (image.getAttribute('src') !== mobileHomeHeroImage) {
    image.setAttribute('src', mobileHomeHeroImage);
  }
  image.setAttribute('alt', 'Brian English — Học tiếng Anh thật vui');
  image.setAttribute('data-mobile-home-direct-hero', 'true');
  image.style.setProperty('object-fit', 'contain', 'important');

  hero.style.setProperty('aspect-ratio', '4 / 3', 'important');
  hero.style.setProperty('min-height', '0', 'important');

  hero.querySelectorAll('.bes-mobile-home__hero-hotspot').forEach((button) => button.remove());
  return true;
}

function bootDirectMobileHero() {
  applyDirectMobileHero();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(HERO_SELECTOR) || node.querySelector?.(HERO_SELECTOR)) {
          applyDirectMobileHero(node.matches?.(HERO_SELECTOR) ? node.parentElement || document : node);
          return;
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootDirectMobileHero, { once: true });
} else {
  bootDirectMobileHero();
}
