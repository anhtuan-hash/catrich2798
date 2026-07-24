import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './GlobalNewsNavigationTab.css';

export default function GlobalNewsNavigationTab({
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
    () => Boolean(currentUser && hasRouteAccess(currentUser, 'news')),
    [currentUser],
  );

  useEffect(() => {
    if (!host) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const activeTab = host.querySelector('button.is-active');
      activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [host, route]);

  if (!host || !allowed) return null;

  const active = route === 'news';
  const label = language === 'vi' ? 'Đọc báo' : 'News';

  return createPortal(
    <button
      type="button"
      className={`brian-nav__news-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => launchRoute({
        target: '#/news',
        label: language === 'vi' ? 'ĐB' : 'NW',
        color: '#167d78',
        sourceEl: event.currentTarget,
      })}
    >
      {label}
    </button>,
    host,
  );
}
