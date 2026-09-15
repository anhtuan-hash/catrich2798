import './components/GlobalNavigationStarEffect.css';

const RUNTIME_FLAG = '__BES_NAV_STAR_EFFECT_V1__';
const PRIMARY_NAV_SELECTOR = '.brian-nav__primary > button';
const PRIMARY_NAV_CONTAINER_SELECTOR = '.brian-nav__primary';
const NAV_LABEL_KEYS = new Map([
  ['Trang chủ', 'home'],
  ['Home', 'home'],
  ['Ứng dụng', 'apps'],
  ['Apps', 'apps'],
]);
const NAV_CLASS_KEYS = [
  ['brian-nav__dashboard-tab', 'dashboard'],
  ['brian-nav__homeroom-tab', 'homeroom'],
  ['brian-nav__gradebook-tab', 'gradebook'],
  ['brian-nav__reports-tab', 'reports'],
  ['brian-nav__ttcm-tab', 'ttcm'],
  ['brian-nav__attendance-tab', 'attendance'],
];
const bindings = new Map();
let scanFrame = 0;
let rootObserver = null;

function resolveNavKey(button) {
  const existing = String(button.dataset.navKey || '').trim();
  if (existing) return existing;

  for (const [className, key] of NAV_CLASS_KEYS) {
    if (button.classList.contains(className)) return key;
  }

  const label = String(button.textContent || '').trim();
  return NAV_LABEL_KEYS.get(label) || 'nav';
}

function centerEffect(button, energy = .18) {
  const x = Math.max(0, button.offsetWidth / 2);
  const y = Math.max(0, button.offsetHeight / 2);
  button.style.setProperty('--star-x', `${x}px`);
  button.style.setProperty('--star-y', `${y}px`);
  button.style.setProperty('--star-energy', String(energy));
}

function createNavStarEffect(button, key) {
  const effect = document.createElement('span');
  effect.className = 'brian-nav-star-effect';
  effect.dataset.navStarEffect = key;
  effect.setAttribute('aria-hidden', 'true');

  const aura = document.createElement('span');
  aura.className = 'brian-nav-star-effect__aura';

  const sparkleOne = document.createElement('span');
  sparkleOne.className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--one';

  const sparkleTwo = document.createElement('span');
  sparkleTwo.className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--two';

  const sparkleThree = document.createElement('span');
  sparkleThree.className = 'brian-nav-star-effect__sparkle brian-nav-star-effect__sparkle--three';

  effect.append(aura, sparkleOne, sparkleTwo, sparkleThree);
  button.appendChild(effect);
  return effect;
}

function releaseButton(button) {
  const binding = bindings.get(button);
  if (!binding) return;

  button.removeEventListener('pointerenter', binding.onPointerEnter);
  button.removeEventListener('pointermove', binding.onStarPointerMove);
  button.removeEventListener('pointerleave', binding.onLeave);
  button.removeEventListener('pointercancel', binding.onLeave);
  button.removeEventListener('focus', binding.onFocus);
  button.removeEventListener('blur', binding.onLeave);
  button.removeEventListener('pointerdown', binding.onPointerDown);
  button.removeEventListener('pointerup', binding.onPointerUp);

  binding.effect.remove();
  button.removeAttribute('data-brian-star-fx');
  button.removeAttribute('data-star-active');
  button.style.removeProperty('--star-x');
  button.style.removeProperty('--star-y');
  button.style.removeProperty('--star-energy');
  bindings.delete(button);
}

function bindButton(button) {
  if (!(button instanceof HTMLButtonElement) || bindings.has(button)) return;

  const key = resolveNavKey(button);
  const effect = createNavStarEffect(button, key);
  button.dataset.brianStarFx = 'true';
  centerEffect(button);

  let lastX = button.offsetWidth / 2;
  let lastY = button.offsetHeight / 2;
  let lastAt = performance.now();

  const setActive = (active) => {
    if (active) button.dataset.starActive = 'true';
    else button.removeAttribute('data-star-active');
  };

  const onStarPointerMove = (event) => {
    const rect = button.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const now = performance.now();
    const elapsed = Math.max(8, now - lastAt);
    const distance = Math.hypot(x - lastX, y - lastY);
    const speed = distance / elapsed;
    const energy = Math.min(1, .58 + speed * .42);

    button.style.setProperty('--star-x', `${x}px`);
    button.style.setProperty('--star-y', `${y}px`);
    button.style.setProperty('--star-energy', String(energy));
    setActive(true);

    lastX = x;
    lastY = y;
    lastAt = now;
  };

  const onPointerEnter = (event) => {
    setActive(true);
    button.style.setProperty('--star-energy', String(.72));
    onStarPointerMove(event);
  };

  const onFocus = () => {
    setActive(true);
    centerEffect(button, .78);
  };

  const onLeave = () => {
    setActive(false);
    centerEffect(button, .18);
    lastX = button.offsetWidth / 2;
    lastY = button.offsetHeight / 2;
    lastAt = performance.now();
  };

  const onPointerDown = () => {
    setActive(true);
    button.style.setProperty('--star-energy', String(1));
  };

  const onPointerUp = () => {
    button.style.setProperty('--star-energy', String(button.matches(':hover') ? .76 : .28));
  };

  button.addEventListener('pointerenter', onPointerEnter);
  button.addEventListener('pointermove', onStarPointerMove);
  button.addEventListener('pointerleave', onLeave);
  button.addEventListener('pointercancel', onLeave);
  button.addEventListener('focus', onFocus);
  button.addEventListener('blur', onLeave);
  button.addEventListener('pointerdown', onPointerDown);
  button.addEventListener('pointerup', onPointerUp);

  bindings.set(button, {
    effect,
    onPointerEnter,
    onStarPointerMove,
    onLeave,
    onFocus,
    onPointerDown,
    onPointerUp,
  });
}

function scanNavigation() {
  scanFrame = 0;

  for (const button of bindings.keys()) {
    if (!button.isConnected || !button.matches(PRIMARY_NAV_SELECTOR)) releaseButton(button);
  }

  document.querySelectorAll(PRIMARY_NAV_SELECTOR).forEach(bindButton);
}

function scheduleScan() {
  if (scanFrame) return;
  scanFrame = window.requestAnimationFrame(scanNavigation);
}

function isNavigationMutationNode(node) {
  if (!(node instanceof Element)) return false;
  if (node.matches(PRIMARY_NAV_CONTAINER_SELECTOR) || node.matches(PRIMARY_NAV_SELECTOR)) return true;
  return Boolean(node.querySelector(PRIMARY_NAV_CONTAINER_SELECTOR) || node.querySelector(PRIMARY_NAV_SELECTOR));
}

function shouldRescanNavigation(mutations) {
  return mutations.some((mutation) => {
    const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
    return changedNodes.some(isNavigationMutationNode);
  });
}

function installNavigationStarEffect() {
  if (typeof window === 'undefined' || window[RUNTIME_FLAG]) return;
  window[RUNTIME_FLAG] = true;

  const start = () => {
    scanNavigation();
    const root = document.getElementById('root') || document.body;
    if (root && typeof MutationObserver !== 'undefined') {
      rootObserver = new MutationObserver((mutations) => {
        if (shouldRescanNavigation(mutations)) scheduleScan();
      });
      rootObserver.observe(root, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.addEventListener('hashchange', scheduleScan);
  window.addEventListener('bes-route-change', scheduleScan);
  window.addEventListener('bes-editorial-refresh', scheduleScan);
  window.addEventListener('resize', scheduleScan, { passive: true });
}

installNavigationStarEffect();

export { installNavigationStarEffect };
