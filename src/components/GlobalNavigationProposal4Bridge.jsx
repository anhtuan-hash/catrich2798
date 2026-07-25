import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const LABEL_TO_ID = new Map([
  ['trang chủ', 'home'], ['home', 'home'],
  ['ứng dụng', 'apps'], ['apps', 'apps'],
  ['đọc báo', 'news'], ['news', 'news'],
  ['trò chơi', 'games'], ['games', 'games'],
  ['dashboard', 'dashboard'],
  ['chủ nhiệm', 'homeroom'], ['homeroom', 'homeroom'],
  ['quản trị', 'admin'], ['admin', 'admin'],
]);

const ICONS = {
  apps: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="6" height="6" rx="1.2"/><rect x="14.5" y="3.5" width="6" height="6" rx="1.2"/><rect x="3.5" y="14.5" width="6" height="6" rx="1.2"/><rect x="14.5" y="14.5" width="6" height="6" rx="1.2"/></svg>',
  news: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12.5H6.5A2.5 2.5 0 0 1 4 17V5.5A1 1 0 0 1 5 4.5Z"/><path d="M8 8h7M8 11.5h7M8 15h4M19 8.5h1.5v8.5a2.5 2.5 0 0 1-2.5 2.5"/></svg>',
  games: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 8h7a5 5 0 0 1 4.7 3.3l1.1 3.1a3.1 3.1 0 0 1-5.3 3l-1.4-1.7H9.4L8 17.4a3.1 3.1 0 0 1-5.3-3l1.1-3.1A5 5 0 0 1 8.5 8Z"/><path d="M7 11v4M5 13h4M16.5 12.2h.01M18.5 14.2h.01"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V12M10 20V7M15 20V10M20 20V4"/></svg>',
  homeroom: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.5 20v-2.4A4.6 4.6 0 0 1 8.1 13h1.8a4.6 4.6 0 0 1 4.6 4.6V20M14.2 14.2a4 4 0 0 1 6.3 3.3V20"/></svg>',
  admin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 7 3v5.5c0 4.3-2.6 7.3-7 9.5-4.4-2.2-7-5.2-7-9.5V6l7-3Z"/><circle cx="12" cy="11" r="2.3"/><path d="M8.8 16.3a4.1 4.1 0 0 1 6.4 0"/></svg>',
};

function normalizeLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi');
}

function installIcon(button, id) {
  if (!ICONS[id]) return;
  let icon = button.querySelector(':scope > .brian-nav__p4-icon');
  if (!icon) {
    icon = document.createElement('span');
    icon.className = 'brian-nav__p4-icon';
    icon.setAttribute('aria-hidden', 'true');
    button.prepend(icon);
  }
  if (icon.dataset.iconId !== id) {
    icon.dataset.iconId = id;
    icon.innerHTML = ICONS[id];
  }
}

function decorateNavigation() {
  const nav = document.querySelector('.brian-nav');
  const primary = nav?.querySelector('.brian-nav__primary');
  if (!nav || !primary) return null;

  nav.dataset.navigationDesign = 'proposal-4';
  primary.querySelectorAll(':scope > button').forEach((button) => {
    const byClass = button.classList.contains('brian-nav__news-tab') ? 'news'
      : button.classList.contains('brian-nav__games-tab') ? 'games'
        : button.classList.contains('brian-nav__dashboard-tab') ? 'dashboard'
          : button.classList.contains('brian-nav__homeroom-tab') ? 'homeroom'
            : '';
    const id = byClass || LABEL_TO_ID.get(normalizeLabel(button.textContent));
    if (!id || id === 'home') return;
    button.dataset.navId = id;
    installIcon(button, id);
  });

  return nav.querySelector('.brian-nav__actions');
}

export default function GlobalNavigationProposal4Bridge({ language = 'vi', setLanguage }) {
  const [actionsHost, setActionsHost] = useState(null);

  useEffect(() => {
    let frame = 0;
    const refresh = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next = decorateNavigation();
        setActionsHost((current) => (current === next ? current : next));
      });
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('hashchange', refresh);
    window.addEventListener('brian:navigation-updated', refresh);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('hashchange', refresh);
      window.removeEventListener('brian:navigation-updated', refresh);
    };
  }, []);

  if (!actionsHost || typeof setLanguage !== 'function') return null;

  const vietnamese = language === 'vi';
  return createPortal(
    <button
      type="button"
      className="brian-nav__language-p4"
      onClick={() => setLanguage(vietnamese ? 'en' : 'vi')}
      aria-label={vietnamese ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'}
      title={vietnamese ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'}
    >
      <span aria-hidden="true">{vietnamese ? '🇻🇳' : '🇬🇧'}</span>
      <b>{vietnamese ? 'VI' : 'EN'}</b>
      <i aria-hidden="true">⌄</i>
    </button>,
    actionsHost,
  );
}
