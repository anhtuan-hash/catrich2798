import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getToolSection, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import './GlobalGamesNavigationTab.css';

export default function GlobalGamesNavigationTab({
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
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const allowed = useMemo(
    () => Boolean(currentUser && hasRouteAccess(currentUser, 'games')),
    [currentUser],
  );

  const active = route === 'games'
    || (route === 'tool' && getToolSection(selectedTool?.slug) === 'games');

  if (!host || !allowed) return null;

  const label = language === 'vi' ? 'Trò chơi' : 'Games';

  return createPortal(
    <button
      type="button"
      className={`brian-nav__games-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => launchRoute({
        target: '#/games',
        label: language === 'vi' ? 'TC' : 'GA',
        color: '#1a73e8',
        sourceEl: event.currentTarget,
      })}
    >
      {label}
    </button>,
    host,
  );
}
