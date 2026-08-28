import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  REGIONAL_FONT_EVENT,
  applyRegionalFontSettings,
  getRegionalFontSettings,
  getRegionalFontSize,
  saveRegionalFontSettings,
} from '../utils/globalRegionalFontSystem.js';
import './GlobalAccountTextSizeBridge.css';

const DEFAULT_SIZE = 16;
const MIN_SIZE = 11;
const MAX_SIZE = 22;

function clampSize(value) {
  const size = Math.round(Number(value) || DEFAULT_SIZE);
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, size));
}

function readSize(settings = getRegionalFontSettings()) {
  return getRegionalFontSize(settings, 'navigation') || DEFAULT_SIZE;
}

function hasOverride(settings = getRegionalFontSettings()) {
  return Boolean(getRegionalFontSize(settings, 'navigation'));
}

function withNavigationSize(settings, size) {
  const next = { ...(settings || {}) };
  const fontSizes = { ...(next.fontSizes || {}) };
  if (size == null) delete fontSizes.navigation;
  else fontSizes.navigation = clampSize(size);
  if (Object.keys(fontSizes).length) next.fontSizes = fontSizes;
  else delete next.fontSizes;
  return next;
}

function isVietnamese() {
  if (typeof window === 'undefined') return true;
  try { return (window.localStorage.getItem('bet-language') || 'vi') !== 'en'; }
  catch { return true; }
}

export default function GlobalAccountTextSizeBridge() {
  const [host, setHost] = useState(null);
  const [size, setSize] = useState(() => readSize());
  const [overridden, setOverridden] = useState(() => hasOverride());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [vi, setVi] = useState(isVietnamese);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const findHost = () => {
      const next = document.querySelector('.brian-nav__account-menu .brian-nav__font-options');
      setHost((current) => current === next ? current : next);
      setVi(isVietnamese());
    };
    findHost();
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = (event) => {
      const settings = event?.detail?.settings || getRegionalFontSettings();
      setSize(readSize(settings));
      setOverridden(hasOverride(settings));
    };
    window.addEventListener(REGIONAL_FONT_EVENT, sync);
    return () => window.removeEventListener(REGIONAL_FONT_EVENT, sync);
  }, []);

  const percent = useMemo(() => Math.round((size / DEFAULT_SIZE) * 100), [size]);

  const commit = async (requestedSize) => {
    if (busy) return;
    const previous = getRegionalFontSettings();
    const previousSize = readSize(previous);
    const previousOverride = hasOverride(previous);
    const next = withNavigationSize(previous, requestedSize == null ? null : clampSize(requestedSize));
    const nextSize = requestedSize == null ? DEFAULT_SIZE : clampSize(requestedSize);

    setBusy(true);
    setError('');
    setSize(nextSize);
    setOverridden(requestedSize != null);
    applyRegionalFontSettings(next, {
      persist: false,
      source: 'account-navigation-font-size-preview',
    });

    const result = await saveRegionalFontSettings(next);
    if (!result?.ok) {
      applyRegionalFontSettings(previous, {
        source: 'account-navigation-font-size-rollback',
      });
      setSize(previousSize);
      setOverridden(previousOverride);
      setError(vi ? 'Không thể lưu cỡ chữ.' : 'Could not save text size.');
      setBusy(false);
      return;
    }

    const saved = result.settings || next;
    setSize(readSize(saved));
    setOverridden(hasOverride(saved));
    setBusy(false);
  };

  if (!host) return null;

  return createPortal(
    <div
      className="brian-nav__font-size-control"
      data-account-text-size-control="true"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="brian-nav__font-size-step"
        aria-label={vi ? 'Giảm cỡ chữ thanh điều hướng' : 'Decrease navigation text size'}
        title={vi ? 'Giảm cỡ chữ' : 'Decrease text size'}
        disabled={busy || size <= MIN_SIZE}
        onClick={() => commit(size - 1)}
      >−</button>

      <output className="brian-nav__font-size-value" aria-live="polite">
        <strong>{percent}%</strong>
        <small>{size}px</small>
      </output>

      <button
        type="button"
        className="brian-nav__font-size-step"
        aria-label={vi ? 'Tăng cỡ chữ thanh điều hướng' : 'Increase navigation text size'}
        title={vi ? 'Tăng cỡ chữ' : 'Increase text size'}
        disabled={busy || size >= MAX_SIZE}
        onClick={() => commit(size + 1)}
      >+</button>

      <button
        type="button"
        className="brian-nav__font-size-reset"
        disabled={busy || !overridden}
        onClick={() => commit(null)}
      >{busy ? '…' : (vi ? 'Đặt lại' : 'Reset')}</button>

      {error ? <span className="brian-nav__font-size-error" role="status">{error}</span> : null}
    </div>,
    host,
  );
}
