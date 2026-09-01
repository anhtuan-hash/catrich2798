import welcomeBaseCss from './styles/FirstVisitWelcome.css?inline';
import welcomeMotionCss from './styles/FirstVisitWelcomeMotion.css?inline';
import welcomeTuneCss from './styles/FirstVisitWelcomeVisibilityTune.css?inline';
import welcomeAmbientCss from './styles/FirstVisitWelcomeAmbient.css?inline';

const WELCOME_SEEN_KEY = 'bes-first-visit-welcome-v1';
const WELCOME_VERSION = '1';
const WELCOME_ROOT_ID = 'brian-first-visit-welcome';
const WELCOME_PREVIEW_PARAM = 'welcome';
const WELCOME_MOTION_PARAM = 'motion';
const SHELL_WAIT_MS = 20000;
const WELCOME_EXIT_MS = 700;
const WELCOME_DISMISS_MS = 240;

let activeCleanup = null;

function getWelcomeQueryParams() {
  try {
    return new URLSearchParams(window.location.search || '');
  } catch {
    return new URLSearchParams();
  }
}

function isWelcomePreviewRequested() {
  const params = getWelcomeQueryParams();
  return params.get(WELCOME_PREVIEW_PARAM) === 'preview';
}

function isFullMotionRequested() {
  const params = getWelcomeQueryParams();
  return params.get(WELCOME_MOTION_PARAM) === 'full';
}

function hasSeenWelcome() {
  if (isWelcomePreviewRequested()) return false;
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === WELCOME_VERSION;
  } catch {
    return false;
  }
}

function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, WELCOME_VERSION);
  } catch {
    // Storage can be unavailable in hardened/private browser modes.
  }
}

function isProtectedEntryRoute() {
  const href = String(window.location.href || '');
  const hash = String(window.location.hash || '').toLowerCase();
  return /type=recovery|recovery=1/i.test(href)
    || /^#\/(?:login|register|setup)(?:[/?#]|$)/i.test(hash)
    || /(?:^|[?&])recovery(?:=|&|$)/i.test(hash);
}

function welcomeMarkup() {
  return `
    <div class="brian-welcome-backdrop" data-welcome-backdrop>
      <section
        class="brian-welcome-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="brian-welcome-title"
        aria-describedby="brian-welcome-description"
      >
        <div class="brian-welcome-sky" aria-hidden="true">
          <div class="brian-welcome-depth brian-welcome-depth-far">
            <span class="brian-welcome-cloud cloud-far"></span>
            <span class="brian-welcome-star star-a"></span>
            <span class="brian-welcome-star star-b"></span>
            <span class="brian-welcome-star star-c"></span>
            <span class="brian-welcome-star star-d"></span>
            <span class="brian-welcome-star star-e"></span>
            <span class="brian-welcome-shooting-star"></span>
            <span class="brian-welcome-moon-halo"></span>
            <span class="brian-welcome-moon"></span>
          </div>
          <div class="brian-welcome-depth brian-welcome-depth-mid-sky">
            <span class="brian-welcome-cloud cloud-near"></span>
          </div>
          <span class="brian-welcome-beam"></span>
          <div class="brian-welcome-light-particles">
            <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
          <div class="brian-welcome-ocean-layer">
            <span class="brian-welcome-horizon"></span>
            <div class="brian-welcome-sea-reflection">
              <span class="brian-welcome-reflection-core"></span>
              <span class="brian-welcome-reflection-ripple ripple-a"></span>
              <span class="brian-welcome-reflection-ripple ripple-b"></span>
              <span class="brian-welcome-reflection-ripple ripple-c"></span>
            </div>
            <span class="brian-welcome-wave wave-a"></span>
            <span class="brian-welcome-wave wave-b"></span>
            <span class="brian-welcome-wave wave-c"></span>
          </div>
          <div class="brian-welcome-lighthouse-layer">
            <div class="brian-welcome-lighthouse">
              <span class="brian-welcome-lighthouse-glow"></span>
              <span class="brian-welcome-lighthouse-roof"></span>
              <span class="brian-welcome-lighthouse-lantern"></span>
              <span class="brian-welcome-lighthouse-deck"></span>
              <span class="brian-welcome-lighthouse-tower"></span>
              <span class="brian-welcome-lighthouse-door"></span>
              <span class="brian-welcome-cliff"></span>
            </div>
          </div>
        </div>

        <div class="brian-welcome-vignette" aria-hidden="true"></div>
        <span class="brian-welcome-start-flash" aria-hidden="true"></span>

        <header class="brian-welcome-header">
          <div class="brian-welcome-brand">
            <span class="brian-welcome-brand-mark">B</span>
            <span>Brian English</span>
          </div>
          <button class="brian-welcome-close" type="button" aria-label="Đóng màn hình chào mừng" data-welcome-action="close">×</button>
        </header>

        <div class="brian-welcome-copy">
          <p class="brian-welcome-eyebrow">WELCOME · BRIAN ENGLISH</p>
          <h1 id="brian-welcome-title">Bạn đã sẵn sàng chưa?</h1>
          <p id="brian-welcome-description">
            Hãy cùng Brian English mở ra một hành trình học tập và giảng dạy tiếng Anh hiện đại, hiệu quả và đầy cảm hứng.
          </p>
        </div>

        <div class="brian-welcome-features" aria-label="Điểm nổi bật">
          <article data-welcome-feature="0">
            <span aria-hidden="true">↗</span>
            <strong>Dễ sử dụng</strong>
            <small>Mọi công cụ ở đúng nơi bạn cần.</small>
          </article>
          <article data-welcome-feature="1">
            <span aria-hidden="true">◇</span>
            <strong>An toàn</strong>
            <small>Trải nghiệm ổn định và đáng tin cậy.</small>
          </article>
          <article data-welcome-feature="2">
            <span aria-hidden="true">◎</span>
            <strong>Hiệu quả</strong>
            <small>Tập trung vào việc dạy và học tốt hơn.</small>
          </article>
          <article data-welcome-feature="3">
            <span aria-hidden="true">✦</span>
            <strong>Cùng đồng hành</strong>
            <small>Kết nối, chia sẻ và phát triển mỗi ngày.</small>
          </article>
        </div>

        <footer class="brian-welcome-actions">
          <button class="brian-welcome-primary" type="button" data-welcome-action="start">
            Bắt đầu ngay <span aria-hidden="true">→</span>
          </button>
          <button class="brian-welcome-secondary" type="button" data-welcome-action="later">Khám phá sau</button>
          <div class="brian-welcome-progress" aria-hidden="true">
            <i class="is-active"></i><i></i><i></i><i></i><i></i>
          </div>
        </footer>
      </section>
    </div>
  `;
}

