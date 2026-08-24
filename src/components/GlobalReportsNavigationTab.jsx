import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasToolAccess } from '../utils/permissions.js';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { launchRoute } from '../utils/motion.js';

export default function GlobalReportsNavigationTab({
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

  const allowed = useMemo(() => Boolean(
    currentUser && (
      isDepartmentLeaderRole(currentUser.role)
      || hasToolAccess(currentUser, 'brian-team')
    )
  ), [currentUser]);

  if (!host || !allowed) return null;

  const active = route === 'tool' && selectedTool?.slug === 'brian-team';
  const label = language === 'vi' ? 'Báo cáo' : 'Reports';

  return createPortal(
    <button
      type="button"
      className={`brian-nav__reports-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => launchRoute({
        target: '#/tool/brian-team',
        label: language === 'vi' ? 'BC' : 'RP',
        color: '#0f766e',
        sourceEl: event.currentTarget,
      })}
    >
      {label}
    </button>,
    host,
  );
}
