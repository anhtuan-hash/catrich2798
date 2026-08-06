import './components/GlobalBrianBrandMagneticHover.css';

const BRAND_SELECTOR = '.brian-nav__brand';
const BRAND_TEXT = 'catrich.mauxanh';
const MAX_TRANSLATE = 8;
const MAX_TILT = 7;
const BRAND_SCALE = 1.035;
const POINTER_FINE_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let cleanupActiveBrand = null;
let observer = null;
let scheduledFrame = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function decorateBrand(brand) {
  if (!brand) return [];

  brand.setAttribute('aria-label', BRAND_TEXT);
  brand.setAttribute('title', BRAND_TEXT);
  brand.dataset.catrichBrand = 'ready';

  const legacyMark = brand.querySelector(':scope > img');
  if (legacyMark) {
    legacyMark.classList.add('catrich-wordmark__legacy-mark');
    legacyMark.setAttribute('aria-hidden', 'true');
  }

  let wordmark = brand.querySelector(':scope > span');
  if (!wordmark) {
    wordmark = document.createElement('span');
    brand.appendChild(wordmark);
  }

  const alreadyDecorated = wordmark.dataset.catrichWordmark === BRAND_TEXT
    && wordmark.querySelectorAll('.catrich-wordmark__char').length === BRAND_TEXT.length;

  if (!alreadyDecorated) {
    wordmark.className = 'catrich-wordmark';
    wordmark.dataset.catrichWordmark = BRAND_TEXT;
    wordmark.setAttribute('aria-hidden', 'true');
    wordmark.replaceChildren();

    [...BRAND_TEXT].forEach((character, index) => {
      const span = document.createElement('span');
      const isDot = character === '.';
      const isBlueSegment = index > BRAND_TEXT.indexOf('.');
      span.className = [
        'catrich-wordmark__char',
        isDot ? 'is-dot' : '',
        isBlueSegment ? 'is-mauxanh' : 'is-catrich',
      ].filter(Boolean).join(' ');
      span.textContent = character;
      span.style.setProperty('--catrich-char-index', String(index));
      wordmark.appendChild(span);
    });
  }

  return [...wordmark.querySelectorAll('.catrich-wordmark__char')];
}

function resetCharacterMotion(brand) {
  decorateBrand(brand).forEach((character) => {
    character.style.removeProperty('--catrich-char-x');
    character.style.removeProperty('--catrich-char-y');
    character.style.removeProperty('--catrich-char-z');
    character.style.removeProperty('--catrich-char-rotate');
    character.style.removeProperty('--catrich-char-scale');
  });
}

function resetBrand(brand) {
  brand.style.removeProperty('--brian-brand-x');
  brand.style.removeProperty('--brian-brand-y');
  brand.style.removeProperty('--brian-brand-rotate-x');
  brand.style.removeProperty('--brian-brand-rotate-y');
  brand.style.removeProperty('--brian-brand-scale');
  brand.style.removeProperty('--brian-brand-glow-x');
  brand.style.removeProperty('--brian-brand-glow-y');
  brand.style.removeProperty('--catrich-pointer-x');
  brand.classList.remove('is-magnetized');
  resetCharacterMotion(brand);
}

