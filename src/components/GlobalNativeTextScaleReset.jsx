import { useEffect } from 'react';
import './GlobalNativeTextScaleReset.css';

const APPEARANCE_KEY = 'bes-appearance-v2';
const RETIRED_KEYS = [
  'bes-font-scale',
  'bes-text-scale',
  'bet-font-scale',
  'bet-text-scale',
  'burs-font-scale',
  'bes-display-density',
];

function clearLegacyStorage() {
  try {
    RETIRED_KEYS.forEach((key) => window.localStorage.removeItem(key));

    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return;
    const current = JSON.parse(raw);
    if (!current || typeof current !== 'object' || Array.isArray(current)) return;

    const next = { ...current };
    delete next.textScale;
    delete next.projector;
    delete next.density;
    delete next.contentWidth;
    delete next.touchTargets;
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
  } catch {
    /* local storage is optional */
  }
}

export default function GlobalNativeTextScaleReset() {
  useEffect(() => {
    clearLegacyStorage();
  }, []);

  return null;
}
