import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid, Pin, PinOff, Sparkles } from 'lucide-react';
import './SmartBubbleDock.css';

/* This visual controller does not alter any original launcher or business logic. */
const BUBBLES = [
  '.bit-launcher', '.bff-bubble', '.bba-bubble', '.bbd-board-fab',
  '.bfc-bubble', '.bes-approval-root .bes-approval-fab',
  '.bes-kira-chat-root .bes-kira-chat-launcher',
].join(', ');
const PREFIX = 'bes-smart-bubble-dock-pin-v1:';
const SLOT_ENTRIES = [
  { selector: '.bes-kira-chat-root .bes-kira-chat-launcher', container: '.bes-kira-chat-root' },
  { selector: '.bes-approval-root .bes-approval-fab', reserve: '.bes-approval-root' },
  { selector: '.bfc-bubble' },
  { selector: '.bbd-board-fab' },
  { selector: '.bba-bubble' },
  { selector: '.bff-bubble' },
  { selector: '.bit-launcher' },
];
function syncVisibleSlots() {
  let slot = 1;
  SLOT_ENTRIES.forEach(entry => {
    const button = document.querySelector(entry.selector);
    const container = entry.container ? document.querySelector(entry.container) : null;
    const reserved = entry.reserve ? document.querySelector(entry.reserve) : null;
    if (!button && !reserved) return;
    if (button) {
      button.classList.add('bes-smart-managed');
      if (button.dataset.besSmartSlot !== String(slot)) {
        button.dataset.besSmartSlot = String(slot);
        button.style.setProperty('--bes-smart-slot', String(slot));
      }
    }
    if (container && container.style.getPropertyValue('--bes-smart-slot') !== String(slot)) {
      container.style.setProperty('--bes-smart-slot', String(slot));
    }
    slot++;
  });
  document.documentElement.style.setProperty('--bes-smart-count', String(slot - 1));
}
const isElement = value => typeof Element !== 'undefined' && value instanceof Element;
function readPin(userId) {
  try { return window.localStorage.getItem(PREFIX + userId) === '1'; }
  catch { return false; }
}
function writePin(userId, pinned) {
  try { window.localStorage.setItem(PREFIX + userId, pinned ? '1' : '0'); }
  catch { /* Storage is optional; the current session still works. */ }
}
function readBadge() {
  let count = 0;
  document.querySelectorAll('.bes-approval-count, .brian-nav__utility-badge').forEach(node => {
    const value = Number.parseInt(String(node.textContent || ''), 10);
    if (Number.isFinite(value)) count = Math.max(count, Math.min(value, 999));
  });
  return count;
}
export default function SmartBubbleDock({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const userId = String(currentUser?.id || currentUser?.email || 'guest');
  const [pinned, setPinned] = useState(() => readPin(userId));
  const [expanded, setExpanded] = useState(() => readPin(userId));
  const [badge, setBadge] = useState(0);
  const [closing, setClosing] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimer = useRef(null);
  const exitTimer = useRef(null);
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;
  const clearTimer = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const collapse = useCallback(() => {
    if (pinnedRef.current) return;
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    const focused = document.activeElement;
    if (isElement(focused) && focused.matches(BUBBLES)) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    setExpanded(false);
    setClosing(true);
    exitTimer.current = window.setTimeout(() => {
      setClosing(false);
      exitTimer.current = null;
    }, 620);
  }, []);
  const planCollapse = useCallback((delay = 5000) => {
    clearTimer();
    if (pinnedRef.current) return;
    closeTimer.current = window.setTimeout(() => {
      const active = document.activeElement;
      if (active !== triggerRef.current && isElement(active) &&
          (active.matches(BUBBLES) || rootRef.current?.contains(active))) {
        planCollapse(2500);
        return;
      }
      collapse();
    }, delay);
  }, [clearTimer, collapse]);
  const openDock = useCallback(() => {
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    exitTimer.current = null;
    setClosing(false);
    setExpanded(true);
    planCollapse(5000);
  }, [planCollapse]);

  useLayoutEffect(() => {
    document.documentElement.dataset.besSmartBubbleDock = expanded ? 'expanded' : (closing ? 'closing' : 'collapsed');
    return () => { delete document.documentElement.dataset.besSmartBubbleDock; };
  }, [expanded, closing]);
  useEffect(() => {
    const saved = readPin(userId);
    pinnedRef.current = saved;
    setPinned(saved); setExpanded(saved); setClosing(false); clearTimer();
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
  }, [userId, clearTimer]);
  useLayoutEffect(() => {
    // Portaled owner buttons are managed visually, never replaced or clicked.
    let frame = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => { frame = null; syncVisibleSlots(); });
    };
    syncVisibleSlots();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty('--bes-smart-count');
    };
  }, []);
  useEffect(() => () => {
    clearTimer();
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
  }, [clearTimer]);
  useEffect(() => {
    const update = () => setBadge(readBadge());
    update();
    const timer = window.setInterval(update, 3500);
    window.addEventListener('bes-global-notification', update);
    window.addEventListener('bes:notification', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('bes-global-notification', update);
      window.removeEventListener('bes:notification', update);
    };
  }, []);
  useEffect(() => {
    if (!expanded || pinned) { clearTimer(); return undefined; }
    planCollapse(5000);
    return clearTimer;
  }, [expanded, pinned, planCollapse, clearTimer]);
  useEffect(() => {
    const onPointerOver = event => {
      if (event.pointerType === 'mouse' && isElement(event.target) &&
          event.target.closest(BUBBLES)) openDock();
    };
    const onPointerOut = event => {
      if (event.pointerType === 'mouse' && !pinnedRef.current &&
          isElement(event.target) && event.target.closest(BUBBLES)) planCollapse(650);
    };
    const onFocus = event => {
      if (isElement(event.target) && event.target.closest(BUBBLES)) openDock();
    };
    const onOutside = event => {
      if (pinnedRef.current || !isElement(event.target)) return;
      if (rootRef.current?.contains(event.target)) return;
      if (event.target.closest(BUBBLES)) { planCollapse(1200); return; }
      clearTimer(); collapse();
    };
    const onScroll = () => {
      if (!pinnedRef.current) { clearTimer(); collapse(); }
    };
    const onKeyDown = event => {
      if (event.key !== 'Escape') return;
      clearTimer(); collapse();
      const active = document.activeElement;
      if (isElement(active) && (rootRef.current?.contains(active) || active.matches(BUBBLES))) {
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onScroll, true);
      clearTimer();
    };
  }, [openDock, planCollapse, clearTimer, collapse]);
  const togglePin = () => {
    const next = !pinned;
    pinnedRef.current = next; setPinned(next);
    writePin(userId, next);
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    exitTimer.current = null;
    setClosing(false); setExpanded(true);
    if (next) clearTimer(); else planCollapse(5000);
  };
  const label = expanded ? (vi ? 'Thu gọn công cụ' : 'Collapse tools') :
    (vi ? 'Mở Smart Bubble Dock' : 'Open Smart Bubble Dock');
  return createPortal(
    <div ref={rootRef}
      className={'bes-smart-bubble-dock' + (expanded ? ' is-expanded' : '') + (pinned ? ' is-pinned' : '')}
      data-bes-smart-bubble-dock role="group"
      aria-label={vi ? 'Thanh công cụ thông minh' : 'Smart Bubble Dock'}
      onPointerEnter={event => { if (event.pointerType === 'mouse') openDock(); }}
      onPointerLeave={event => { if (event.pointerType === 'mouse') planCollapse(650); }}>
      {expanded ? <button type="button" className="bes-smart-bubble-dock__pin"
        onClick={togglePin} aria-pressed={pinned}
        aria-label={pinned ? (vi ? 'Bỏ ghim thanh công cụ' : 'Unpin quick tools') : (vi ? 'Ghim thanh công cụ luôn mở' : 'Pin tools open')}>
        {pinned ? <PinOff size={15} aria-hidden="true"/> : <Pin size={15} aria-hidden="true"/>}
        <span>{pinned ? (vi ? 'Bỏ ghim' : 'Unpin') : (vi ? 'Ghim' : 'Pin')}</span>
      </button> : null}
      <button type="button" ref={triggerRef} className="bes-smart-bubble-dock__anchor"
        title={label} aria-label={label} aria-expanded={expanded}
        onClick={() => {
          clearTimer();
          if (expanded) collapse();
          else openDock();
        }}>
        <LayoutGrid size={24} strokeWidth={2} aria-hidden="true"/>
        <Sparkles size={13} className="bes-smart-bubble-dock__spark" aria-hidden="true"/>
        {badge > 0 ? <span className="bes-smart-bubble-dock__badge"
          aria-label={vi ? String(badge) + ' thông báo cần chú ý' : String(badge) + ' notifications'}>
          {badge > 99 ? '99+' : badge}
        </span> : null}
        <span className="bes-smart-bubble-dock__online" aria-hidden="true"/>
      </button>
      <span className="bes-smart-bubble-dock__hint" aria-hidden="true">
        {expanded ? (vi ? 'Nhấn để thu gọn' : 'Click to collapse') : 'Smart Bubble Dock'}
      </span>
    </div>, document.body,
  );
}
