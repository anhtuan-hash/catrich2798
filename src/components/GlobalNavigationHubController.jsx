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

export default function GlobalNavigationHubController() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let frame = 0;
    const decorate = () => {
      frame = 0;
      const nav = document.querySelector('.brian-nav');
      const primary = nav?.querySelector('.brian-nav__primary');
      if (!nav || !primary) return;

      nav.dataset.hubVersion = '4';
      primary.querySelectorAll(':scope > button, :scope > a').forEach((button) => {
        const key = keyForButton(button);
        if (key) button.dataset.navKey = key;
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(decorate);
    };

    decorate();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('hashchange', schedule);
    };
  }, []);

  return null;
}
