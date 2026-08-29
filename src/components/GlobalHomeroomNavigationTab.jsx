import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/navigation.js';

function userKey(user) {
  return String(user?.id || user?.authId || user?.email || '');
}

function GlobalHomeroomNavigationTab({
  currentUser,
  language = 'vi',
  route = 'home',
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
    () => Boolean(currentUser && hasRouteAccess(currentUser, 'homeroom')),
    [currentUser?.id, currentUser?.authId, currentUser?.email, currentUser?.role],
  );

  if (!host || !allowed) return null;

  const active = route === 'homeroom';
  const label = language === 'vi' ? 'Chủ nhiệm' : 'Homeroom';

  const handleClick = (event) => {
    if (active || clickLockRef.current || window.location.hash === '#/homeroom') return;
    clickLockRef.current = true;
    window.clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = window.setTimeout(() => {
      clickLockRef.current = false;
    }, 1400);

    launchRoute({
      target: '#/homeroom',
      label: language === 'vi' ? 'CN' : 'HR',
      color: '#188038',
      sourceEl: event.currentTarget,
    });
  };

  return createPortal(
    <button
      type="button"
      className={`brian-nav__homeroom-tab ${active ? 'is-active' : ''}`}
      data-nav-key="homeroom"
      aria-current={active ? 'page' : undefined}
      aria-busy="false"
      onClick={handleClick}
    >
      {label}
    </button>,
    host,
    'global-homeroom-navigation-tab',
  );
}

export default memo(GlobalHomeroomNavigationTab, (previous, next) => (
  userKey(previous.currentUser) === userKey(next.currentUser)
  && String(previous.currentUser?.role || '') === String(next.currentUser?.role || '')
  && previous.language === next.language
  && previous.route === next.route
));