function escapeStyleText(value) {
  return String(value || '').replace(/<\/style/gi, '<\\/style');
}

function welcomeFrameDocument(forceFullMotion) {
  const css = [welcomeBaseCss, welcomeMotionCss, welcomeTuneCss, welcomeAmbientCss]
    .map(escapeStyleText)
    .join('\n');
  const motionClass = forceFullMotion ? ' is-motion-forced' : '';
  const motionData = forceFullMotion ? ' data-welcome-motion="full"' : '';
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <style>
    html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;color-scheme:dark}
    body{font-family:Arial,Helvetica,sans-serif}
    ${css}
  </style>
</head>
<body>
  <div class="brian-welcome-root is-visible${motionClass}"${motionData}>
    ${welcomeMarkup()}
  </div>
</body>
</html>`;
}

function styleIsolatedFrame(frame) {
  const important = (property, value) => frame.style.setProperty(property, value, 'important');
  important('position', 'fixed');
  important('inset', '0');
  important('width', '100vw');
  important('height', '100dvh');
  important('max-width', 'none');
  important('max-height', 'none');
  important('margin', '0');
  important('padding', '0');
  important('border', '0');
  important('border-radius', '0');
  important('background', 'transparent');
  important('z-index', '2147483000');
  important('display', 'block');
  important('opacity', '1');
  important('visibility', 'visible');
  important('pointer-events', 'auto');
  important('transform', 'none');
  important('animation', 'none');
  important('transition', 'none');
  frame.style.colorScheme = 'dark';
}

function mountWelcome() {
  if (hasSeenWelcome() || isProtectedEntryRoute() || document.getElementById(WELCOME_ROOT_ID)) return;
  if (!document.body) return;

  const forceFullMotion = isFullMotionRequested();
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousOverflow = document.body.style.overflow;
  const frame = document.createElement('iframe');
  frame.id = WELCOME_ROOT_ID;
  frame.title = 'Chào mừng đến với Brian English';
  frame.setAttribute('aria-label', 'Chào mừng đến với Brian English');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('data-brian-welcome-isolated', 'true');
  frame.srcdoc = welcomeFrameDocument(forceFullMotion);
  styleIsolatedFrame(frame);

  let initialized = false;
  let closing = false;
  let root = null;
  let frameDocument = null;
  let frameWindow = null;
  let card = null;
  let beam = null;
  let reflection = null;
  let primaryCta = null;
  let featureCards = [];
  let pointerFrame = 0;
  let pendingPointer = null;
  let activeFeature = null;
  let ctaPointerFrame = 0;
  let pendingCtaPointer = null;
  let cleanupTimer = 0;
  let reducedMotion = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const requestFrame = (callback) => (frameWindow?.requestAnimationFrame || window.requestAnimationFrame).call(frameWindow || window, callback);
  const cancelFrame = (id) => (frameWindow?.cancelAnimationFrame || window.cancelAnimationFrame).call(frameWindow || window, id);

  function setSceneParallax(pointer, rect) {
    if (!card || !pointer || reducedMotion) return;
    const normalizedX = clamp(((pointer.x - rect.left) / rect.width - 0.5) * 2, -1, 1);
    const normalizedY = clamp(((pointer.y - rect.top) / rect.height - 0.5) * 2, -1, 1);
    const x = normalizedX * 13;
    const y = normalizedY * 9;
    card.style.setProperty('--welcome-parallax-x', `${x.toFixed(2)}px`);
    card.style.setProperty('--welcome-parallax-y', `${y.toFixed(2)}px`);
    card.style.setProperty('--welcome-parallax-far-x', `${(x * 0.34).toFixed(2)}px`);
    card.style.setProperty('--welcome-parallax-far-y', `${(y * 0.34).toFixed(2)}px`);
    card.style.setProperty('--welcome-parallax-mid-x', `${(x * 0.68).toFixed(2)}px`);
    card.style.setProperty('--welcome-parallax-mid-y', `${(y * 0.68).toFixed(2)}px`);
    card.style.setProperty('--welcome-parallax-near-x', `${x.toFixed(2)}px`);
    card.style.setProperty('--welcome-parallax-near-y', `${y.toFixed(2)}px`);
  }

  function resetSceneParallax() {
    if (!card) return;
    [
      '--welcome-parallax-x', '--welcome-parallax-y',
      '--welcome-parallax-far-x', '--welcome-parallax-far-y',
      '--welcome-parallax-mid-x', '--welcome-parallax-mid-y',
      '--welcome-parallax-near-x', '--welcome-parallax-near-y',
    ].forEach((property) => card.style.removeProperty(property));
  }

  function applyPointerBeam() {
    pointerFrame = 0;
    if (!pendingPointer || !card || !beam || closing || reducedMotion) return;
    const rect = card.getBoundingClientRect();
    setSceneParallax(pendingPointer, rect);

    let targetX = pendingPointer.x;
    let targetY = pendingPointer.y;
    if (activeFeature?.isConnected) {
      const featureRect = activeFeature.getBoundingClientRect();
      targetX = featureRect.left + featureRect.width * 0.5;
      targetY = featureRect.top + featureRect.height * 0.44;
    }

    const originX = rect.left + rect.width * 0.885;
    const originY = rect.top + rect.height * 0.42;
    const dx = targetX - originX;
    const dy = targetY - originY;
    const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI - 180;
    const normalizedAngle = rawAngle < -180 ? rawAngle + 360 : rawAngle;
    const angle = clamp(normalizedAngle, -16, 9);
    const distance = Math.hypot(dx, dy);
    const scale = clamp(distance / (rect.width * 0.52), 0.82, 1.12);
    const opacity = clamp(0.8 + scale * 0.14, 0.88, 0.98);
    const waterInfluence = clamp((-angle + 9) / 25, 0, 1);
    const reflectionX = clamp(angle * 1.45, -24, 14);
    const reflectionOpacity = clamp(0.34 + waterInfluence * 0.46 + (scale - 0.82) * 0.18, 0.38, 0.88);
    const reflectionScale = clamp(0.9 + waterInfluence * 0.16 + (scale - 1) * 0.16, 0.88, 1.12);
    const reflectionTilt = clamp(angle * 0.12, -2.2, 1.4);

    card.classList.add('is-beam-tracking');
    beam.style.setProperty('--welcome-beam-angle', `${angle.toFixed(2)}deg`);
    beam.style.setProperty('--welcome-beam-scale', scale.toFixed(3));
    beam.style.setProperty('--welcome-beam-opacity', opacity.toFixed(3));
    reflection?.style.setProperty('--welcome-reflection-x', `${reflectionX.toFixed(2)}px`);
    reflection?.style.setProperty('--welcome-reflection-opacity', reflectionOpacity.toFixed(3));
    reflection?.style.setProperty('--welcome-reflection-scale', reflectionScale.toFixed(3));
    reflection?.style.setProperty('--welcome-reflection-tilt', `${reflectionTilt.toFixed(2)}deg`);
    pendingPointer = null;
  }

  function onPointerMove(event) {
    if (reducedMotion || !card || !beam) return;
    pendingPointer = { x: event.clientX, y: event.clientY };
    if (!pointerFrame) pointerFrame = requestFrame(applyPointerBeam);
  }

  function onPointerLeave() {
    pendingPointer = null;
    activeFeature = null;
    if (pointerFrame) {
      cancelFrame(pointerFrame);
      pointerFrame = 0;
    }
    featureCards.forEach((feature) => feature.classList.remove('is-feature-lit'));
    card?.classList.remove('is-beam-tracking');
    beam?.style.removeProperty('--welcome-beam-angle');
    beam?.style.removeProperty('--welcome-beam-scale');
    beam?.style.removeProperty('--welcome-beam-opacity');
    reflection?.style.removeProperty('--welcome-reflection-x');
    reflection?.style.removeProperty('--welcome-reflection-opacity');
    reflection?.style.removeProperty('--welcome-reflection-scale');
    reflection?.style.removeProperty('--welcome-reflection-tilt');
    resetSceneParallax();
  }

  function onFeatureEnter(event) {
    const feature = event.currentTarget;
    if (!feature?.classList) return;
    activeFeature = feature;
    featureCards.forEach((item) => item.classList.toggle('is-feature-lit', item === feature));
    if (reducedMotion || !card) return;
    const featureRect = feature.getBoundingClientRect();
    pendingPointer = {
      x: featureRect.left + featureRect.width * 0.5,
      y: featureRect.top + featureRect.height * 0.44,
    };
    if (!pointerFrame) pointerFrame = requestFrame(applyPointerBeam);
  }

  function onFeatureLeave(event) {
    const feature = event.currentTarget;
    feature?.classList?.remove('is-feature-lit');
    if (activeFeature === feature) activeFeature = null;
    if (!reducedMotion && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      pendingPointer = { x: event.clientX, y: event.clientY };
      if (!pointerFrame) pointerFrame = requestFrame(applyPointerBeam);
    }
  }

  function applyCtaMagnet() {
    ctaPointerFrame = 0;
    if (!primaryCta || !pendingCtaPointer || reducedMotion || closing) return;
    const rect = primaryCta.getBoundingClientRect();
    const normalizedX = clamp((pendingCtaPointer.x - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1);
    const normalizedY = clamp((pendingCtaPointer.y - (rect.top + rect.height / 2)) / (rect.height / 2), -1, 1);
    primaryCta.style.setProperty('--welcome-cta-x', `${(normalizedX * 4).toFixed(2)}px`);
    primaryCta.style.setProperty('--welcome-cta-y', `${(normalizedY * 3).toFixed(2)}px`);
    card?.classList.add('is-cta-magnetic');
    pendingCtaPointer = null;
  }

  function onCtaPointerMove(event) {
    if (reducedMotion) return;
    pendingCtaPointer = { x: event.clientX, y: event.clientY };
    if (!ctaPointerFrame) ctaPointerFrame = requestFrame(applyCtaMagnet);
  }

  function resetCtaMagnet() {
    pendingCtaPointer = null;
    if (ctaPointerFrame) {
      cancelFrame(ctaPointerFrame);
      ctaPointerFrame = 0;
    }
    primaryCta?.style.removeProperty('--welcome-cta-x');
    primaryCta?.style.removeProperty('--welcome-cta-y');
    card?.classList.remove('is-cta-magnetic');
  }

  function focusableElements() {
    if (!frameDocument) return [];
    return Array.from(frameDocument.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'));
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismissWelcome('escape');
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = focusableElements();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = frameDocument?.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onVisibilityChange() {
    root?.classList.toggle('is-motion-paused', document.hidden);
  }

  function onStorage(event) {
    if (event.key === WELCOME_SEEN_KEY && event.newValue === WELCOME_VERSION) {
      dismissWelcome('storage', { persist: false, immediate: true });
    }
  }

  function finishCleanup() {
    if (cleanupTimer) {
      window.clearTimeout(cleanupTimer);
      cleanupTimer = 0;
    }
    if (pointerFrame) cancelFrame(pointerFrame);
    if (ctaPointerFrame) cancelFrame(ctaPointerFrame);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('storage', onStorage);
    frameDocument?.removeEventListener('keydown', onKeyDown);
    card?.removeEventListener('pointermove', onPointerMove);
    card?.removeEventListener('pointerleave', onPointerLeave);
    primaryCta?.removeEventListener('pointermove', onCtaPointerMove);
    primaryCta?.removeEventListener('pointerleave', resetCtaMagnet);
    featureCards.forEach((feature) => {
      feature.removeEventListener('pointerenter', onFeatureEnter);
      feature.removeEventListener('pointerleave', onFeatureLeave);
    });
    frame.remove();
    document.body.style.overflow = previousOverflow;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    if (activeCleanup === finishCleanup) activeCleanup = null;
  }

  function dismissWelcome(reason, options = {}) {
    if (closing) return;
    closing = true;
    const { persist = true, immediate = false } = options;
    if (persist) markWelcomeSeen();
    resetCtaMagnet();
    onPointerLeave();

    const startTransition = reason === 'start';
    if (startTransition) root?.classList.add('is-starting');
    else root?.classList.add('is-leaving');

    window.dispatchEvent(new CustomEvent('bes-first-visit-welcome-dismissed', {
      detail: { reason, isolated: true },
    }));

    const delay = immediate ? 0 : (startTransition ? WELCOME_EXIT_MS : WELCOME_DISMISS_MS);
    cleanupTimer = window.setTimeout(finishCleanup, delay);
  }

  function initializeFrame() {
    if (initialized) return;
    frameDocument = frame.contentDocument;
    frameWindow = frame.contentWindow;
    if (!frameDocument || !frameWindow) {
      finishCleanup();
      return;
    }

    root = frameDocument.querySelector('.brian-welcome-root');
    card = frameDocument.querySelector('.brian-welcome-card');
    beam = frameDocument.querySelector('.brian-welcome-beam');
    reflection = frameDocument.querySelector('.brian-welcome-sea-reflection');
    primaryCta = frameDocument.querySelector('.brian-welcome-primary');
    featureCards = Array.from(frameDocument.querySelectorAll('[data-welcome-feature]'));
    const frameMatchMedia = typeof frameWindow.matchMedia === 'function'
      ? frameWindow.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    reducedMotion = !forceFullMotion && Boolean(frameMatchMedia?.matches);

    if (!root || !card || !beam || !primaryCta) {
      finishCleanup();
      return;
    }
    initialized = true;

    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerleave', onPointerLeave);
    primaryCta.addEventListener('pointermove', onCtaPointerMove);
    primaryCta.addEventListener('pointerleave', resetCtaMagnet);
    featureCards.forEach((feature) => {
      feature.addEventListener('pointerenter', onFeatureEnter);
      feature.addEventListener('pointerleave', onFeatureLeave);
    });
    frameDocument.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('storage', onStorage);

    frameDocument.querySelectorAll('[data-welcome-action]').forEach((button) => {
      button.addEventListener('click', () => dismissWelcome(button.dataset.welcomeAction || 'close'));
    });
    frameDocument.querySelector('[data-welcome-backdrop]')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) dismissWelcome('backdrop');
    });

    onVisibilityChange();
    frameWindow.focus();
    window.setTimeout(() => primaryCta?.focus({ preventScroll: true }), 40);
    window.dispatchEvent(new CustomEvent('bes-first-visit-welcome-shown', {
      detail: { isolated: true, motion: forceFullMotion ? 'full' : (reducedMotion ? 'reduced' : 'auto') },
    }));
  }

  frame.addEventListener('load', initializeFrame, { once: true });
  document.body.style.overflow = 'hidden';
  document.body.appendChild(frame);
  activeCleanup = finishCleanup;
}

function waitForApplicationShell() {
  const startedAt = Date.now();
  const tick = () => {
    if (hasSeenWelcome() || isProtectedEntryRoute() || document.getElementById(WELCOME_ROOT_ID)) return;
    if (document.querySelector('#root .app-shell')) {
      window.setTimeout(mountWelcome, 180);
      return;
    }
    if (Date.now() - startedAt < SHELL_WAIT_MS) window.setTimeout(tick, 180);
  };
  tick();
}

export function installFirstVisitWelcome() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (activeCleanup || document.getElementById(WELCOME_ROOT_ID)) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForApplicationShell, { once: true });
  } else {
    waitForApplicationShell();
  }
}