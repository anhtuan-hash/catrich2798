import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './GlobalHomeroomNavigationTab.css';

export default function GlobalHomeroomNavigationTab({
  currentUser,
  language = 'vi',
  route = 'home',
}) {
  const [host, setHost] = useState(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const findHost = () => {
      const nextHost = document.querySelector('.brian-nav__primary');
      setHost((current) => (current === nextHost ? current : nextHost));
    };

    findHost();
    const frame = window.requestAnimationFrame(findHost);
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const allowed = useMemo(
    () => Boolean(currentUser && hasRouteAccess(currentUser, 'homeroom')),
    [currentUser],
  );

  if (!host || !allowed) return null;

  const active = route === 'homeroom';
  const label = language === 'vi' ? 'Chủ nhiệm' : 'Homeroom';

  return createPortal(
    <button
      type="button"
      className={`brian-nav__homeroom-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => launchRoute({
        target: '#/homeroom',
        label: language === 'vi' ? 'CN' : 'HR',
        color: '#188038',
        sourceEl: event.currentTarget,
      })}
    >
      {label}
    </button>,
    host,
  );
}
