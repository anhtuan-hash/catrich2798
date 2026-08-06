import './components/GlobalBrianBrandMagneticHover.css';

const BRAND_SELECTOR = '.brian-nav__brand';
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

function resetBrand(brand) {
  brand.style.removeProperty('--brian-brand-x');
  brand.style.removeProperty('--brian-brand-y');
  brand.style.removeProperty('--brian-brand-rotate-x');
  brand.style.removeProperty('--brian-brand-rotate-y');
  brand.style.removeProperty('--brian-brand-scale');
  brand.style.removeProperty('--brian-brand-glow-x');
  brand.style.removeProperty('--brian-brand-glow-y');
  brand.classList.remove('is-magnetized');
}

function installBrandInteraction(brand) {
  if (!brand || brand.dataset.brianMagneticBrand === 'ready') return null;
  brand.dataset.brianMagneticBrand = 'ready';

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
      brand.classList.add('is-magnetized');
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
  if (!brand || brand.dataset.brianMagneticBrand === 'ready') return;
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
