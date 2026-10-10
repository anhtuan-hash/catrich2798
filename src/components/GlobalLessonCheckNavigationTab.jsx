import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/navigation.js';

const LESSON_CHECK_SLUG = 'lesson-check-studio';
function userKey(user) { return String(user?.id || user?.authId || user?.email || ''); }

function GlobalLessonCheckNavigationTab({ currentUser, language = 'vi', route = 'home', selectedTool = null }) {
  const [host, setHost] = useState(null);
  const clickLockRef = useRef(false);
  const unlockTimerRef = useRef(0);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let frame = 0, observer = null, disposed = false;
    const findHost = () => {
      if (disposed) return;
      const nextHost = document.querySelector('.bes-top-chrome .brian-nav__primary');
      setHost((current) => current === nextHost ? current : nextHost);
      if (nextHost) observer?.disconnect();
    };
    findHost();
    if (!document.querySelector('.bes-top-chrome .brian-nav__primary')) {
      observer = new MutationObserver(() => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => { frame = 0; findHost(); });
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

  // Mirrors the existing catalog access. Individual game/assessment locks stay in Lesson Check.
  const allowed = useMemo(
    () => Boolean(currentUser && hasToolAccess(currentUser, LESSON_CHECK_SLUG)),
    [currentUser?.id, currentUser?.authId, currentUser?.email, currentUser?.role,
     currentUser?.approved, currentUser?.permissions],
  );
  if (!host || !allowed) return null;

  const active = route === 'tool' && selectedTool?.slug === LESSON_CHECK_SLUG;
  const handleClick = (event) => {
    const target = `#/tool/${LESSON_CHECK_SLUG}`;
    if (active || clickLockRef.current || window.location.hash === target) return;
    clickLockRef.current = true;
    window.clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = window.setTimeout(() => { clickLockRef.current = false; }, 1400);
    launchRoute({
      target, label: language === 'vi' ? 'KT' : 'CK',
      color: '#2a937d', sourceEl: event.currentTarget,
    });
  };

  return createPortal(
    <button
      type="button"
      className={`brian-nav__lesson-check-tab ${active ? 'is-active' : ''}`}
      data-nav-key="lesson-check"
      aria-current={active ? 'page' : undefined}
      onClick={handleClick}
    >{language === 'vi' ? 'Kiểm tra' : 'Assessment'}</button>,
    host, 'global-lesson-check-navigation-tab',
  );
}

export default memo(GlobalLessonCheckNavigationTab, (prev, next) => (
  userKey(prev.currentUser) === userKey(next.currentUser)
  && String(prev.currentUser?.role || '') === String(next.currentUser?.role || '')
  && prev.currentUser?.approved === next.currentUser?.approved
  && JSON.stringify(prev.currentUser?.permissions || null) === JSON.stringify(next.currentUser?.permissions || null)
  && prev.language === next.language
  && prev.route === next.route
  && prev.selectedTool?.slug === next.selectedTool?.slug
));
