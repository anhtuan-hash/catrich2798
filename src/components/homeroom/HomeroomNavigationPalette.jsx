import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HOMEROOM_TABS } from '../../data/homeroom.js';
import { isClassTabAllowed, isSubjectClass } from '../../utils/homeroomClassTypes.js';
import {
  HOMEROOM_NAV_PALETTE_IDLE_MS,
  clampHomeroomNavigationLauncherBottom,
  createHomeroomNavigationScrollTracker,
  readHomeroomNavigationPreference,
  updateHomeroomNavigationScrollTracker,
  writeHomeroomNavigationPreference,
} from '../../utils/homeroomNavigationPalette.js';

const RETRY_COLLAPSE_MS = 1000;
const LAUNCHER_PEEK_MS = 3600;
const LAUNCHER_DRAG_START_PX = 5;
const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"], [role="textbox"]';
const OPEN_DIALOG_SELECTOR = 'dialog[open], [role="dialog"][aria-modal="true"]:not([aria-hidden="true"])';

function hasActiveTextSelection() {
  const selection = window.getSelection?.();
  return Boolean(selection && selection.rangeCount > 0 && !selection.isCollapsed);
}

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
  const activeTab = availableTabs.find((tab) => tab.key === active) || availableTabs[0] || HOMEROOM_TABS[0];
  const activeLabel = subjectMode && activeTab.key === 'classes'
    ? (language === 'vi' ? 'Quản lý lớp' : 'Class management')
    : (language === 'vi' ? activeTab.titleVi : activeTab.title);
  const labels = language === 'vi'
    ? {
      navigation: 'Chức năng quản lý lớp',
      options: 'Tuỳ chọn thanh điều hướng',
      pin: 'Ghim',
      pinned: 'Đã ghim',
      pinTitle: 'Luôn giữ thanh điều hướng mở',
      unpinTitle: 'Bỏ ghim và tự thu gọn sau 5 giây',
      collapse: 'Thu gọn thanh điều hướng',
      open: `Mở thanh điều hướng, tab hiện tại: ${activeLabel}`,
      preview: `Xem nhanh thanh điều hướng, tab hiện tại: ${activeLabel}`,
      openHint: 'Chạm lần nữa để mở',
      dragHint: 'Kéo lên hoặc xuống để đổi vị trí',
    }
    : {
      navigation: 'Class tools',
      options: 'Navigation options',
      pin: 'Pin',
      pinned: 'Pinned',
      pinTitle: 'Keep navigation open',
      unpinTitle: 'Unpin and auto-collapse after 5 seconds',
      collapse: 'Collapse navigation',
      open: `Open navigation, current tab: ${activeLabel}`,
      preview: `Preview navigation, current tab: ${activeLabel}`,
      openHint: 'Tap again to open',
      dragHint: 'Drag up or down to reposition',
    };

  const [palette, setPalette] = useState(() => readHomeroomNavigationPreference(currentUser));
  const [launcherPeeked, setLauncherPeeked] = useState(false);
  const [launcherDragging, setLauncherDragging] = useState(false);
  const paletteRef = useRef(palette);
  const dockRef = useRef(null);
  const navRef = useRef(null);
  const scrollRef = useRef(null);
  const launcherRef = useRef(null);
  const idleTimerRef = useRef(0);
  const peekTimerRef = useRef(0);
  const interactionRef = useRef(false);
  const launcherDragRef = useRef(null);
  const skipLauncherClickRef = useRef(false);
  const pointerActivationRef = useRef('');
  const programmaticLauncherFocusRef = useRef(false);
  paletteRef.current = palette;

  const clearIdleTimer = useCallback(() => {
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = 0;
  }, []);

  const clearPeekTimer = useCallback(() => {
    window.clearTimeout(peekTimerRef.current);
    peekTimerRef.current = 0;
  }, []);

  const previewLauncher = useCallback((autoHide = true) => {
    clearPeekTimer();
    setLauncherPeeked(true);
    if (autoHide) {
      peekTimerRef.current = window.setTimeout(() => setLauncherPeeked(false), LAUNCHER_PEEK_MS);
    }
  }, [clearPeekTimer]);

  const canAutoCollapse = useCallback(() => {
    if (paletteRef.current.pinned || interactionRef.current) return false;
    if (document.querySelector(OPEN_DIALOG_SELECTOR)) return false;
    const focused = document.activeElement;
    if (focused && focused !== document.body) {
      if (navRef.current?.contains(focused)) return false;
      if (focused.matches?.(EDITABLE_SELECTOR)) return false;
    }
    return !hasActiveTextSelection();
  }, []);

  const armIdleTimer = useCallback(() => {
    clearIdleTimer();
    if (paletteRef.current.pinned || paletteRef.current.collapsed) return;

    const tryCollapse = () => {
      idleTimerRef.current = 0;
      if (canAutoCollapse()) {
        setPalette((current) => (current.pinned ? current : { ...current, collapsed: true }));
        return;
      }
      idleTimerRef.current = window.setTimeout(tryCollapse, RETRY_COLLAPSE_MS);
    };

    idleTimerRef.current = window.setTimeout(tryCollapse, HOMEROOM_NAV_PALETTE_IDLE_MS);
  }, [canAutoCollapse, clearIdleTimer]);

  const reveal = useCallback(() => {
    clearPeekTimer();
    setLauncherPeeked(false);
    setPalette((current) => (current.collapsed ? { ...current, collapsed: false } : current));
  }, [clearPeekTimer]);

  const collapse = useCallback((force = false) => {
    if (paletteRef.current.pinned || (!force && !canAutoCollapse())) {
      armIdleTimer();
      return;
    }
    clearIdleTimer();
    clearPeekTimer();
    setLauncherPeeked(false);
    setPalette((current) => (current.pinned || current.collapsed ? current : { ...current, collapsed: true }));
  }, [armIdleTimer, canAutoCollapse, clearIdleTimer, clearPeekTimer]);

  useEffect(() => {
    writeHomeroomNavigationPreference(currentUser, palette);
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, palette.pinned, palette.collapsed, palette.launcherBottom]);

  useEffect(() => {
    clearIdleTimer();
    if (!palette.pinned && !palette.collapsed) armIdleTimer();
    return clearIdleTimer;
  }, [active, palette.pinned, palette.collapsed, armIdleTimer, clearIdleTimer]);

  useEffect(() => () => clearPeekTimer(), [clearPeekTimer]);

  useEffect(() => {
    const fitLauncher = () => {
      const current = paletteRef.current.launcherBottom;
      if (current == null) return;
      const next = clampHomeroomNavigationLauncherBottom(
        current,
        window.innerHeight,
        launcherRef.current?.offsetHeight || 56,
      );
      if (next !== current) setPalette((preference) => ({ ...preference, launcherBottom: next }));
    };
    window.addEventListener('resize', fitLauncher, { passive: true });
    fitLauncher();
    return () => window.removeEventListener('resize', fitLauncher);
  }, []);

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
    let tracker = createHomeroomNavigationScrollTracker(window.scrollY);
    const handleScroll = () => {
      const update = updateHomeroomNavigationScrollTracker(tracker, window.scrollY);
      tracker = update.tracker;
      if (update.intent === 'collapse') collapse(false);
      if (update.intent === 'expand') reveal();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [collapse, reveal]);

  useEffect(() => {
    const scroller = scrollRef.current;
    const activeButton = scroller?.querySelector('button.active');
    if (palette.collapsed || !scroller || !activeButton || scroller.scrollWidth <= scroller.clientWidth) return;

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
  }, [active, subjectMode, palette.collapsed]);

  useEffect(() => {
    if (!palette.collapsed || !navRef.current?.contains(document.activeElement)) return undefined;
    const frame = window.requestAnimationFrame(() => {
      programmaticLauncherFocusRef.current = true;
      launcherRef.current?.focus({ preventScroll: true });
      window.setTimeout(() => { programmaticLauncherFocusRef.current = false; }, 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [palette.collapsed]);

  const handleNavigationPointerEnter = () => {
    interactionRef.current = true;
    clearIdleTimer();
    reveal();
  };
  const handleNavigationPointerLeave = () => {
    interactionRef.current = false;
    armIdleTimer();
  };
  const handleLauncherPointerEnter = (event) => {
    interactionRef.current = true;
    clearIdleTimer();
    if (event.pointerType === 'mouse' && paletteRef.current.collapsed) previewLauncher(false);
  };
  const handleLauncherPointerLeave = () => {
    interactionRef.current = false;
    clearPeekTimer();
    if (paletteRef.current.collapsed && !launcherDragRef.current) {
      peekTimerRef.current = window.setTimeout(() => setLauncherPeeked(false), 700);
    }
  };
  const togglePinned = () => {
    clearIdleTimer();
    clearPeekTimer();
    setLauncherPeeked(false);
    setPalette((current) => ({ ...current, pinned: !current.pinned, collapsed: false }));
  };

  const handleLauncherPointerDown = (event) => {
    if (event.button !== 0) return;
    pointerActivationRef.current = event.pointerType || 'pointer';
    const launcher = launcherRef.current;
    const rect = launcher?.getBoundingClientRect();
    if (!launcher || !rect) return;
    clearPeekTimer();
    launcherDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startBottom: window.innerHeight - rect.bottom,
      dragged: false,
    };
    launcher.setPointerCapture?.(event.pointerId);
  };

  const handleLauncherPointerMove = (event) => {
    const drag = launcherDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientY - drag.startY;
    if (!drag.dragged && Math.abs(distance) < LAUNCHER_DRAG_START_PX) return;
    event.preventDefault();
    drag.dragged = true;
    setLauncherDragging(true);
    setLauncherPeeked(false);
    const nextBottom = clampHomeroomNavigationLauncherBottom(
      drag.startBottom - distance,
      window.innerHeight,
      launcherRef.current?.offsetHeight || 56,
    );
    setPalette((current) => (
      current.launcherBottom === nextBottom ? current : { ...current, launcherBottom: nextBottom }
    ));
  };

  const finishLauncherDrag = (event) => {
    const drag = launcherDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    launcherRef.current?.releasePointerCapture?.(event.pointerId);
    launcherDragRef.current = null;
    setLauncherDragging(false);
    if (drag.dragged) {
      skipLauncherClickRef.current = true;
      window.setTimeout(() => { skipLauncherClickRef.current = false; }, 0);
    }
    window.setTimeout(() => { pointerActivationRef.current = ''; }, 0);
  };

  const handleLauncherClick = () => {
    if (skipLauncherClickRef.current) return;
    if (!launcherPeeked) {
      previewLauncher(true);
      return;
    }
    reveal();
  };

  return <div
    ref={dockRef}
    className={`hr-tabs-dock ${palette.collapsed ? 'is-collapsed' : 'is-expanded'} ${launcherPeeked ? 'is-peeked' : 'is-compact'} ${launcherDragging ? 'is-dragging' : ''} ${palette.pinned ? 'is-pinned' : 'is-auto'}`}
    data-corner={palette.corner}
    style={palette.launcherBottom == null ? undefined : { '--hr-tabs-launcher-bottom': `${palette.launcherBottom}px` }}
  >
    <nav
      ref={navRef}
      className="hr-tabs"
      aria-label={labels.navigation}
      aria-hidden={palette.collapsed ? 'true' : undefined}
      inert={palette.collapsed ? true : undefined}
      onPointerEnter={handleNavigationPointerEnter}
      onPointerLeave={handleNavigationPointerLeave}
      onFocusCapture={() => { interactionRef.current = true; clearIdleTimer(); reveal(); }}
      onBlurCapture={() => { interactionRef.current = false; armIdleTimer(); }}
    >
      <div ref={scrollRef} className="hr-tabs-scroll">
        {availableTabs.map((tab) => <button
          key={tab.key}
          type="button"
          data-tab-key={tab.key}
          className={active === tab.key ? 'active' : ''}
          onClick={() => setActive(tab.key)}
        ><span>{tab.icon}</span><b>{subjectMode && tab.key === 'classes' ? (language === 'vi' ? 'Quản lý lớp' : 'Class management') : (language === 'vi' ? tab.titleVi : tab.title)}</b></button>)}
      </div>
      <div className="hr-tabs-palette-actions" aria-label={labels.options}>
        <button
          type="button"
          className={`hr-tabs-pin ${palette.pinned ? 'is-pinned' : ''}`}
          aria-pressed={palette.pinned}
          title={palette.pinned ? labels.unpinTitle : labels.pinTitle}
          onClick={togglePinned}
        ><span aria-hidden="true">⌖</span><b>{palette.pinned ? labels.pinned : labels.pin}</b></button>
        <button
          type="button"
          className="hr-tabs-collapse"
          aria-label={labels.collapse}
          title={labels.collapse}
          disabled={palette.pinned}
          onClick={() => collapse(true)}
        ><span aria-hidden="true">↘</span></button>
      </div>
    </nav>

    <button
      ref={launcherRef}
      type="button"
      className="hr-tabs-launcher"
      aria-label={launcherPeeked ? labels.open : labels.preview}
      title={labels.dragHint}
      aria-hidden={palette.collapsed ? undefined : 'true'}
      tabIndex={palette.collapsed ? 0 : -1}
      onPointerEnter={handleLauncherPointerEnter}
      onPointerLeave={handleLauncherPointerLeave}
      onPointerDown={handleLauncherPointerDown}
      onPointerMove={handleLauncherPointerMove}
      onPointerUp={finishLauncherDrag}
      onPointerCancel={finishLauncherDrag}
      onFocus={() => {
        interactionRef.current = true;
        clearIdleTimer();
        if (!pointerActivationRef.current && !programmaticLauncherFocusRef.current) previewLauncher(false);
      }}
      onBlur={() => { interactionRef.current = false; clearPeekTimer(); setLauncherPeeked(false); }}
      onClick={handleLauncherClick}
    >
      <span className="hr-tabs-launcher-icon" aria-hidden="true">{activeTab.icon}</span>
      <span className="hr-tabs-launcher-copy"><b>{activeLabel}</b><small>{labels.openHint}</small></span>
      <span className="hr-tabs-launcher-arrow" aria-hidden="true">↖</span>
    </button>
  </div>;
}