function installBrandInteraction(brand) {
  if (!brand || brand.dataset.brianMagneticBrand === 'ready') return null;
  brand.dataset.brianMagneticBrand = 'ready';
  decorateBrand(brand);

  const pointerFine = window.matchMedia(POINTER_FINE_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

  const onPointerMove = (event) => {
    if (!pointerFine.matches || reducedMotion.matches) return;

    const rect = brand.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const normalizedX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const normalizedY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const centeredX = normalizedX * 2 - 1;
    const centeredY = normalizedY * 2 - 1;

    window.cancelAnimationFrame(scheduledFrame);
    scheduledFrame = window.requestAnimationFrame(() => {
      brand.style.setProperty('--brian-brand-x', `${(centeredX * MAX_TRANSLATE).toFixed(2)}px`);
      brand.style.setProperty('--brian-brand-y', `${(centeredY * MAX_TRANSLATE * 0.72).toFixed(2)}px`);
      brand.style.setProperty('--brian-brand-rotate-x', `${(-centeredY * MAX_TILT).toFixed(2)}deg`);
      brand.style.setProperty('--brian-brand-rotate-y', `${(centeredX * MAX_TILT).toFixed(2)}deg`);
      brand.style.setProperty('--brian-brand-scale', String(BRAND_SCALE));
      brand.style.setProperty('--brian-brand-glow-x', `${(normalizedX * 100).toFixed(1)}%`);
      brand.style.setProperty('--brian-brand-glow-y', `${(normalizedY * 100).toFixed(1)}%`);
      brand.style.setProperty('--catrich-pointer-x', String(normalizedX));
      brand.classList.add('is-magnetized');

      const characters = decorateBrand(brand);
      const characterCount = Math.max(characters.length, 1);
      characters.forEach((character, index) => {
        const letterCenter = (index + 0.5) / characterCount;
        const proximity = clamp(1 - Math.abs(normalizedX - letterCenter) * 3.4, 0, 1);
        const wave = Math.sin((normalizedX - letterCenter) * Math.PI * 2.2);
        const charX = centeredX * (1.6 + proximity * 2.6) + wave * 1.4;
        const charY = centeredY * 2.2 - proximity * 3.8;
        const charZ = 8 + proximity * 28;
        const charRotate = wave * 3.4 + centeredX * (letterCenter - 0.5) * 7;
        const charScale = 1 + proximity * 0.055;

        character.style.setProperty('--catrich-char-x', `${charX.toFixed(2)}px`);
        character.style.setProperty('--catrich-char-y', `${charY.toFixed(2)}px`);
        character.style.setProperty('--catrich-char-z', `${charZ.toFixed(2)}px`);
        character.style.setProperty('--catrich-char-rotate', `${charRotate.toFixed(2)}deg`);
        character.style.setProperty('--catrich-char-scale', charScale.toFixed(3));
      });
    });
  };

  const onPointerEnter = (event) => {
    if (!pointerFine.matches || reducedMotion.matches) return;
    brand.classList.add('is-magnetized');
    onPointerMove(event);
  };

  const onPointerLeave = () => {
    window.cancelAnimationFrame(scheduledFrame);
    resetBrand(brand);
  };

  const onPreferenceChange = () => {
    if (!pointerFine.matches || reducedMotion.matches) resetBrand(brand);
  };

  brand.addEventListener('pointerenter', onPointerEnter);
  brand.addEventListener('pointermove', onPointerMove);
  brand.addEventListener('pointerleave', onPointerLeave);
  brand.addEventListener('pointercancel', onPointerLeave);
  pointerFine.addEventListener?.('change', onPreferenceChange);
  reducedMotion.addEventListener?.('change', onPreferenceChange);

  return () => {
    window.cancelAnimationFrame(scheduledFrame);
    brand.removeEventListener('pointerenter', onPointerEnter);
    brand.removeEventListener('pointermove', onPointerMove);
    brand.removeEventListener('pointerleave', onPointerLeave);
    brand.removeEventListener('pointercancel', onPointerLeave);
    pointerFine.removeEventListener?.('change', onPreferenceChange);
    reducedMotion.removeEventListener?.('change', onPreferenceChange);
    delete brand.dataset.brianMagneticBrand;
    resetBrand(brand);
  };
}

function connectBrand() {
  const brand = document.querySelector(BRAND_SELECTOR);
  if (!brand) return;

  decorateBrand(brand);
  if (brand.dataset.brianMagneticBrand === 'ready') return;

  cleanupActiveBrand?.();
  cleanupActiveBrand = installBrandInteraction(brand);
}

function installBrianBrandMagneticHover() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const start = () => {
    connectBrand();
    observer?.disconnect();
    observer = new MutationObserver(connectBrand);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

installBrianBrandMagneticHover();

export { installBrianBrandMagneticHover };
