import { useEffect } from 'react';
import './GlobalNativeTextScaleReset.css';

const APPEARANCE_KEY = 'bes-appearance-v2';
const RETIRED_KEYS = [
  'bes-font-scale',
  'bes-text-scale',
  'bet-font-scale',
  'bet-text-scale',
  'burs-font-scale',
];

function sanitizeStoredAppearance() {
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return;
    const current = JSON.parse(raw);
    if (!current || typeof current !== 'object' || Array.isArray(current)) return;
    const next = { ...current, textScale: 100, projector: false };
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
  } catch {
    /* local storage is optional */
  }
}

function restoreNativeTextSize() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.fontSize = '100%';
  root.style.setProperty('--bes-text-scale', '1');
  root.removeAttribute('data-font-scale');
  root.removeAttribute('data-bes-comfort-display');
  root.dataset.besProjector = 'false';
}

function clearRetiredStorage() {
  try {
    RETIRED_KEYS.forEach((key) => window.localStorage.removeItem(key));
    sanitizeStoredAppearance();
  } catch {
    /* local storage is optional */
  }
}

export default function GlobalNativeTextScaleReset() {
  useEffect(() => {
    let syncing = false;

    const enforce = () => {
      clearRetiredStorage();
      restoreNativeTextSize();
    };

    const onFontScale = () => enforce();
    const onAppearance = (event) => {
      enforce();
      const state = event?.detail?.state;
      if (syncing || (!state?.projector && Number(state?.textScale || 100) === 100)) return;
      if (window.BESAppearance?.setState) {
        syncing = true;
        try { window.BESAppearance.setState({ textScale: 100, projector: false }); }
        finally { window.setTimeout(() => { syncing = false; }, 0); }
      }
    };
    const onStorage = (event) => {
      if (RETIRED_KEYS.includes(event.key) || event.key === APPEARANCE_KEY) enforce();
    };

    enforce();
    window.addEventListener('bes:font-scale-changed', onFontScale);
    window.addEventListener('bes:appearance-changed', onAppearance);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('bes:font-scale-changed', onFontScale);
      window.removeEventListener('bes:appearance-changed', onAppearance);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
