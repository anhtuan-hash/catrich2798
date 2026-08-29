import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/navigation.js';

const GRADEBOOK_SLUG = 'gradebook-studio';

function userKey(user) {
  return String(user?.id || user?.authId || user?.email || '');
}

function GlobalGradebookNavigationTab({
  currentUser,
  language = 'vi',
  route = 'home',
  selectedTool = null,
}) {
  const [host, setHost] = useState(null);
  const clickLockRef = useRef(false);
  const unlockTimerRef = useRef(0);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let frame = 0;
    let observer = null;
    let disposed = false;

    const findHost = () => {
      if (disposed) return;
      const nextHost = document.querySelector('.bes-top-chrome .brian-nav__primary');
      setHost((current) => (current === nextHost ? current : nextHost));
      if (nextHost) observer?.disconnect();
    };

    findHost();
    if (!document.querySelector('.bes-top-chrome .brian-nav__primary')) {
      observer = new MutationObserver(() => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          findHost();
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(unlockTimerRef.current);
    };
  }, []);

  const allowed = useMemo(
    () => Boolean(currentUser && hasToolAccess(currentUser, GRADEBOOK_SLUG)),
    [
      currentUser?.id,
      currentUser?.authId,
      currentUser?.email,
      currentUser?.role,
      currentUser?.permissions,
    ],
  );

  if (!host || !allowed) return null;

  const active = route === 'tool' && selectedTool?.slug === GRADEBOOK_SLUG;
  const label = language === 'vi' ? 'Sổ điểm' : 'Gradebook';

  const handleClick = (event) => {
    const target = `#/tool/${GRADEBOOK_SLUG}`;
    if (active || clickLockRef.current || window.location.hash === target) return;

    clickLockRef.current = true;
    window.clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = window.setTimeout(() => {
      clickLockRef.current = false;
    }, 1400);

    launchRoute({
      target,
      label: 'GB',
      color: '#1a73e8',
      sourceEl: event.currentTarget,
    });
  };

  return createPortal(
    <button
      type="button"
      className={`brian-nav__gradebook-tab ${active ? 'is-active' : ''}`}
      data-nav-key="gradebook"
      aria-current={active ? 'page' : undefined}
      aria-busy="false"
      onClick={handleClick}
    >
      {label}
    </button>,
    host,
    'global-gradebook-navigation-tab',
  );
}

export default memo(GlobalGradebookNavigationTab, (previous, next) => (
  userKey(previous.currentUser) === userKey(next.currentUser)
  && String(previous.currentUser?.role || '') === String(next.currentUser?.role || '')
  && JSON.stringify(previous.currentUser?.permissions || null) === JSON.stringify(next.currentUser?.permissions || null)
  && previous.language === next.language
  && previous.route === next.route
  && previous.selectedTool?.slug === next.selectedTool?.slug
));
