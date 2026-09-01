import './styles/FirstVisitWelcomeMotion.css';

const WELCOME_SEEN_KEY = 'bes-first-visit-welcome-v1';
const WELCOME_VERSION = '1';
const WELCOME_ROOT_ID = 'brian-first-visit-welcome';
const SHELL_WAIT_MS = 20000;

let activeCleanup = null;

function hasSeenWelcome() {
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
    // Storage can be unavailable in hardened/private browser modes. The dialog
    // still remains usable for the current page even when persistence fails.
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
          <span class="brian-welcome-star star-a"></span>
          <span class="brian-welcome-star star-b"></span>
          <span class="brian-welcome-star star-c"></span>
          <span class="brian-welcome-star star-d"></span>
          <span class="brian-welcome-star star-e"></span>
          <span class="brian-welcome-moon"></span>
          <span class="brian-welcome-beam"></span>
          <span class="brian-welcome-horizon"></span>
          <span class="brian-welcome-wave wave-a"></span>
          <span class="brian-welcome-wave wave-b"></span>
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

        <div class="brian-welcome-vignette" aria-hidden="true"></div>

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
          <article>
            <span aria-hidden="true">↗</span>
            <strong>Dễ sử dụng</strong>
            <small>Mọi công cụ ở đúng nơi bạn cần.</small>
          </article>
          <article>
            <span aria-hidden="true">◇</span>
            <strong>An toàn</strong>
            <small>Trải nghiệm ổn định và đáng tin cậy.</small>
          </article>
          <article>
            <span aria-hidden="true">◎</span>
            <strong>Hiệu quả</strong>
            <small>Tập trung vào việc dạy và học tốt hơn.</small>
          </article>
          <article>
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

function mountWelcome() {
  if (hasSeenWelcome() || isProtectedEntryRoute() || document.getElementById(WELCOME_ROOT_ID)) return;
  if (!document.body) return;

  const root = document.createElement('div');
  root.id = WELCOME_ROOT_ID;
  root.className = 'brian-welcome-root';
  root.innerHTML = welcomeMarkup();

  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousOverflow = document.body.style.overflow;
  const card = root.querySelector('.brian-welcome-card');
  const beam = root.querySelector('.brian-welcome-beam');
  const reducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closing = false;
  let pointerFrame = 0;
  let pendingPointer = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function applyPointerBeam() {
    pointerFrame = 0;
    if (!pendingPointer || !card || !beam || closing || reducedMotion) return;

    const rect = card.getBoundingClientRect();
    const originX = rect.left + rect.width * 0.885;
    const originY = rect.top + rect.height * 0.42;
    const dx = pendingPointer.x - originX;
    const dy = pendingPointer.y - originY;
    const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI - 180;
    const normalizedAngle = rawAngle < -180 ? rawAngle + 360 : rawAngle;
    const angle = clamp(normalizedAngle, -16, 9);
    const distance = Math.hypot(dx, dy);
    const scale = clamp(distance / (rect.width * 0.52), 0.82, 1.12);
    const opacity = clamp(0.8 + scale * 0.14, 0.88, 0.98);

    card.classList.add('is-beam-tracking');
    beam.style.setProperty('--welcome-beam-angle', `${angle.toFixed(2)}deg`);
    beam.style.setProperty('--welcome-beam-scale', scale.toFixed(3));
    beam.style.setProperty('--welcome-beam-opacity', opacity.toFixed(3));
    pendingPointer = null;
  }

  function onPointerMove(event) {
    if (reducedMotion || !card || !beam) return;
    pendingPointer = { x: event.clientX, y: event.clientY };
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(applyPointerBeam);
  }

  function onPointerLeave() {
    pendingPointer = null;
    if (pointerFrame) {
      window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
    }
    card?.classList.remove('is-beam-tracking');
    beam?.style.removeProperty('--welcome-beam-angle');
    beam?.style.removeProperty('--welcome-beam-scale');
    beam?.style.removeProperty('--welcome-beam-opacity');
  }

  const cleanup = () => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('storage', onStorage);
    card?.removeEventListener('pointermove', onPointerMove);
    card?.removeEventListener('pointerleave', onPointerLeave);
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
    document.body.style.overflow = previousOverflow;
    if (root.isConnected) root.remove();
    activeCleanup = null;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };

  const dismiss = (reason) => {
    if (closing) return;
    closing = true;
    markWelcomeSeen();
    root.classList.add('is-leaving');
    window.dispatchEvent(new CustomEvent('bes-first-visit-welcome-dismissed', {
      detail: { reason, version: WELCOME_VERSION },
    }));
    window.setTimeout(cleanup, 220);
  };

  const focusable = () => Array.from(root.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss('escape');
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onStorage(event) {
    if (event.key === WELCOME_SEEN_KEY && event.newValue === WELCOME_VERSION) cleanup();
  }

  root.querySelectorAll('[data-welcome-action]').forEach((button) => {
    button.addEventListener('click', () => dismiss(button.dataset.welcomeAction || 'button'));
  });

  root.querySelector('[data-welcome-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) dismiss('backdrop');
  });

  if (!reducedMotion && card && beam) {
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerleave', onPointerLeave);
  }

  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('storage', onStorage);
  activeCleanup = cleanup;

  window.requestAnimationFrame(() => {
    root.classList.add('is-visible');
    root.querySelector('[data-welcome-action="start"]')?.focus({ preventScroll: true });
  });

  window.dispatchEvent(new CustomEvent('bes-first-visit-welcome-shown', {
    detail: { version: WELCOME_VERSION },
  }));
}

function waitForShell(startedAt = Date.now()) {
  if (hasSeenWelcome() || isProtectedEntryRoute()) return;
  if (document.querySelector('#root .app-shell')) {
    window.setTimeout(mountWelcome, 180);
    return;
  }
  if (Date.now() - startedAt < SHELL_WAIT_MS) {
    window.setTimeout(() => waitForShell(startedAt), 120);
  }
}

export function installFirstVisitWelcome() {
  if (typeof window === 'undefined' || window.__besFirstVisitWelcomeInstalled) return;
  window.__besFirstVisitWelcomeInstalled = true;

  const begin = () => waitForShell();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', begin, { once: true });
  } else {
    begin();
  }

  window.addEventListener('beforeunload', () => activeCleanup?.(), { once: true });
}
