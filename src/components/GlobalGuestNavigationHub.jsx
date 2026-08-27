import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { launchRoute } from '../utils/navigation.js';
import './GlobalGuestNavigationHub.css';

const guestDestinations = [
  { id: 'apps', vi: 'Ứng dụng', en: 'Apps', target: '#/apps', labelVi: 'ƯD', labelEn: 'AP', color: '#f05a7e' },
  { id: 'news', vi: 'Đọc báo', en: 'News', target: '#/news', labelVi: 'ĐB', labelEn: 'NW', color: '#167d78' },
  { id: 'games', vi: 'Trò chơi', en: 'Games', target: '#/games', labelVi: 'TC', labelEn: 'GA', color: '#5b2a86' },
  { id: 'dashboard', vi: 'Dashboard', en: 'Dashboard', target: '#/dashboard', labelVi: 'DB', labelEn: 'DB', color: '#0b57d0' },
  { id: 'homeroom', vi: 'Chủ nhiệm', en: 'Homeroom', target: '#/homeroom', labelVi: 'CN', labelEn: 'HR', color: '#188038' },
];

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect x="4.5" y="8.5" width="11" height="8" rx="2" />
      <path d="M7 8.5V6.8a3 3 0 0 1 6 0v1.7" />
    </svg>
  );
}

export default function GlobalGuestNavigationHub({ currentUser, language = 'vi', route = 'home' }) {
  const [host, setHost] = useState(null);
  const isGuestHome = !currentUser && route === 'home';

  useEffect(() => {
    if (!isGuestHome || typeof document === 'undefined') {
      setHost(null);
      return undefined;
    }

    // Guest destinations are inserted into the exact same shared primary rail.
    // Home no longer receives a guest/home-specific navigation chrome variant.
    const findHost = () => {
      const nextHost = document.querySelector('.bes-top-chrome .brian-nav__primary');
      setHost((current) => (current === nextHost ? current : nextHost));
    };

    findHost();
    const frame = window.requestAnimationFrame(findHost);
    return () => window.cancelAnimationFrame(frame);
  }, [isGuestHome]);

  if (!host || !isGuestHome) return null;

  const openLogin = (item, event) => {
    try { window.sessionStorage.setItem('bes-login-intended-route', item.target); } catch { /* optional */ }
    launchRoute({
      target: '#/login',
      label: language === 'vi' ? item.labelVi : item.labelEn,
      color: item.color,
      sourceEl: event.currentTarget,
    });
  };

  return createPortal(
    <>
      {guestDestinations.map((item) => {
        const text = language === 'vi' ? item.vi : item.en;
        const signInLabel = language === 'vi' ? `Đăng nhập để mở ${text}` : `Sign in to open ${text}`;
        return (
          <button
            type="button"
            key={item.id}
            className={`brian-nav__guest-tab brian-nav__guest-tab--${item.id}`}
            title={signInLabel}
            aria-label={signInLabel}
            onClick={(event) => openLogin(item, event)}
          >
            <span>{text}</span>
            <i className="brian-nav__guest-lock"><LockIcon /></i>
          </button>
        );
      })}
    </>,
    host,
  );
}
