import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getBrianThemePreference,
  resolveBrianTheme,
  setBrianThemePreference,
} from '../theme/brianTheme.js';

const OPTIONS = {
  vi: [
    ['light', 'Sáng', 'Giao diện sáng'],
    ['dark', 'Tối', 'Giao diện tối'],
    ['system', 'Hệ thống', 'Theo giao diện của thiết bị'],
  ],
  en: [
    ['light', 'Light', 'Light appearance'],
    ['dark', 'Dark', 'Dark appearance'],
    ['system', 'System', 'Follow device appearance'],
  ],
};

const MENU_WIDTH = 360;
const MENU_GAP = 10;
const VIEWPORT_GUTTER = 12;

function ThemeGlyph({ resolved }) {
  if (resolved === 'dark') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.4 15.2A8.2 8.2 0 0 1 8.8 3.6 8.6 8.6 0 1 0 20.4 15.2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  );
}

function OptionGlyph({ mode }) {
  if (mode === 'dark') return <span aria-hidden="true">◐</span>;
  if (mode === 'system') return <span aria-hidden="true">▣</span>;
  return <span aria-hidden="true">☼</span>;
}

function getMenuPosition(button) {
  if (!button || typeof window === 'undefined') return { top: 96, left: VIEWPORT_GUTTER };
  const rect = button.getBoundingClientRect();
  const width = Math.min(MENU_WIDTH, Math.max(260, window.innerWidth - VIEWPORT_GUTTER * 2));
  const left = Math.min(
    Math.max(VIEWPORT_GUTTER, rect.right - width),
    Math.max(VIEWPORT_GUTTER, window.innerWidth - width - VIEWPORT_GUTTER),
  );
  return { top: Math.max(VIEWPORT_GUTTER, rect.bottom + MENU_GAP), left };
}

export default function GlobalThemeControl({ language = 'vi' }) {
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(() => getBrianThemePreference());
  const [resolved, setResolved] = useState(() => resolveBrianTheme(getBrianThemePreference()));
  const [menuPosition, setMenuPosition] = useState({ top: 96, left: VIEWPORT_GUTTER });
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const options = OPTIONS[language] || OPTIONS.vi;
  const title = language === 'vi' ? 'Giao diện' : 'Appearance';
  const buttonLabel = language === 'vi'
    ? `Giao diện ${resolved === 'dark' ? 'tối' : 'sáng'}`
    : `${resolved === 'dark' ? 'Dark' : 'Light'} appearance`;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let observer = null;
    let frame = 0;
    let destroyed = false;

    const findHost = () => {
      frame = 0;
      if (destroyed) return;
      const next = document.querySelector('.bes-top-chrome .brian-nav__actions');
      setHost((current) => current === next ? current : next);
      if (!next && !frame) frame = window.requestAnimationFrame(findHost);
    };

    findHost();
    observer = new MutationObserver(() => {
      if (!host?.isConnected && !frame) frame = window.requestAnimationFrame(findHost);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [host]);

  useEffect(() => {
    const sync = (event) => {
      const nextMode = event?.detail?.mode || getBrianThemePreference();
      const nextResolved = event?.detail?.resolved || resolveBrianTheme(nextMode);
      setMode(nextMode);
      setResolved(nextResolved);
    };
    window.addEventListener('bes-theme-change', sync);
    return () => window.removeEventListener('bes-theme-change', sync);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const reposition = () => setMenuPosition(getMenuPosition(buttonRef.current));
    reposition();

    const closeOutside = (event) => {
      const target = event.target;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('keydown', closeEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  if (!host) return null;

  const trigger = createPortal(
    <div ref={wrapRef} className="brian-nav__popover-wrap brian-nav__theme-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`brian-nav__theme-toggle ${open ? 'is-open' : ''}`}
        onClick={() => {
          if (!open) setMenuPosition(getMenuPosition(buttonRef.current));
          setOpen((value) => !value);
        }}
        aria-label={buttonLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={buttonLabel}
      >
        <ThemeGlyph resolved={resolved} />
      </button>
    </div>,
    host,
  );

  const menu = open && typeof document !== 'undefined' ? createPortal(
    <section
      ref={menuRef}
      className="brian-nav__popover brian-theme-menu brian-theme-menu--portal"
      aria-label={title}
      role="dialog"
      style={{
        '--bes-theme-menu-top': `${menuPosition.top}px`,
        '--bes-theme-menu-left': `${menuPosition.left}px`,
      }}
    >
      <header>
        <div>
          <strong>{title}</strong>
          <small>{language === 'vi' ? 'Áp dụng cho toàn bộ Brian English.' : 'Applies across Brian English.'}</small>
        </div>
        <span className={`brian-theme-menu__preview is-${resolved}`} aria-hidden="true"><ThemeGlyph resolved={resolved} /></span>
      </header>
      <div className="brian-theme-menu__options" role="radiogroup" aria-label={title}>
        {options.map(([value, label, description]) => (
          <button
            type="button"
            key={value}
            role="radio"
            aria-checked={mode === value}
            className={mode === value ? 'is-selected' : ''}
            onClick={() => {
              setBrianThemePreference(value);
              setOpen(false);
            }}
          >
            <OptionGlyph mode={value} />
            <span><b>{label}</b><small>{description}</small></span>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>,
    document.body,
  ) : null;

  return <>{trigger}{menu}</>;
}
