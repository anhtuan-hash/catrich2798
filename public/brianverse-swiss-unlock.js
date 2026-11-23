/* BRIANVERSE / VIET NAM. Visual introduction only; never an authentication gate. */
(() => {
  'use strict';
  const KEY = 'bes-vietnam-unlock-seen-v2';
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('unlock');
  const preview = mode === 'preview' || mode === 'replay';
  const hash = String(window.location.hash || '').toLowerCase();
  const landing = ['', '#', '#/', '#/home'].includes(hash);
  const path = window.location.pathname;
  const rootPath = path === '/' || path.endsWith('/index.html');
  // The same repository builds Brian Museum Lab. Keep this entrance strictly on Brianverse hosts.
  const hostname = window.location.hostname.toLowerCase();
  const brianverseHost = /^(esl-brian|esl-pek)\.vercel\.app$/.test(hostname)
    || /^catrich2798(?:-[a-z0-9-]+)?\.vercel\.app$/.test(hostname)
    || ['localhost', '127.0.0.1'].includes(hostname);
  if (!brianverseHost) return;
  // Keep local development and existing E2E suites unobstructed; use ?unlock=preview to test the intro there.
  if (['localhost', '127.0.0.1'].includes(hostname) && !preview) return;

  if (!preview && (!landing || !rootPath || mode === 'off')) return;
  if (mode === 'off') return;
  try { if (!preview && sessionStorage.getItem(KEY) === '1') return; }
  catch { /* Privacy modes may deny storage. The entrance can still be skipped. */ }

  function mount() {
    if (!document.body || document.getElementById('bes-unlock')) return;
    document.getElementById('bes-unlock-replay')?.remove();
    const app = document.getElementById('root');
    const oldInert = app ? app.inert : false;
    const oldFocus = document.activeElement;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    let closed = false, startY = null, pointerId = null, wheelSum = 0, lastWheel = 0;
    let frame = 0, exitTimer = null;

    const surface = document.createElement('section');
    surface.id = 'bes-unlock';
    surface.setAttribute('role', 'dialog');
    surface.setAttribute('aria-modal', 'true');
    surface.setAttribute('aria-label', 'Màn hình chào Brianverse - Việt Nam');
    surface.tabIndex = -1;
    surface.innerHTML = [
      '<div class="bu-landscape" aria-hidden="true">',
      '  <div class="bu-scene"></div><div class="bu-shimmer"></div><div class="bu-tonal"></div>',
      '</div>',
      '<div class="bu-layout">',
      '  <header class="bu-top">',
      '    <div class="bu-clockgroup"><time class="bu-time"></time><p class="bu-date"></p></div>',
      '    <div class="bu-vietnam"><span>VIỆT NAM</span><span class="bu-place">HẠ LONG / VIỆT NAM</span></div>',
      '  </header>',
      '  <div class="bu-brandzone">',
      '    <div class="bu-brand">',
      '      <img src="/brian-english-brand-mark.png" alt="" width="60" height="60" decoding="async">',
      '      <span class="bu-brand-name">Brianverse</span>',
      '    </div>',
      '    <span class="bu-redline" aria-hidden="true"></span>',
      '  </div>',
      '  <footer class="bu-footer">',
      '    <span class="bu-issue">BRIANVERSE / VIỆT NAM / 2026</span>',
      '    <div class="bu-gesture">',
      '      <button class="bu-enter" type="button" aria-label="Vuốt lên hoặc nhấn để mở Brianverse">',
      '        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 21L16 9 28 21" /></svg>',
      '      </button>',
      '      <span class="bu-label">Vuốt lên để vào Brianverse</span>',
      '      <span class="bu-progress" aria-hidden="true"><span></span></span>',
      '    </div>',
      '    <button class="bu-skip" type="button">Bỏ qua</button>',
      '  </footer>',
      '</div>'
    ].join('');
    const timeEl = surface.querySelector('.bu-time');
    const dateEl = surface.querySelector('.bu-date');
    const fmtTime = new Intl.DateTimeFormat('vi-VN', { hour:'2-digit',minute:'2-digit',hour12:false });
    const fmtDate = new Intl.DateTimeFormat('vi-VN', { weekday:'long',day:'numeric',month:'long' });
    function tick() {
      const now = new Date();
      timeEl.textContent = fmtTime.format(now);
      dateEl.textContent = fmtDate.format(now);
      timeEl.dateTime = now.toISOString();
    }
    tick();
    const clockInterval = window.setInterval(tick, 30_000);
    if (app) app.inert = true;
    document.body.appendChild(surface);
    surface.focus({preventScroll:true});

    function updateProgress(value) {
      if (closed) return;
      const v = Math.max(0, Math.min(1, value));
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => surface.style.setProperty('--bu-progress', v.toFixed(3)));
    }
    function finish() {
      window.clearInterval(clockInterval);
      window.clearTimeout(exitTimer);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('hashchange', onRoute);
      if (app) app.inert = oldInert;
      surface.remove();
      if (oldFocus?.isConnected && oldFocus !== document.body) oldFocus.focus?.({preventScroll:true});
      if (preview && !document.getElementById('bes-unlock-replay')) {
        const btn = document.createElement('button');
        btn.id = 'bes-unlock-replay';
        btn.type = 'button';
        btn.textContent = '↻ Xem lại mở khóa';
        btn.setAttribute('aria-label', 'Xem lại hiệu ứng mở khóa Brianverse');
        btn.style.cssText = 'position:fixed;bottom:max(18px,env(safe-area-inset-bottom));right:18px;z-index:2147483400;border:1px solid #fff7;background:#0b3348ed;padding:12px 15px;color:white;font:700 12px Arial;letter-spacing:.02em;cursor:pointer;box-shadow:0 6px 30px #0005';
        btn.addEventListener('click', () => { btn.remove(); mount(); });
        document.body.appendChild(btn);
      }
      window.dispatchEvent(new CustomEvent('bes-unlock-complete'));
    }
    function unlock() {
      if (closed) return;
      closed = true;
      surface.classList.remove('bu-dragging');
      if (frame) cancelAnimationFrame(frame);
      surface.style.setProperty('--bu-progress', '1');
      try { if (!preview) sessionStorage.setItem(KEY, '1'); } catch { /* optional */ }
      surface.classList.add('bu-leaving');
      exitTimer = window.setTimeout(finish, reduced ? 70 : 1290);
    }
    function onKey(event) {
      if (closed || event.altKey || event.ctrlKey || event.metaKey) return;
      if (['Enter', ' ', 'ArrowUp', 'Escape'].includes(event.key)) {
        event.preventDefault(); unlock();
      }
    }
    function onRoute() {
      if (!['', '#', '#/', '#/home'].includes(String(window.location.hash).toLowerCase())) unlock();
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('hashchange', onRoute);
    surface.querySelector('.bu-enter').addEventListener('click', unlock);
    surface.querySelector('.bu-skip').addEventListener('click', unlock);
    surface.addEventListener('pointerdown', (event) => {
      if (closed || event.button !== 0) return;
      startY = event.clientY; pointerId = event.pointerId;
      surface.classList.add('bu-dragging');
    });
    surface.addEventListener('pointermove', (event) => {
      if (closed || startY === null || pointerId !== event.pointerId) return;
      updateProgress(Math.max(0, startY - event.clientY)/180);
    });
    surface.addEventListener('pointerup', (event) => {
      if (closed || startY === null || pointerId !== event.pointerId) return;
      const delta = startY - event.clientY;
      startY = null; pointerId = null;
      surface.classList.remove('bu-dragging');
      if (delta >= 64) unlock();
      else updateProgress(0);
    });
    surface.addEventListener('pointercancel', () => {
      startY = null; pointerId = null; surface.classList.remove('bu-dragging'); updateProgress(0);
    });
    surface.addEventListener('wheel', (event) => {
      if (closed || event.deltaY <= 0) return;
      const now = performance.now();
      if (now - lastWheel > 600) wheelSum = 0;
      lastWheel = now; wheelSum += event.deltaY;
      if (wheelSum > 75) unlock();
    }, {passive:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();