/* Brianverse immersive pre-entry. Decorative gate only; never an auth boundary. */
(() => {
  'use strict';
  const KEY = 'bes-swiss-editorial-unlock-seen-v1';
  const hash = window.location.hash.toLowerCase();
  const landing = !hash || hash === '#' || hash === '#/' || hash === '#/home';
  const pathname = window.location.pathname;
  const homePath = pathname === '/' || pathname.endsWith('/index.html');
  const search = new URLSearchParams(window.location.search);
  const override = search.get('unlock');
  const preview = override === 'preview';
  if ((!landing || !homePath) && !preview) return;
  if (override === 'off') return;
  try {
    if (!preview && window.sessionStorage.getItem(KEY) === '1') return;
  } catch { /* Storage may be disabled; access still works. */ }

  function mount() {
    if (!document.body || document.getElementById('bes-unlock')) return;
    const root = document.getElementById('root');
    const rootWasInert = root?.inert || false;
    const previousFocus = document.activeElement;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;

    const surface = document.createElement('section');
    surface.id = 'bes-unlock';
    surface.setAttribute('role', 'dialog');
    surface.setAttribute('aria-modal', 'true');
    surface.setAttribute('aria-label', 'Brianverse — màn hình chào mở khóa');
    surface.setAttribute('tabindex', '-1');
    surface.innerHTML = [
      '<div class="bu-frame">',
      '  <div class="bu-masthead">',
      '    <div class="bu-brand"><img src="/brian-english-brand-mark.png" alt="" width="32" height="32" decoding="async"><span>BRIANVERSE</span></div>',
      '    <div class="bu-meta"><span class="bu-edition">THE LEARNING UNIVERSE&nbsp; / &nbsp;01</span><time class="bu-clock" aria-label="Thời gian hiện tại"></time></div>',
      '  </div>',
      '  <div class="bu-body">',
      '    <div class="bu-editorial">',
      '      <div class="bu-index">01 &nbsp;/&nbsp; SPECIAL ENTRANCE</div>',
      '      <h1><span>BRIAN</span><span>VERSE<span class="bu-mark" aria-hidden="true">✦</span></span></h1>',
      '      <div class="bu-description"><span class="bu-number">01 —</span><p>Unlock the<br>learning universe.</p></div>',
      '    </div>',
      '    <div class="bu-visual" aria-hidden="true"><div class="bu-orbit"><div class="bu-core"><span class="bu-cross">✦</span></div></div></div>',
      '  </div>',
      '  <div class="bu-foot">',
      '    <div class="bu-footleft"><span>FLYME-INSPIRED MOTION</span><span>SWISS EDITORIAL / BRIANVERSE</span></div>',
      '    <button class="bu-enter" type="button" data-bu-enter><span class="bu-arrow" aria-hidden="true">↑</span><span>Swipe up to enter</span></button>',
      '    <button class="bu-skip" type="button" data-bu-skip aria-label="Bỏ qua màn hình chào">Skip intro</button>',
      '  </div>',
      '</div>',
    ].join('');

    const clock = surface.querySelector('.bu-clock');
    const tick = () => {
      const now = new Date();
      clock.textContent = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(now);
      clock.dateTime = now.toISOString();
    };
    tick();
    const interval = window.setInterval(tick, 60_000);

    let finished = false;
    let pointerStart = null;
    let completionTimer = null;
    if (root) root.inert = true;
    document.body.appendChild(surface);
    surface.focus({ preventScroll: true });

    function cleanup() {
      window.clearInterval(interval);
      window.clearTimeout(completionTimer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
      if (root) root.inert = rootWasInert;
      surface.remove();
      if (previousFocus?.isConnected && previousFocus !== document.body) {
        previousFocus.focus?.({ preventScroll: true });
      }
      window.dispatchEvent(new CustomEvent('bes-unlock-complete'));
    }

    function unlock() {
      if (finished) return;
      finished = true;
      try { if (!preview) window.sessionStorage.setItem(KEY, '1'); } catch { /* optional */ }
      surface.classList.add('bu-leaving');
      completionTimer = window.setTimeout(cleanup, reduced ? 30 : 1050);
    }

    function onHash() {
      if (!['', '#', '#/', '#/home'].includes(window.location.hash.toLowerCase())) unlock();
    }

    function onKey(event) {
      if (finished || event.altKey || event.ctrlKey || event.metaKey) return;
      if (['Enter', ' ', 'ArrowUp', 'Escape'].includes(event.key)) {
        event.preventDefault();
        unlock();
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    surface.querySelector('[data-bu-enter]').addEventListener('click', unlock);
    surface.querySelector('[data-bu-skip]').addEventListener('click', unlock);
    surface.addEventListener('pointerdown', (event) => {
      if (finished || event.button !== 0) return;
      pointerStart = { id: event.pointerId, y: event.clientY };
    });
    surface.addEventListener('pointerup', (event) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const distance = pointerStart.y - event.clientY;
      pointerStart = null;
      if (distance > 58) unlock();
    });
    surface.addEventListener('pointercancel', () => { pointerStart = null; });
    surface.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaY) > 65 && event.deltaY > 0) unlock();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
