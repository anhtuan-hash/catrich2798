import '../styles/anime-motion-v1168.css';

const ANIME_ESM_URL = 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm';
const INTERACTIVE_SELECTOR = 'button:not([disabled]), [role="button"], a[href], .boh-card';
const FEEDBACK_SELECTOR = '.toast, .notification-toast, .success-toast, .error-toast, [role="alert"], [role="status"]';

let animeModulePromise = null;
let runtimeInstalled = false;
let routeAnimations = [];
let scheduleFrame = 0;
let scheduleFrameTwo = 0;

function getMotionTier() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'off';
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'off';

  const shell = document.querySelector('.metro-clean-system');
  const performance = shell?.dataset.performance || document.documentElement.dataset.performance;
  if (performance === 'low') return 'off';

  return shell?.dataset.motion || document.documentElement.dataset.motion || 'lite';
}

function canAnimate() {
  return getMotionTier() !== 'off';
}

function rememberAnimation(animation) {
  if (animation && typeof animation.cancel === 'function') routeAnimations.push(animation);
  return animation;
}

function cancelRouteAnimations() {
  routeAnimations.forEach((animation) => {
    try { animation.cancel(); } catch { /* animation already completed */ }
  });
  routeAnimations = [];
}

function loadAnimeModule() {
  if (animeModulePromise) return animeModulePromise;
  if (typeof window === 'undefined' || !navigator.onLine || !canAnimate()) return Promise.resolve(null);

  animeModulePromise = import(/* @vite-ignore */ ANIME_ESM_URL)
    .then((module) => {
      if (typeof module?.animate !== 'function' || typeof module?.stagger !== 'function') return null;
      document.documentElement.dataset.animeMotion = 'animejs-4.5.0';
      return module;
    })
    .catch(() => {
      document.documentElement.dataset.animeMotion = 'fallback';
      return null;
    });

  return animeModulePromise;
}

