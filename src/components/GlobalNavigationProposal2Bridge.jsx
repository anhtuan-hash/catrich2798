import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const LABEL_TO_ID = new Map([
  ['trang chủ', 'home'],
  ['home', 'home'],
  ['ứng dụng', 'apps'],
  ['apps', 'apps'],
  ['đọc báo', 'news'],
  ['news', 'news'],
  ['trò chơi', 'games'],
  ['games', 'games'],
  ['dashboard', 'dashboard'],
  ['chủ nhiệm', 'homeroom'],
  ['homeroom', 'homeroom'],
  ['quản trị', 'admin'],
  ['admin', 'admin'],
]);

function normalizeLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi');
}

function decorateNavigation() {
  const nav = document.querySelector('.brian-nav');
  const primary = nav?.querySelector('.brian-nav__primary');
  if (!nav || !primary) return null;

  nav.dataset.navigationDesign = 'proposal-2';
  primary.querySelectorAll(':scope > button').forEach((button) => {
    const byClass = button.classList.contains('brian-nav__news-tab') ? 'news'
      : button.classList.contains('brian-nav__games-tab') ? 'games'
        : button.classList.contains('brian-nav__dashboard-tab') ? 'dashboard'
          : button.classList.contains('brian-nav__homeroom-tab') ? 'homeroom'
            : '';
    const id = byClass || LABEL_TO_ID.get(normalizeLabel(button.textContent));
    if (id) button.dataset.navId = id;
  });

  return nav.querySelector('.brian-nav__actions');
}

export default function GlobalNavigationProposal2Bridge({ language = 'vi', setLanguage }) {
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
      className="brian-nav__language-p2"
      onClick={() => setLanguage(vietnamese ? 'en' : 'vi')}
      aria-label={vietnamese ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'}
      title={vietnamese ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'}
    >
      <span aria-hidden="true">{vietnamese ? '🇻🇳' : '🇬🇧'}</span>
      <b>{vietnamese ? 'VI' : 'EN'}</b>
    </button>,
    actionsHost,
  );
}
