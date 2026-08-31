import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/navigation.js';

export default function GlobalNewsFeedNavigationTab({
  currentUser,
  language = 'vi',
  route = 'home',
  selectedTool = null,
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
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const allowed = useMemo(
    () => Boolean(currentUser && hasToolAccess(currentUser, 'news-feed')),
    [currentUser],
  );

  if (!host || !allowed) return null;
  const active = route === 'tool' && selectedTool?.slug === 'news-feed';
  const label = language === 'vi' ? 'News Feed' : 'News Feed';

  return createPortal(
    <button
      type="button"
      className={`brian-nav__news-feed-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => launchRoute({
        target: '#/tool/news-feed',
        label: 'NF',
        color: '#6543b5',
        sourceEl: event.currentTarget,
      })}
    >
      {label}
    </button>,
    host,
  );
}