async function resolveAnimeQuickly(timeoutMs = 160) {
  const timeout = new Promise((resolve) => window.setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([loadAnimeModule(), timeout]);
}

function uniqueVisibleElements(root, selector, limit = 40) {
  if (!root) return [];
  const seen = new Set();
  const elements = [];

  root.querySelectorAll(selector).forEach((element) => {
    if (elements.length >= limit || seen.has(element)) return;
    if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return;
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    seen.add(element);
    elements.push(element);
  });

  return elements;
}

function fallbackEntrance(elements, {
  distance = 20,
  duration = 560,
  delayStep = 48,
  scaleFrom = 0.98,
} = {}) {
  elements.forEach((element, index) => {
    const animation = element.animate([
      { opacity: 0, transform: `translate3d(0, ${distance}px, 0) scale(${scaleFrom})` },
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
    ], {
      duration,
      delay: index * delayStep,
      easing: 'cubic-bezier(.16, 1, .3, 1)',
      fill: 'backwards',
    });
    rememberAnimation(animation);
  });
}

function animeEntrance(api, elements, {
  distance = 20,
  duration = 620,
  delayStep = 52,
  scaleFrom = 0.98,
} = {}) {
  const originalStyles = elements.map((element) => ({
    opacity: element.style.opacity,
    transform: element.style.transform,
  }));
  const animation = api.animate(elements, {
    opacity: { from: 0 },
    y: { from: distance },
    scale: { from: scaleFrom },
    duration,
    delay: api.stagger(delayStep),
    ease: 'outExpo',
    onComplete: () => {
      elements.forEach((element, index) => {
        element.style.opacity = originalStyles[index].opacity;
        element.style.transform = originalStyles[index].transform;
      });
    },
  });
  rememberAnimation(animation);
}

async function animateEntranceGroup(elements, options) {
  if (!elements.length || !canAnimate()) return;
  const api = await resolveAnimeQuickly();
  if (!elements.every((element) => element.isConnected)) return;

  try {
    if (api) animeEntrance(api, elements, options);
    else fallbackEntrance(elements, options);
  } catch {
    fallbackEntrance(elements, options);
  }
}

function genericRouteTargets(main) {
  const firstPage = main.firstElementChild;
  if (!firstPage) return [];

  const directSections = Array.from(firstPage.children).filter((element) => (
    element instanceof HTMLElement
    && !element.matches('script, style, template')
    && window.getComputedStyle(element).display !== 'none'
  ));

  if (directSections.length > 1) return directSections.slice(0, 18);

  return uniqueVisibleElements(
    main,
    '.page > section, .metro-panel, .panel, [class$="-panel"], [class$="-card"]',
    18,
  );
}

async function animateHome(main, tier) {
  const copyTargets = uniqueVisibleElements(
    main,
    '.boh-welcome, .boh-eyebrow, .boh-copy-panel h1, .boh-copy-panel h2, .boh-subtitle, .boh-actions, .boh-trust-row, .boh-overview',
    12,
  );
  const cardTargets = uniqueVisibleElements(main, '.boh-stage .boh-card-body', 10);
  const metricTargets = uniqueVisibleElements(main, '.boh-overview-metric', 6);
  const dashboardTargets = uniqueVisibleElements(main, '.boh-dashboard-heading, .boh-dashboard-shell, .boh-dashboard-login', 5);

  await animateEntranceGroup(copyTargets, {
    distance: tier === 'full' ? 24 : 14,
    duration: tier === 'full' ? 700 : 480,
    delayStep: tier === 'full' ? 62 : 38,
    scaleFrom: 0.99,
  });
  await animateEntranceGroup(cardTargets, {
    distance: tier === 'full' ? 30 : 16,
    duration: tier === 'full' ? 720 : 500,
    delayStep: tier === 'full' ? 68 : 42,
    scaleFrom: tier === 'full' ? 0.93 : 0.97,
  });
  await animateEntranceGroup(metricTargets, {
    distance: 12,
    duration: 460,
    delayStep: 70,
    scaleFrom: 0.94,
  });
  await animateEntranceGroup(dashboardTargets, {
    distance: 18,
    duration: 560,
    delayStep: 90,
    scaleFrom: 0.985,
  });
}

async function animateGenericRoute(main, tier) {
  const targets = genericRouteTargets(main);
  await animateEntranceGroup(targets, {
    distance: tier === 'full' ? 22 : 12,
    duration: tier === 'full' ? 620 : 420,
    delayStep: tier === 'full' ? 54 : 30,
    scaleFrom: tier === 'full' ? 0.975 : 0.99,
  });
}

async function animateCurrentRoute() {
  if (!canAnimate()) return;
  const main = document.querySelector('#bes-main-content');
  if (!main) return;

  const route = main.dataset.route || window.location.hash.replace(/^#\/?/, '') || 'home';
  const signature = `${route}:${window.location.hash}`;
  if (main.dataset.besAnimeEntered === signature) return;
  main.dataset.besAnimeEntered = signature;

  cancelRouteAnimations();
  const tier = getMotionTier();
  if (route === 'home') await animateHome(main, tier);
  else await animateGenericRoute(main, tier);
}

function scheduleRouteAnimation() {
  window.cancelAnimationFrame(scheduleFrame);
  window.cancelAnimationFrame(scheduleFrameTwo);
  scheduleFrame = window.requestAnimationFrame(() => {
    scheduleFrameTwo = window.requestAnimationFrame(() => {
      animateCurrentRoute().catch(() => { /* animation failure must never block navigation */ });
    });
  });
}

function createRipple(element, event) {
  if (!(element instanceof HTMLElement) || !canAnimate()) return;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const diameter = Math.max(rect.width, rect.height) * 1.25;
  const ripple = document.createElement('span');
  ripple.className = 'bes-anime-ripple';
  ripple.setAttribute('aria-hidden', 'true');
  ripple.style.width = `${diameter}px`;
  ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - rect.left - diameter / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - diameter / 2}px`;

  element.classList.add('bes-anime-ripple-host');
  element.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  window.setTimeout(() => ripple.remove(), 800);
}

function pressTargetFor(element) {
  if (!(element instanceof HTMLElement)) return null;
  if (element.classList.contains('boh-card')) return element.querySelector('.boh-card-body') || element;
  return element;
}

function animatePress(element) {
  const target = pressTargetFor(element);
  if (!(target instanceof HTMLElement) || !canAnimate()) return;

  loadAnimeModule().then((api) => {
    if (!target.isConnected) return;
    try {
      if (api) {
        const originalTransform = target.style.transform;
        api.animate(target, {
          scale: [
            { to: 0.975, duration: 90 },
            { to: 1, duration: 230 },
          ],
          ease: 'outBack',
          onComplete: () => { target.style.transform = originalTransform; },
        });
        return;
      }
    } catch { /* use Web Animations fallback */ }

    target.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(.975)', offset: 0.34 },
      { transform: 'scale(1)' },
    ], {
      duration: 300,
      easing: 'cubic-bezier(.16, 1, .3, 1)',
    });
  }).catch(() => { /* interaction remains functional without animation */ });
}

function handlePointerDown(event) {
  if (!(event.target instanceof Element) || event.button > 0) return;
  const element = event.target.closest(INTERACTIVE_SELECTOR);
  if (!(element instanceof HTMLElement) || !document.documentElement.contains(element)) return;
  if (element.matches('[aria-disabled="true"], [disabled]')) return;

  createRipple(element, event);
  animatePress(element);
}

function feedbackCandidates(node) {
  if (!(node instanceof Element)) return [];
  const results = [];
  if (node.matches(FEEDBACK_SELECTOR)) results.push(node);
  node.querySelectorAll(FEEDBACK_SELECTOR).forEach((element) => results.push(element));
  return results.slice(0, 8);
}

function animateFeedback(element) {
  if (!(element instanceof HTMLElement) || element.dataset.besAnimeFeedback === 'true' || !canAnimate()) return;
  element.dataset.besAnimeFeedback = 'true';
  const isError = element.matches('.error-toast, .is-error, [data-tone="error"]');

  loadAnimeModule().then((api) => {
    if (!element.isConnected) return;
    try {
      if (api) {
        const originalTransform = element.style.transform;
        const originalOpacity = element.style.opacity;
        const properties = isError ? {
          x: [
            { to: -7, duration: 55 },
            { to: 7, duration: 55 },
            { to: -4, duration: 55 },
            { to: 0, duration: 80 },
          ],
          ease: 'inOutQuad',
        } : {
          opacity: { from: 0 },
          x: { from: 28 },
          scale: { from: 0.96 },
          duration: 420,
          ease: 'outExpo',
        };
        api.animate(element, {
          ...properties,
          onComplete: () => {
            element.style.transform = originalTransform;
            element.style.opacity = originalOpacity;
          },
        });
        return;
      }
    } catch { /* use Web Animations fallback */ }

    element.animate(isError ? [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-7px)' },
      { transform: 'translateX(7px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(0)' },
    ] : [
      { opacity: 0, transform: 'translateX(28px) scale(.96)' },
      { opacity: 1, transform: 'translateX(0) scale(1)' },
    ], {
      duration: isError ? 300 : 420,
      easing: 'cubic-bezier(.16, 1, .3, 1)',
    });
  }).catch(() => { /* feedback stays visible without animation */ });
}

function handleMutations(mutations) {
  let routeChanged = false;

  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      feedbackCandidates(node).forEach(animateFeedback);
      if (node.id === 'bes-main-content' || node.parentElement?.id === 'bes-main-content' || node.querySelector?.('#bes-main-content')) {
        routeChanged = true;
      }
    });
  });

  if (routeChanged) scheduleRouteAnimation();
}

export function installBrianAnimeMotion() {
  if (runtimeInstalled || typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  runtimeInstalled = true;

  const observer = new MutationObserver(handleMutations);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('hashchange', scheduleRouteAnimation);
  window.addEventListener('online', loadAnimeModule);

  loadAnimeModule();
  scheduleRouteAnimation();

  return () => {
    runtimeInstalled = false;
    observer.disconnect();
    document.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('hashchange', scheduleRouteAnimation);
    window.removeEventListener('online', loadAnimeModule);
    window.cancelAnimationFrame(scheduleFrame);
    window.cancelAnimationFrame(scheduleFrameTwo);
    cancelRouteAnimations();
  };
}
