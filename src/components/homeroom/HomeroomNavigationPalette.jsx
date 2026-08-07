import React, { useEffect, useMemo, useRef } from 'react';
import { HOMEROOM_TABS } from '../../data/homeroom.js';
import { isClassTabAllowed, isSubjectClass } from '../../utils/homeroomClassTypes.js';

export default function HomeroomNavigationPalette({
  active,
  setActive,
  language = 'vi',
  currentUser,
  workspace,
}) {
  const subjectMode = isSubjectClass(workspace);
  const availableTabs = useMemo(
    () => HOMEROOM_TABS.filter((tab) => (
      (!tab.adminOnly || currentUser?.role === 'admin')
      && isClassTabAllowed(tab.key, workspace, currentUser?.role === 'admin')
    )),
    [workspace?.id, workspace?.classProfile?.classType, currentUser?.role],
  );

  const dockRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || typeof document === 'undefined') return undefined;

    const chrome = document.querySelector('.app-shell[data-route="homeroom"] > .bes-top-chrome');
    let frame = 0;
    let previousTop = '';
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = chrome?.getBoundingClientRect();
        const chromeIsVisible = Boolean(rect && rect.bottom > 0 && rect.top < window.innerHeight);
        const nextTop = chromeIsVisible
          ? `${Math.max(8, Math.round(rect.bottom) + 8)}px`
          : 'max(8px, env(safe-area-inset-top))';
        if (nextTop === previousTop) return;
        previousTop = nextTop;
        dock.style.setProperty('--hr-tabs-sticky-top', nextTop);
      });
    };

    const resizeObserver = typeof ResizeObserver === 'function' && chrome
      ? new ResizeObserver(measure)
      : null;
    resizeObserver?.observe(chrome);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    measure();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const scroller = scrollRef.current;
    const activeButton = scroller?.querySelector('button.active');
    if (!scroller || !activeButton || scroller.scrollWidth <= scroller.clientWidth) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const scrollerRect = scroller.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      const leftLimit = scrollerRect.left + 12;
      const rightLimit = scrollerRect.right - 12;
      let delta = 0;
      if (buttonRect.left < leftLimit) delta = buttonRect.left - leftLimit;
      else if (buttonRect.right > rightLimit) delta = buttonRect.right - rightLimit;
      if (delta) {
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        scroller.scrollTo({ left: scroller.scrollLeft + delta, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [active, subjectMode]);

  return <div ref={dockRef} className="hr-tabs-dock is-expanded is-pinned">
    <nav className="hr-tabs" aria-label={language === 'vi' ? 'Chức năng quản lý lớp' : 'Class tools'}>
      <div ref={scrollRef} className="hr-tabs-scroll">
        {availableTabs.map((tab) => <button
          key={tab.key}
          type="button"
          data-tab-key={tab.key}
          className={active === tab.key ? 'active' : ''}
          onClick={() => setActive(tab.key)}
        >
          <span>{tab.icon}</span>
          <b>{subjectMode && tab.key === 'classes'
            ? (language === 'vi' ? 'Quản lý lớp' : 'Class management')
            : (language === 'vi' ? tab.titleVi : tab.title)}</b>
        </button>)}
      </div>
    </nav>
  </div>;
}
