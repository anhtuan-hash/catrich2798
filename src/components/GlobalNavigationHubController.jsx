import { useEffect } from 'react';

const LABEL_KEYS = [
  [/^(ứng dụng|apps)$/i, 'apps'],
  [/^(trang chủ|home)$/i, 'home'],
  [/^dashboard$/i, 'dashboard'],
  [/^(chủ nhiệm|homeroom)$/i, 'homeroom'],
  [/^(báo cáo|reports)$/i, 'reports'],
  [/^ttcm$/i, 'ttcm'],
  [/^(trò chơi|games)$/i, 'games'],
  [/^(quản trị|admin)$/i, 'admin'],
];

const NAV_ORDER = {
  home: 10,
  apps: 20,
  dashboard: 30,
  homeroom: 40,
  reports: 50,
  ttcm: 60,
  games: 70,
  admin: 80,
};

function keyForButton(button) {
  if (!button) return '';
  if (button.classList.contains('brian-nav__dashboard-tab')) return 'dashboard';
  if (button.classList.contains('brian-nav__homeroom-tab')) return 'homeroom';
  if (button.classList.contains('brian-nav__reports-tab')) return 'reports';
  if (button.classList.contains('brian-nav__ttcm-tab')) return 'ttcm';
  if (button.classList.contains('brian-nav__games-tab')) return 'games';

  const text = String(button.textContent || '').replace(/\s+/g, ' ').trim();
  const matched = LABEL_KEYS.find(([pattern]) => pattern.test(text));
  return matched?.[1] || '';
}

function decorate(primary) {
  const nav = primary?.closest?.('.brian-nav');
  if (!nav || !primary) return;

  if (nav.dataset.hubVersion !== '4') nav.dataset.hubVersion = '4';
  primary.querySelectorAll(':scope > button, :scope > a').forEach((button) => {
    const key = keyForButton(button);
    if (!key) return;
    if (button.dataset.navKey !== key) button.dataset.navKey = key;

    // Runtime authority beats historical route/theme CSS. This guarantees one
    // semantic order even when lazy-loaded route styles arrive after the hub.
    const order = NAV_ORDER[key];
    if (Number.isFinite(order)) button.style.setProperty('order', String(order), 'important');
  });
}

export default function GlobalNavigationHubController() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let frame = 0;
    let retryFrame = 0;
    let observer = null;
    let primary = null;
    let destroyed = false;
    let attempts = 0;

    const cancelFrame = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const scheduleDecorate = () => {
      if (frame || destroyed || !primary) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!destroyed && primary?.isConnected) decorate(primary);
      });
    };

    const attach = () => {
      if (destroyed) return;
      const nextPrimary = document.querySelector('.brian-nav__primary');
      if (!nextPrimary) {
        attempts += 1;
        if (attempts < 90) retryFrame = window.requestAnimationFrame(attach);
        return;
      }

      if (primary === nextPrimary && observer) {
        scheduleDecorate();
        return;
      }

      observer?.disconnect();
      primary = nextPrimary;
      decorate(primary);

      // Portal-injected destinations are direct children of the primary rail.
      // Re-decorate when any tab is inserted/removed so order never depends on
      // which React portal mounted first.
      observer = new MutationObserver(scheduleDecorate);
      observer.observe(primary, { childList: true });
    };

    const onHashChange = () => {
      if (!primary?.isConnected) {
        attempts = 0;
        attach();
      } else {
        scheduleDecorate();
      }
    };

    attach();
    window.addEventListener('hashchange', onHashChange);

    return () => {
      destroyed = true;
      cancelFrame();
      if (retryFrame) window.cancelAnimationFrame(retryFrame);
      observer?.disconnect();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  return null;
}
